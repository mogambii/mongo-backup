# MongoDB Backup Manager

A complete backup solution for MongoDB with automated daily backups, a web UI for managing backups, and automatic retention of the last 5 days of backups.

## Features

- ✅ **User Authentication** - Password-protected login
- ✅ **Automated Daily Backups** - Scheduled backups using `mongodump`
- ✅ **Web UI** - Download backups and manage them from a browser
- ✅ **Automatic Cleanup** - Keeps only the last 5 days of backups
- ✅ **Manual Backups** - Create backups on-demand
- ✅ **Backup Status** - View last backup time, size, and count
- ✅ **Easy Download** - Download backups as compressed tar archives

## Prerequisites

- Node.js 14+ and npm
- MongoDB (local or remote)
- `mongodump` command-line tool (comes with MongoDB)

## Installation

1. **Clone or download this project**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create `.env` file** (copy from `.env.example`)
   ```bash
   cp .env.example .env
   ```

4. **Update `.env` with your MongoDB settings**
   ```env
   # MongoDB Connection
   MONGODB_URI=mongodb://localhost:27017
   
   # Backup scope: Leave empty for all databases, or specify database name
   DB_NAME=
   
   # Backup directory
   BACKUP_DIR=./backups
   
   # Scheduler (default: 2 AM daily)
   BACKUP_SCHEDULE=0 2 * * *
      # Authentication (change these in production!)
   APP_PASSWORD=admin123
   SESSION_SECRET=your-secret-key-change-this-in-production
      # Server port
   PORT=3000
   ```

## Configuration

### Environment Variables

- **MONGODB_URI** - MongoDB connection string (default: `mongodb://localhost:27017`)
- **DB_NAME** - Database name to backup (leave empty to backup **all databases**, or specify a database name)
- **BACKUP_DIR** - Directory to store backups (default: `./backups`)
- **MAX_BACKUPS** - Number of backups to keep (default: `5`)
- **BACKUP_SCHEDULE** - Cron expression for backup schedule (default: `0 2 * * *`)
- **APP_PASSWORD** - Password for logging into the web UI (default: `admin123`)
- **SESSION_SECRET** - Secret key for session management (should be changed in production)
- **PORT** - Server port (default: `3000`)

### Authentication

The backup manager is protected by a password-based login:

1. **Default credentials**: Password is `admin123` (set in `.env` via `APP_PASSWORD`)
2. **Sessions**: Login sessions last 24 hours
3. **Security**: Change `APP_PASSWORD` and `SESSION_SECRET` in production!

To change the login password, update your `.env` file:
```env
APP_PASSWORD=your-strong-password
```

For production deployments, use strong passwords and set `SESSION_SECRET` to a random string:
```bash
# Generate a random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Backup Scope

You can control what gets backed up using the `DB_NAME` environment variable:

**Backup All Databases** (recommended for full system backups)
```env
DB_NAME=
```
This will backup every database in your MongoDB instance.

**Backup Single Database** (when you only need specific database)
```env
DB_NAME=myapp
```
This will backup only the `myapp` database.

Examples:
- `DB_NAME=` → Backs up all databases
- `DB_NAME=admin` → Backs up only the admin database
- `DB_NAME=users` → Backs up only the users database

### Cron Schedule Format

The `BACKUP_SCHEDULE` uses standard cron format: `second minute hour day month weekday`

Examples:
- `0 2 * * *` - Every day at 2:00 AM (default)
- `0 0 * * *` - Every day at midnight
- `0 12 * * *` - Every day at noon
- `0 0 * * 0` - Every Sunday at midnight
- `0 */4 * * *` - Every 4 hours

## Usage

### Start the Server

```bash
npm start
```

The server will be available at `http://localhost:3000`

### Web Interface

1. **Login** - Enter the password (default: `admin123`)
2. **Backup Status** - View last backup time, size, and total count
3. **Create Backup Now** - Manually trigger a backup
4. **Refresh** - Reload backup list
5. **Download** - Download any backup as a compressed tar file
6. **Delete** - Remove a backup (with confirmation)
7. **Logout** - Exit your session

### API Endpoints

- `GET /api/backups` - List all backups
- `POST /api/backups/create` - Create a new backup
- `GET /api/backups/download/:filename` - Download a backup
- `GET /api/status` - Get backup status
- `GET /api/health` - Health check

## Backup Structure

Backups are stored in the directory specified by `BACKUP_DIR` with the following structure:

```
backups/
├── backup-2024-06-05T02-00-00/
│   ├── admin/
│   │   ├── collection.bson
│   │   └── collection.metadata.json
│   └── ...
├── backup-2024-06-04T02-00-00/
│   └── ...
└── ...
```

When downloaded, backups are compressed as `backup-YYYY-MM-DDTHH-MM-SS.tar.gz`

## Restore a Backup

To restore a backup:

1. **Download the backup** from the web UI
2. **Extract the archive**
   ```bash
   tar -xzf backup-2024-06-05T02-00-00.tar.gz
   ```
3. **Restore using mongorestore**
   ```bash
   mongorestore --uri="mongodb://localhost:27017" ./backup-2024-06-05T02-00-00
   ```

Or restore directly without downloading:

```bash
mongorestore --uri="mongodb://localhost:27017" ./backups/backup-2024-06-05T02-00-00
```

## Troubleshooting

### mongodump not found

Make sure MongoDB tools are installed and in your PATH. On Linux/Mac:
```bash
# Install MongoDB Community Edition which includes mongodump
# Or install just the tools package
brew install mongodb-community  # macOS
```

### Permission denied errors

Ensure the backup directory has write permissions:
```bash
mkdir -p backups
chmod 755 backups
```

### Connection refused

Check your MongoDB connection string in `.env`:
- Local MongoDB: `mongodb://localhost:27017`
- Remote MongoDB: `mongodb://user:password@host:27017`
- MongoDB Atlas: `mongodb+srv://user:password@cluster.mongodb.net`

### Backups not being created

Check the application logs for errors. Make sure:
1. MongoDB is running and accessible
2. `mongodump` is installed
3. Backup directory exists and is writable
4. `.env` file is properly configured

## Project Structure

```
mongo-backup/
├── server.js                 # Express server
├── package.json             # Dependencies
├── .env.example             # Environment template
├── .env                     # Configuration (create this)
├── src/
│   ├── backupManager.js     # Backup logic
│   └── scheduleManager.js   # Cron scheduler
├── public/
│   ├── index.html           # Web UI
│   ├── style.css            # Styles
│   └── app.js               # Frontend logic
└── backups/                 # Backup storage (created on first run)
```

## Performance Considerations

- **Backup Size** - Larger databases take longer to backup and require more storage
- **Scheduled Time** - Choose a time when your database has low activity
- **Storage** - Ensure you have enough disk space for 5 days of backups
- **Network** - For remote MongoDB, network speed affects backup duration

## Security Notes

- **Change default password** - Always change `APP_PASSWORD` from the default `admin123`
- **Use strong passwords** - In production, use passwords that are at least 12 characters
- **Change session secret** - Set `SESSION_SECRET` to a random value in production
- **HTTPS in production** - Use HTTPS to encrypt login credentials in transit
- **Store `.env` securely** - Never commit `.env` to version control
- **Use authentication in MongoDB** - Include credentials in your `MONGODB_URI` for production
- **Restrict network access** - Use firewall rules or reverse proxy to limit access
- **Rotate credentials** - Periodically change passwords and session secrets
- **Run as non-root** - Don't run the application as root/administrator
- **Encrypt backups** - Consider encrypting backups if they contain sensitive data

## License

ISC

## Support

For issues or questions, check the MongoDB documentation or troubleshooting section above.
