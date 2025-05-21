/**
 * Lambda function that will be perform the scan and tag the file accordingly.
 */

const { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectTaggingCommand, PutObjectCommand, CopyObjectCommand, DeleteObjectCommand, GetObjectTaggingCommand } = require("@aws-sdk/client-s3");
const path = require("path");
const fs = require("fs");
const { generateSystemMessage } = require("./utils");
const constants = require("../constants");

// Set AWS Region from env
const awsRegion = process.env.AWS_REGION;
console.log("AWS Region: ", awsRegion);

const s3Client = new S3Client({ region: process.env.AWS_REGION });

/**
 * Retrieve the file size of S3 object without downloading.
 * @param {string} key    Key of S3 object
 * @param {string} bucket Bucket of S3 Object
 * @return {int} Length of S3 object in bytes.
 */
const sizeOf = async (key, bucket) => {
    const res = await s3Client.send(new HeadObjectCommand({ Key: key, Bucket: bucket }));
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

    return new Promise(async (resolve, reject) => {
        try {
            const response = await s3Client.send(new GetObjectCommand(getOptions));
            response.Body.on("end", function() {
                generateSystemMessage(
                    `Finished downloading new object ${s3ObjectKey}`
                );
                resolve();
            })
            .on("error", function(err) {
                console.log(err);
                reject(err); // Pass the error to the reject function
            })
            .pipe(writeStream);
        } catch (err) {
            console.log(err);
            reject(err);
        }
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

    return s3Client.send(new PutObjectTaggingCommand(taggingParams));
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

    return s3Client.send(new PutObjectCommand(putOptions));
};

/**
 * getObjectStreamFromS3
 * @param {String} bucketName
 * @param {String} objectKey
 */
const getObjectStreamFromS3 = async (bucketName, objectKey) => {
    const getOptions = {
        Bucket: bucketName,
        Key: objectKey
    };
    const response = await s3Client.send(new GetObjectCommand(getOptions));
    return response.Body; // This is a readable stream
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
    const copyResult = await s3Client.send(new CopyObjectCommand(copyObjectParams));

    // 2. Remove file from source folder
    const deleteObjectParams = {
        Bucket: sourceBucket,
        Key: sourceKey
    };

    const deleteResult = await s3Client.send(new DeleteObjectCommand(deleteObjectParams));

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
    return s3Client.send(new GetObjectTaggingCommand(params));
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
