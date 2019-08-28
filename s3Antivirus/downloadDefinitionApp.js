/**
 * Lambda function handler that will update the definitions stored in S3.
 */

const { execSync } = require("child_process");
const {
    uploadAVDefinitions,
    updateAVDefinitonsWithFreshclam
} = require("./clamav/clamav");
const { cleanupFolder, generateSystemMessage } = require("./utils/utils");

/**
 * This function will do the following
 * 0. Cleanup the folder beforehand to make sure there's enough space.
 * 1. Download the S3 definitions from the S3 bucket.
 * 2. Invoke freshclam to download the newest definitions
 * 3. Cleanup the folders
 * 4. Upload the newest definitions to the existing bucket.
 *
 * @param event Event fired to invoke the new update function.
 * @param context
 */
const lambdaHandleEvent = async (event, context) => {
    generateSystemMessage(`AV definition update start time: ${new Date()}`);

    await cleanupFolder("/tmp/");

    await updateAVDefinitonsWithFreshclam();

    const result = execSync(`ls -l /tmp/`);

    generateSystemMessage("Folder content after freshclam ");
    console.log(result.toString());
    await uploadAVDefinitions();

    generateSystemMessage(`AV definition update end time: ${new Date()}`);
};

// Export for AWS Lambda
module.exports = {
    lambdaHandleEvent
};
