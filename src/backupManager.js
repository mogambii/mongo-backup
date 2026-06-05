import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class BackupManager {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || path.join(__dirname, '../backups');
    this.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    // If DB_NAME is not provided, backup all databases
    this.dbName = process.env.DB_NAME || null;
    this.maxBackups = parseInt(process.env.MAX_BACKUPS || '5');
    
    this.ensureBackupDir();
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`Created backup directory: ${this.backupDir}`);
    }
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
    const backupName = `backup-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupName);

    try {
      // Create mongodump command
      const mongoUri = this.mongoUri.startsWith('mongodb') 
        ? this.mongoUri 
        : `mongodb://${this.mongoUri}`;
      
      // Build the mongodump command
      let dumpCommand = `mongodump --uri="${mongoUri}" --out="${backupPath}"`;
      
      // If DB_NAME is specified, backup only that database
      // If not specified, backup all databases
      if (this.dbName && this.dbName !== 'admin') {
        dumpCommand += ` --db="${this.dbName}"`;
        console.log(`Starting backup of database '${this.dbName}': ${backupName}`);
      } else {
        console.log(`Starting full backup (all databases): ${backupName}`);
      }
      
      await execAsync(dumpCommand);
      
      console.log(`Backup completed successfully: ${backupName}`);
      
      // Cleanup old backups
      await this.cleanupOldBackups();
      
      return {
        success: true,
        backup: backupName,
        path: backupPath,
        timestamp: new Date(timestamp.replace(/-/g, ':')),
        scope: this.dbName && this.dbName !== 'admin' ? `database: ${this.dbName}` : 'all databases'
      };
    } catch (error) {
      console.error(`Backup failed: ${error.message}`);
      // Cleanup partial backup
      if (fs.existsSync(backupPath)) {
        fs.rmSync(backupPath, { recursive: true });
      }
      throw error;
    }
  }

  async listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backups = files
        .filter(file => {
          // Exclude tar.gz files and any files not starting with backup-
          if (!file.startsWith('backup-')) {
            return false;
          }
          if (file.includes('.tar.gz') || file.endsWith('.tar.gz')) {
            return false;
          }
          
          const fullPath = path.join(this.backupDir, file);
          try {
            const stats = fs.statSync(fullPath);
            return stats.isDirectory();
          } catch {
            return false;
          }
        })
        .map(file => {
          const fullPath = path.join(this.backupDir, file);
          const stats = fs.statSync(fullPath);
          return {
            name: file,
            size: this.formatBytes(this.getDirectorySize(fullPath)),
            sizeBytes: this.getDirectorySize(fullPath),
            created: stats.birthtime,
            createdFormatted: stats.birthtime.toISOString()
          };
        })
        .sort((a, b) => new Date(b.created) - new Date(a.created));

      return backups;
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }

  async getBackupPath(filename) {
    const fullPath = path.join(this.backupDir, filename);
    
    // Prevent directory traversal attacks
    const resolved = path.resolve(fullPath);
    const backupDirResolved = path.resolve(this.backupDir);
    
    if (!resolved.startsWith(backupDirResolved)) {
      throw new Error('Invalid backup path');
    }

    if (!fs.existsSync(resolved)) {
      throw new Error('Backup not found');
    }

    // Create tar archive for download
    const tarPath = `${resolved}.tar.gz`;
    if (!fs.existsSync(tarPath)) {
      try {
        await execAsync(`tar -czf "${tarPath}" -C "${this.backupDir}" "${filename}"`);
      } catch (error) {
        console.error('Error creating tar archive:', error);
        throw error;
      }
    }

    return tarPath;
  }

  async deleteBackup(filename) {
    const fullPath = path.join(this.backupDir, filename);
    
    // Prevent directory traversal attacks
    const resolved = path.resolve(fullPath);
    const backupDirResolved = path.resolve(this.backupDir);
    
    if (!resolved.startsWith(backupDirResolved)) {
      throw new Error('Invalid backup path');
    }

    if (!fs.existsSync(resolved)) {
      throw new Error('Backup not found');
    }

    try {
      // Remove the backup directory
      fs.rmSync(resolved, { recursive: true });
      console.log(`Deleted backup: ${filename}`);

      // Remove tar archive if it exists
      const tarPath = `${resolved}.tar.gz`;
      if (fs.existsSync(tarPath)) {
        fs.unlinkSync(tarPath);
        console.log(`Deleted tar archive: ${tarPath}`);
      }

      return { success: true, message: `Backup ${filename} deleted` };
    } catch (error) {
      console.error(`Error deleting backup ${filename}:`, error);
      throw error;
    }
  }

  async cleanupOldBackups() {
    try {
      const backups = await this.listBackups();
      
      if (backups.length > this.maxBackups) {
        const toDelete = backups.slice(this.maxBackups);
        
        for (const backup of toDelete) {
          const backupPath = path.join(this.backupDir, backup.name);
          const tarPath = `${backupPath}.tar.gz`;
          
          // Remove directory
          if (fs.existsSync(backupPath)) {
            fs.rmSync(backupPath, { recursive: true });
            console.log(`Deleted old backup: ${backup.name}`);
          }
          
          // Remove tar archive if exists
          if (fs.existsSync(tarPath)) {
            fs.unlinkSync(tarPath);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up backups:', error);
    }
  }

  getDirectorySize(dirPath) {
    let size = 0;
    
    if (!fs.existsSync(dirPath)) {
      return 0;
    }

    try {
      const stats = fs.statSync(dirPath);
      // If it's a file, not a directory, return its size
      if (!stats.isDirectory()) {
        return stats.size;
      }

      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          size += this.getDirectorySize(fullPath);
        } else {
          size += stats.size;
        }
      }
    } catch (error) {
      console.error(`Error calculating size for ${dirPath}:`, error.message);
      return 0;
    }
    
    return size;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  async getStatus() {
    try {
      const backups = await this.listBackups();
      const lastBackup = backups[0];

      return {
        total: backups.length,
        maxRetained: this.maxBackups,
        lastBackup: lastBackup ? {
          name: lastBackup.name,
          created: lastBackup.createdFormatted,
          size: lastBackup.size
        } : null,
        backupDir: this.backupDir,
        mongoUri: this.mongoUri,
        backupScope: this.dbName ? `database: ${this.dbName}` : 'all databases'
      };
    } catch (error) {
      console.error('Error getting status:', error);
      return { error: 'Failed to get status' };
    }
  }
}
