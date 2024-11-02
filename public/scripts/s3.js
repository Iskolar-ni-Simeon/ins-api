const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

class S3 {
    constructor() {
        this.s3Client = new S3Client(
            {
                region: process.env.S3_REGION,
                credentials: {
                    accessKeyId: process.env.S3_ACCESS_KEY_ID,
                    secretAccessKey: process.env.S3_ACCESS_KEY_SECRET
                }
            }
        );
        console.log("S3 initialized.")
        this.bucketName = process.env.BUCKET_NAME;
    }
    /**
     * Uploads the file to the S3 defined by the .env file.
     * @param {Object} params - parameters for the function.
     * @param {Buffer | Uint8Array | Blob | string} params.fileContent - file data
     * @param {string} params.key - unique version 4 UUID for the file name.
     */
    async uploadFile(params) {
        const { fileContent, key } = params
        const uploadParams = {
            Bucket: this.bucketName,
            Key: `${key}.pdf`,
            Body: fileContent,
            ContentType: 'application/pdf'
        }
        try {
            await this.s3Client.send(new PutObjectCommand(uploadParams));
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
     * @returns {Promise<string>} - the pre-signed URL that the user can access.
     */
    async getAccessLink(params) {
        const { key, expiresIn } = params
        const getFileParams = {
            Bucket: this.bucketName,
            Key: `${key}.pdf`
        };
        try {
            const url = await getSignedUrl(this.s3Client, new GetObjectCommand(getFileParams), { expiresIn });
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
    async deleteFile(uuid) {
        const deleteFileParams = {
            Bucket: this.bucketName,
            Key: `${uuid}.pdf`
        }
        try {
            await this.s3Client.send(new DeleteObjectCommand(deleteFileParams))
            console.log(`File ${uuid}.pdf deleted.`);
        } catch (err) {
            console.error('Error: ', err)
        }
    }
}

module.exports = S3;