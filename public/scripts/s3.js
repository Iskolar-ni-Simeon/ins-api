const AWS = require('aws-sdk');
const fs = require('fs');
require('dotenv').config();

class S3 {
    constructor() {
        this.bucketName = process.env.BUCKET_NAME;
        this.AWS = AWS.config.update({
            region: process.env.S3_REGION,
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_ACCESS_KEY_SECRET
        })
        this.s3Client = new AWS.S3();
        console.log("S3 initialized.")
        
    }
    /**
     * Uploads the file to the S3 defined by the .env file.
     * @param {Object} params - parameters for the function.
     * @param {Buffer | Uint8Array | Blob | string} params.fileContent - file data
     * @param {string} params.key - unique version 4 UUID for the file name.
     */
    uploadFile(params) {
        const { fileContent, key } = params
        const uploadParams = {
            Bucket: this.bucketName,
            Key: `${key}.pdf`,
            Body: fileContent,
            ContentType: 'application/pdf'
        }
        try {
            this.s3Client.putObject(uploadParams);
            console.log(`Upload of file: ${key}.pdf successful`);
        } catch (err) {
            console.error("Error: ", err);
            throw err;
        }
    }
    /**
     * Generates a pre-signed link for the user to access, to be expired in 3600 seconds (1 hour.)
     * @param {Object} params - parameters for the function.
     * @param {string} params.key - unique version 4 UUID to access the file.
     * @param {number} params.expiresIn - expiration time for the pre-signed URL. Default: 3600 seconds or 1 hour.
     * @returns {string} - the pre-signed URL that the user can access.
     */
    getAccessLink(params) {
        const { key, expiresIn } = params
        const getFileParams = {
            Bucket: this.bucketName,
            Key: `${key}.pdf`,
            Expires: expiresIn
        };
        try {
            const url = this.s3Client.getSignedUrl('getObject', getFileParams)
            console.log(`URL for file: ${key} is created. URL: ${url}`);
            return url;
        } catch (err) {
            console.error('Error: ', err)
        }
    }

    /**
     * Deletes the file determined by params.uuid, the name of the file.
     * @param {string} uuid - unique version 4 UUID to access the file.
     */
    deleteFile(uuid) {
        const deleteFileParams = {
            Bucket: this.bucketName,
            Key: `${uuid}.pdf`
        }
        this.s3Client.deleteObject(deleteFileParams, (err, data) => {
            if (err) {
                console.error(`Error deleting object: ${err}`)
            } else {
                console.log(`Successfully deleted object: ${data}`);
            }
        })
    }
}

