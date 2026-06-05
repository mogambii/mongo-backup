import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { BackupManager } from './src/backupManager.js';
import { ScheduleManager } from './src/scheduleManager.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Initialize backup and schedule managers
const backupManager = new BackupManager();
const scheduleManager = new ScheduleManager(backupManager);

// Session configuration
const sessionSecret = process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production';
const appPassword = process.env.APP_PASSWORD || 'admin123';

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { 
    secure: false, // Set to true if using HTTPS in production
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Middleware
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Login route
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  if (password === appPassword) {
    req.session.authenticated = true;
    res.json({ success: true, message: 'Logged in successfully' });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Logout route
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Check auth status
app.get('/api/auth/status', (req, res) => {
  res.json({ authenticated: req.session && req.session.authenticated });
});

// API Routes (protected)

// Get list of available backups
app.get('/api/backups', requireAuth, async (req, res) => {
  try {
    const backups = await backupManager.listBackups();
    res.json(backups);
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

// Download a backup
app.get('/api/backups/download/:filename', requireAuth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = await backupManager.getBackupPath(filename);
    res.download(filepath);
  } catch (error) {
    console.error('Error downloading backup:', error);
    res.status(500).json({ error: 'Failed to download backup' });
  }
});

// Create backup manually
app.post('/api/backups/create', requireAuth, async (req, res) => {
  try {
    const result = await backupManager.createBackup();
    res.json(result);
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Delete a backup
app.delete('/api/backups/:filename', requireAuth, async (req, res) => {
  try {
    const { filename } = req.params;
    await backupManager.deleteBackup(filename);
    res.json({ success: true, message: `Backup ${filename} deleted` });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ error: 'Failed to delete backup' });
  }
});

// Get backup status
app.get('/api/status', requireAuth, async (req, res) => {
  try {
    const status = await backupManager.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve login page
app.get('/login', (req, res) => {
  if (req.session && req.session.authenticated) {
    res.redirect('/');
  } else {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
});

// Serve the main dashboard page (protected)
app.get('/', (req, res) => {
  if (req.session && req.session.authenticated) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.redirect('/login');
  }
});

// Start server
app.listen(port, () => {
  console.log(`MongoDB Backup Manager running on http://localhost:${port}`);
  console.log(`MongoDB URI: ${process.env.MONGODB_URI}`);
  console.log(`Backup directory: ${process.env.BACKUP_DIR}`);
  
  // Start the scheduler
  scheduleManager.start();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  scheduleManager.stop();
  process.exit(0);
});
