/**
 * Lambda function that will be perform the scan and tag the file accordingly.
 */

const AWS = require("aws-sdk");
const path = require("path");
const fs = require("fs");
const s3 = new AWS.S3();
const { generateSystemMessage } = require("./utils");
const constants = require("../constants");

/**
 * Retrieve the file size of S3 object without downloading.
 * @param {string} key    Key of S3 object
 * @param {string} bucket Bucket of S3 Object
 * @return {int} Length of S3 object in bytes.
 */
const sizeOf = async (key, bucket) => {
    const res = await s3.headObject({ Key: key, Bucket: bucket }).promise();
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

const downloadFileFromS3 = async (s3ObjectKey, s3ObjectBucket) => {
    const downloadDir = `/tmp/download`;
    if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir);
    }
    let localPath = `${downloadDir}/${path.basename(s3ObjectKey)}`;

    let writeStream = fs.createWriteStream(localPath);

    generateSystemMessage(
        `Downloading file s3://${s3ObjectBucket}/${s3ObjectKey}`
    );

    let options = {
        Bucket: s3ObjectBucket,
        Key: s3ObjectKey
    };

    return new Promise((resolve, reject) => {
        s3.getObject(options)
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

module.exports = {
    downloadFileFromS3,
    isS3FileTooBig
};
