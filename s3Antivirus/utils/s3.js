/**
 * Lambda function that will be perform the scan and tag the file accordingly.
 */

const AWS = require("aws-sdk");
const path = require("path");
const fs = require("fs");
const { generateSystemMessage } = require("./utils");
const constants = require("../constants");

// Set AWS Region from env
const awsRegion = process.env.AWS_REGION;
console.log("AWS Region: ", awsRegion);
AWS.config.update({
    region: awsRegion
});

const S3 = new AWS.S3({ apiVersion: "2006-03-01" });

/**
 * Retrieve the file size of S3 object without downloading.
 * @param {string} key    Key of S3 object
 * @param {string} bucket Bucket of S3 Object
 * @return {int} Length of S3 object in bytes.
 */
const sizeOf = async (key, bucket) => {
    const res = await S3.headObject({ Key: key, Bucket: bucket }).promise();
    return res.ContentLength;
};

/**
 * Check if S3 object is larger then the MAX_FILE_SIZE set.
 * @param {string} s3ObjectKey       Key of S3 Object
 * @param {string} s3ObjectBucket   Bucket of S3 object
 * @return {boolean} True if S3 object is larger then MAX_FILE_SIZE
 */
const isS3FileTooBig = async (s3ObjectKey, s3ObjectBucket) => {
    const fileSize = await sizeOf(s3ObjectKey, s3ObjectBucket);
    return fileSize > constants.MAX_FILE_SIZE;
};

/**
 * downloadFileFromS3
 * @param {String} s3ObjectKey
 * @param {String} s3ObjectBucket
 */
const downloadFileFromS3 = async (s3ObjectKey, s3ObjectBucket) => {
    const downloadDir = `/tmp/download`;
    if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir);
    }
    let localPath = `${downloadDir}/${path.basename(s3ObjectKey)}`;

    let writeStream = fs.createWriteStream(localPath);

    generateSystemMessage(
        `Downloading file S3://${s3ObjectBucket}/${s3ObjectKey}`
    );

    let getOptions = {
        Bucket: s3ObjectBucket,
        Key: s3ObjectKey
    };

    return new Promise((resolve, reject) => {
        S3.getObject(getOptions)
            .createReadStream()
            .on("end", function() {
                generateSystemMessage(
                    `Finished downloading new object ${s3ObjectKey}`
                );
                resolve();
            })
            .on("error", function(err) {
                console.log(err);
                reject();
            })
            .pipe(writeStream);
    });
};

/**
 * taggingObjectInS3
 * @async
 * @param {String} bucketName
 * @param {String} objectKey
 * @param {String} tag
 */
const taggingObjectInS3 = async (bucketName, objectKey, tag) => {
    var taggingParams = {
        Bucket: bucketName,
        Key: objectKey,
        Tagging: tag
    };

    return S3.putObjectTagging(taggingParams).promise();
};

/**
 * putObjectToS3
 * @async
 * @param {String} bucketName
 * @param {String} objectKey
 * @param {String} body
 */
const putObjectToS3 = async (bucketName, objectKey, body, options = {}) => {
    let putOptions = {
        Bucket: bucketName,
        Key: objectKey,
        Body: body,
        ...(Object.keys(options).length === 0 && options.constructor === Object
            ? {}
            : options)
    };

    return S3.putObject(putOptions).promise();
};

/**
 * getObjectStreamFromS3
 * @param {String} bucketName
 * @param {String} objectKey
 */
const getObjectStreamFromS3 = (bucketName, objectKey) => {
    const getOptions = {
        Bucket: bucketName,
        Key: objectKey
    };

    return S3.getObject(getOptions);
};

/**
 * moveObjectInS3
 * @param {String} sourceBucket
 * @param {String} sourceKey
 * @param {String} destinationBucket
 * @param {String} destinationKey
 */
const moveObjectInS3 = async (
    sourceBucket,
    sourceKey,
    destinationBucket,
    destinationKey
) => {
    // 1. Copy file from source to destination folder
    const copyObjectParams = {
        Bucket: destinationBucket,
        CopySource: `${sourceBucket}/${sourceKey}`,
        Key: destinationKey
    };
    const copyResult = await S3.copyObject(copyObjectParams).promise();

    // 2. Remove file from source folder
    const deleteObjectParams = {
        Bucket: sourceBucket,
        Key: sourceKey
    };

    const deleteResult = await S3.deleteObject(deleteObjectParams).promise();

    return `${copyResult}\n${deleteResult}`;
};

/**
 * getObjectTaggingFromS3
 * @param {String} bucketName
 * @param {String} objectKey
 */
const getObjectTaggingFromS3 = async (bucketName, objectKey) => {
    const params = {
        Bucket: bucketName,
        Key: objectKey
    };
    return S3.getObjectTagging(params).promise();
};

module.exports = {
    downloadFileFromS3,
    isS3FileTooBig,
    getObjectStreamFromS3,
    getObjectTaggingFromS3,
    moveObjectInS3,
    putObjectToS3,
    taggingObjectInS3
};
