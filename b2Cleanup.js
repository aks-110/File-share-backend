const B2 = require('backblaze-b2');
const cron = require('node-cron');

// Initialize Backblaze B2 credentials
// Make sure to store these in your .env file
const b2 = new B2({
    applicationKeyId: process.env.B2_APP_KEY_ID, 
    applicationKey: process.env.B2_APP_KEY 
});

const BUCKET_ID = process.env.B2_BUCKET_ID;
const HOURS_UNTIL_DELETION = 24;

async function deleteOldFiles() {
    try {
        console.log('Starting Backblaze B2 cleanup process...');
        
        // 1. Authorize with Backblaze
        await b2.authorize();

        // 2. Fetch the list of files in your bucket
        const response = await b2.listFileNames({
            bucketId: BUCKET_ID,
            maxFileCount: 1000 // Adjust if you have more than 1000 files
        });

        const files = response.data.files;
        const now = Date.now();

        // 3. Loop through files and check their age
        for (const file of files) {
            // Backblaze uploadTimestamp is in milliseconds
            const fileAgeInMs = now - file.uploadTimestamp;
            const fileAgeInHours = fileAgeInMs / (1000 * 60 * 60);

            if (fileAgeInHours >= HOURS_UNTIL_DELETION) {
                console.log(`Deleting file: ${file.fileName} (Age: ${fileAgeInHours.toFixed(2)} hours)`);
                
                // 4. Delete the file using its specific ID and Name
                await b2.deleteFileVersion({
                    fileId: file.fileId,
                    fileName: file.fileName
                });
                console.log(`Successfully deleted: ${file.fileName}`);
            }
        }
        
        console.log('Cleanup process finished successfully.');

    } catch (error) {
        console.error('Error during Backblaze cleanup:', error);
    }
}

// 5. Schedule the Cron Job
// This cron expression '0 * * * *' means "Run at minute 0 past every hour"
cron.schedule('0 * * * *', () => {
    deleteOldFiles();
});

module.exports = { deleteOldFiles };