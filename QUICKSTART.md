# Quick Start Guide

## Get Started in 3 Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure MongoDB and Authentication
Create a `.env` file in the project root:

```env
MONGODB_URI=mongodb://localhost:27017
DB_NAME=
BACKUP_DIR=./backups
MAX_BACKUPS=5
BACKUP_SCHEDULE=0 2 * * *
APP_PASSWORD=admin123
SESSION_SECRET=your-secret-key-change-this
PORT=3000
```

**Note:** 
- Leave `DB_NAME` empty to backup **all databases**, or specify a database name to backup only that database
- Change `APP_PASSWORD` to a strong password (this is your login password)
- Change `SESSION_SECRET` to a random string in production



### 3. Start the Server
```bash
npm start
```

Then open your browser to **http://localhost:3000**

---

## What You Get

✅ **Web Dashboard** showing backup status  
✅ **One-Click Backups** - Create backups whenever you want  
✅ **Automatic Daily Backups** - Scheduled at 2 AM (configurable)  
✅ **Download Backups** - Get compressed tar archives  
✅ **Auto Cleanup** - Keeps only the last 5 days  

---

## Common Configurations

### Local MongoDB (default)
```env
MONGODB_URI=mongodb://localhost:27017
```

### MongoDB with Authentication
```env
MONGODB_URI=mongodb://username:password@localhost:27017
```

### MongoDB Atlas
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net
DB_NAME=yourdbname
```

### Backup Schedule Examples
```env
# Every day at 2 AM (default)
BACKUP_SCHEDULE=0 2 * * *

# Every day at midnight
BACKUP_SCHEDULE=0 0 * * *

# Every 6 hours
BACKUP_SCHEDULE=0 */6 * * *

# Every Monday at 1 AM
BACKUP_SCHEDULE=0 1 * * 1
```

---

## Restore a Backup

```bash
# Extract the backup
tar -xzf backup-YYYY-MM-DDTHH-MM-SS.tar.gz

# Restore to MongoDB
mongorestore --uri="mongodb://localhost:27017" ./backup-YYYY-MM-DDTHH-MM-SS
```

---

## Next Steps

- Read [README.md](README.md) for detailed documentation
- Check the logs for backup status
- Set up a cron job or systemd service for persistent operation

Enjoy automated backups! 🚀
