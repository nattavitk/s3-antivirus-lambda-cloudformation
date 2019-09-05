const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");
const constants = require("../constants");
const { generateSystemMessage } = require("../utils/utils");
const { getObjectStreamFromS3, putObjectToS3 } = require("../utils/s3");

/**
 * Updates the definitions using freshclam.
 *
 * It will download the definitions to the current work dir.
 * @returns {Boolean}
 */
const updateAVDefinitionsWithFreshclam = () => {
    try {
        const executionResult = execSync(
            `${constants.PATH_TO_FRESHCLAM} --config-file=${constants.FRESHCLAM_CONFIG} --datadir=${constants.FRESHCLAM_WORK_DIR}`
        );

        generateSystemMessage("Update message");
        console.log(executionResult.toString());

        if (executionResult.stderr) {
            generateSystemMessage("stderr");
            console.log(executionResult.stderr.toString());
        }

        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
};

/**
 * Download the Antivirus definition from S3.
 * The definitions are stored on the local disk, ensure there's enough space.
 *
 * @async
 * @returns {Promise} result of S3 GetObject
 */
const downloadAVDefinitions = async () => {
    const downloadPromises = constants.CLAMAV_DEFINITIONS_FILES.map(
        filenameToDownload => {
            return new Promise((resolve, reject) => {
                const destinationFile = path.join("/tmp/", filenameToDownload);

                generateSystemMessage(
                    `Downloading ${filenameToDownload} from S3 to ${destinationFile}`
                );

                const localFileWriteStream = fs.createWriteStream(
                    destinationFile
                );

                const getS3ObjectStream = getObjectStreamFromS3(
                    constants.CLAMAV_BUCKET_NAME,
                    `${constants.PATH_TO_AV_DEFINITIONS}/${filenameToDownload}`
                );

                const s3ReadStream = getS3ObjectStream
                    .createReadStream()
                    .on("end", () => {
                        generateSystemMessage(
                            `Finished download ${filenameToDownload}`
                        );
                        resolve();
                    })
                    .on("error", err => {
                        generateSystemMessage(
                            `Error downloading definition file ${filenameToDownload}`
                        );
                        console.log(err);
                        reject();
                    });

                s3ReadStream.pipe(localFileWriteStream);
            });
        }
    );

    return await Promise.all(downloadPromises);
};

/**
 * Uploads the AV definitions to the S3 bucket.
 *
 * @async
 * @returns {Promise} result of S3 putObject
 */
const uploadAVDefinitions = async () => {
    const uploadPromises = constants.CLAMAV_DEFINITIONS_FILES.map(
        async filenameToUpload => {
            try {
                generateSystemMessage(
                    `Uploading updated definitions for file ${filenameToUpload} ---`
                );

                const result = await putObjectToS3(
                    constants.CLAMAV_BUCKET_NAME,
                    `${constants.PATH_TO_AV_DEFINITIONS}/${filenameToUpload}`,
                    fs.createReadStream(path.join("/tmp/", filenameToUpload))
                );

                generateSystemMessage(
                    `--- Finished uploading ${filenameToUpload} ---`
                );

                return result;
            } catch (error) {
                generateSystemMessage(
                    `--- Error uploading ${filenameToUpload} ---`
                );
                console.log(error);
                throw new Error(error);
            }
        }
    );

    return await Promise.all(uploadPromises);
};

/**
 * Function to scan the given file. This function requires ClamAV and the definitions to be available.
 * This function does not download the file so the file should also be accessible.
 *
 * Three possible case can happen:
 * - The file is clean, the clamAV command returns 0 and the function return "CLEAN"
 * - The file is infected, the clamAV command returns 1 and this function will return "INFECTED"
 * - Any other error and the function will return null; (falsey)
 *
 * @param pathToFile Path in the filesystem where the file is stored.
 */
const scanLocalFile = pathToFile => {
    try {
        const result = execSync(
            `${constants.PATH_TO_CLAMAV} -v -a --stdout -d /tmp/ '/tmp/download/${pathToFile}'`
        );

        generateSystemMessage("SUCCESSFUL SCAN, FILE CLEAN");

        return constants.STATUS_CLEAN_FILE;
    } catch (err) {
        // Error status 1 means that the file is infected.
        if (err.status === 1) {
            generateSystemMessage("SUCCESSFUL SCAN, FILE INFECTED");
            return constants.STATUS_INFECTED_FILE;
        } else {
            generateSystemMessage("-- SCAN FAILED --");
            console.log(err);
            return constants.STATUS_ERROR_PROCESSING_FILE;
        }
    }
};

module.exports = {
    updateAVDefinitionsWithFreshclam,
    downloadAVDefinitions,
    uploadAVDefinitions,
    scanLocalFile
};
