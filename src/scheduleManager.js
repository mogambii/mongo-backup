import cron from 'node-cron';

export class ScheduleManager {
  constructor(backupManager) {
    this.backupManager = backupManager;
    this.tasks = [];
    this.scheduleTime = process.env.BACKUP_SCHEDULE || '0 2 * * *'; // Default: 2 AM daily
  }

  start() {
    try {
      // Create the scheduled task
      const task = cron.schedule(this.scheduleTime, async () => {
        console.log('Starting scheduled backup...');
        try {
          await this.backupManager.createBackup();
          console.log('Scheduled backup completed successfully');
        } catch (error) {
          console.error('Scheduled backup failed:', error);
        }
      });

      this.tasks.push(task);
      console.log(`Backup scheduler started. Schedule: ${this.scheduleTime}`);
    } catch (error) {
      console.error('Failed to start scheduler:', error);
    }
  }

  stop() {
    for (const task of this.tasks) {
      task.stop();
    }
    console.log('Scheduler stopped');
  }

  // Allows changing the schedule dynamically
  reschedule(cronExpression) {
    this.stop();
    this.scheduleTime = cronExpression;
    this.tasks = [];
    this.start();
  }

  // Get next execution time
  getNextExecutionTime() {
    // This would require additional parsing of cron expression
    // For now, return the cron expression
    return this.scheduleTime;
  }
}
