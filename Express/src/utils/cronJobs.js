const cron = require('node-cron');
const calendarSyncService = require('../services/calendarSync.service');

function initCronJobs() {
    cron.schedule('* * * * *', async () => {
        await calendarSyncService.runGlobalSync();
    });
}

module.exports = { initCronJobs };