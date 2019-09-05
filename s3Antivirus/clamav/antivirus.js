/**
 * Lambda function that will be perform the scan and tag the file accordingly.
 */

const path = require("path");
const fs = require("fs");
const { downloadAVDefinitions, scanLocalFile } = require("./clamav");
const {
    addDummyTagSet,
    generateSystemMessage,
    generateTagSet
} = require("../utils/utils");
const { getObjectTaggingFromS3, taggingObjectInS3 } = require("../utils/s3");
const constants = require("../constants");

const {
    downloadFileFromS3,
    moveObjectInS3,
    putObjectToS3
} = require("../utils/s3");

/**
 * scanS3Object
 *
 * @param {String} s3ObjectKey
 * @param {String} s3ObjectBucket
 */
const scanS3Object = async (s3ObjectKey, s3ObjectBucket) => {
    const pathNames = s3ObjectKey.split("/");
    const [rootFolderFromKey] = pathNames.slice(0);

    // Check if it is from `infected` folder. If yes, skip scanning
    if (rootFolderFromKey === constants.INFECTED_DIR_NAME) {
        generateSystemMessage(`The file is from infected folder, ignore`);
        return constants.STATUS_SKIPPED_FILE;
    }

    // Check if it is the dummy file. If yes, skip scanning
    const tagData = await getObjectTaggingFromS3(s3ObjectBucket, s3ObjectKey);
    if (tagData && tagData.TagSet && tagData.TagSet.length) {
        const fileTypeTag = tagData.TagSet.find(
            tag => tag.Key === constants.FILE_TYPE
        );

        if (fileTypeTag.Value === constants.DUMMY_PDF_REPLACEMENT) {
            generateSystemMessage(
                `The file is dummy file, skip scanning virus`
            );
            return constants.STATUS_SKIPPED_FILE;
        }
    }

    // Download file from s3
    await downloadFileFromS3(s3ObjectKey, s3ObjectBucket);

    // Download Virus Definition files
    await downloadAVDefinitions(
        constants.CLAMAV_BUCKET_NAME,
        constants.PATH_TO_AV_DEFINITIONS
    );

    const virusScanStatus = scanLocalFile(path.basename(s3ObjectKey));

    try {
        // Tag the result to file'
        const tagSetForScannedFile = generateTagSet(virusScanStatus);
        let uploadResult = await taggingObjectInS3(
            s3ObjectBucket,
            s3ObjectKey,
            tagSetForScannedFile
        );
        generateSystemMessage(`Tagging successful with result ${uploadResult}`);

        // If the scanner detected infection, move the file to `infected` folder
        if (virusScanStatus === constants.STATUS_INFECTED_FILE) {
            // get the filename from source key
            // const pathNames = s3ObjectKey.split("/");
            const [filename] = pathNames.slice(-1);
            const newS3ObjectKey = `${constants.INFECTED_DIR_NAME}/${filename}`;

            const moveResult = await moveObjectInS3(
                s3ObjectBucket, // source bucket
                s3ObjectKey, // source key
                s3ObjectBucket, // destination bucket
                newS3ObjectKey // destination key
            );
            generateSystemMessage(
                `Move the infected file successful with result ${moveResult}`
            );

            // Replace the source file with dummy PDF
            const putResult = await putObjectToS3(
                s3ObjectBucket,
                s3ObjectKey, // use the original key
                fs.createReadStream(
                    path.join(
                        constants.ASSET_PATH,
                        constants.DUMMY_PDF_FILE_NAME
                    )
                ),
                { ContentType: "application/pdf" }
            );
            generateSystemMessage(
                `Put the dummy file successful with result ${putResult}`
            );

            // Tag the dummy file with the same detail as original file
            uploadResult = await taggingObjectInS3(
                s3ObjectBucket,
                s3ObjectKey,
                addDummyTagSet(tagSetForScannedFile)
            );

            generateSystemMessage(
                `Tagging the dummy file successful with result ${uploadResult}`
            );
        }
    } catch (err) {
        console.log(err);
    } finally {
        return virusScanStatus;
    }
};

module.exports = {
    scanS3Object
};
