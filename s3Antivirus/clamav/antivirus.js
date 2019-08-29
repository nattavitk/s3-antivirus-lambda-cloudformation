/**
 * Lambda function that will be perform the scan and tag the file accordingly.
 */

const AWS = require("aws-sdk");
const path = require("path");
const { downloadAVDefinitions, scanLocalFile } = require("./clamav");
const { generateSystemMessage, generateTagSet } = require("../utils/utils");
const constants = require("../constants");

// Set AWS Region from env
const awsRegion = process.env.AWS_REGION;
console.log("AWS Region: ", awsRegion);
AWS.config.update({
    region: awsRegion
});
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

const { downloadFileFromS3 } = require("../utils/s3");

/**
 * scanS3Object
 *
 * @param {String} s3ObjectKey
 * @param {String} s3ObjectBucket
 */
const scanS3Object = async (s3ObjectKey, s3ObjectBucket) => {
    await downloadAVDefinitions(
        constants.CLAMAV_BUCKET_NAME,
        constants.PATH_TO_AV_DEFINITIONS
    );

    await downloadFileFromS3(s3ObjectKey, s3ObjectBucket);

    const virusScanStatus = scanLocalFile(path.basename(s3ObjectKey));

    var taggingParams = {
        Bucket: s3ObjectBucket,
        Key: s3ObjectKey,
        Tagging: generateTagSet(virusScanStatus)
    };

    try {
        const uploadResult = await s3.putObjectTagging(taggingParams).promise();
        generateSystemMessage("Tagging successful");
    } catch (err) {
        console.log(err);
    } finally {
        return virusScanStatus;
    }
};

module.exports = {
    scanS3Object
};
