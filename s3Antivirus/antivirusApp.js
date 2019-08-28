const {
    extractBucketFromS3Event,
    extractKeyFromS3Event
} = require("./utils/utils");
const { isS3FileTooBig } = require("./utils/s3");
const { scanS3Object } = require("./clamav/antivirus");
const constants = require("./constants");

const lambdaHandleEvent = async (event, context) => {
    const s3ObjectKey = extractKeyFromS3Event(event);
    const s3ObjectBucket = extractBucketFromS3Event(event);

    const virusScanStatus = (await isS3FileTooBig(s3ObjectKey, s3ObjectBucket))
        ? constants.STATUS_SKIPPED_FILE
        : await scanS3Object(s3ObjectKey, s3ObjectBucket);

    return virusScanStatus;
};

module.exports = {
    lambdaHandleEvent
};
