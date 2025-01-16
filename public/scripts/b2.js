const fs = require('fs');
require('dotenv').config();
const backblaze = require('backblaze-b2');

class B2 {
    constructor() {
        this.bucketId = process.env.BUCKET_ID;
        this.bucketName = process.env.BUCKET_NAME;
        this.bucketEndpoint = process.env.BUCKET_ENDPOINT;
        this.lastAuthTime = 0;
        this.authDuration = 24 * 60 * 60 * 1000; //24 hours
        this.b2 = new backblaze({
            applicationKeyId: process.env.BUCKET_KEY_ID,
            applicationKey: process.env.BUCKET_APPLICATION_KEY,
        });
        console.log("[INIT]; B2 initialized.");

    }
    /**
     * Since `b2.authorize();` only lasts 24 hours, this function keeps track of the
     * last time it is authorized. If it is not authorized, authorize it (duh)
     */
    async ensureAuthorization() {
        const now = Date.now();
        if (now - this.lastAuthTime >= this.authDuration) {
            const authResponse = await this.b2.authorize();
            this.authorizationToken = authResponse.data.authorizationToken;
            this.apiUrl = authResponse.data.apiUrl;
            this.lastAuthTime = now;
            console.log("[AUTH]: Re-authorized B2.");
        }
    }

    async getCachedUploadUrl() {
        if (!this.uploadUrl || Date.now() - this.lastAuthTime >= this.authDuration) {
            const uploadURLResponse = await this.b2.getUploadUrl({ bucketId: this.bucketId });
            this.uploadUrl = uploadURLResponse.data.uploadUrl;
            this.uploadAuthToken = uploadURLResponse.data.authorizationToken;
        }
        return { uploadUrl: this.uploadUrl, uploadAuthToken: this.uploadAuthToken };
    }

    /**
     * Uploads the file to the S3 defined by the .env file.
     * @param {Object} params - parameters for the function.
     * @param {Buffer | Uint8Array | Blob | string} params.fileContent - file data
     * @param {string} params.key - unique version 4 UUID for the file name.
     */
    async uploadFile(params) {
        await this.ensureAuthorization();
        const { fileContent, key } = params;
        const { uploadUrl, uploadAuthToken } = await this.getCachedUploadUrl();

        const response = this.b2.uploadFile({
            uploadUrl: uploadUrl,
            uploadAuthToken: uploadAuthToken,
            fileName: `${key}.pdf`,
            data: fileContent
        }).then(() => { return { ok: true, message: 'File uploaded successfully.' } })
            .catch(err => { return { ok: false, message: `Unable to upload file: ${err}` } })
        return response
    }
    /**
     * Generates a pre-signed link for the user to access, to be expired in 3600 seconds (1 hour.)
     * @param {Object} params - parameters for the function.
     * @param {string} params.key - unique version 4 UUID to access the file.
     * @param {number} params.expiresIn - expiration time for the pre-signed URL. Default: 3600 seconds or 1 hour.
     * @returns {string} - the pre-signed URL that the user can access.
     */
    async getAccessLink(params) {
        await this.ensureAuthorization();
        const { key, expiresIn } = params;

        try {
            const authToken = await this.b2.getDownloadAuthorization({
                bucketId: this.bucketId,
                fileNamePrefix: `${key}.pdf`,
                validDurationInSeconds: expiresIn,
            }).then(token => token.data.authorizationToken);

            const downloadUrl = `${this.apiUrl}/file/${this.bucketName}/${key}.pdf?Authorization=${authToken}`;
            return { ok: true, data: downloadUrl }
        } catch (err) {
            return { ok: false, message: `Unable to fetch access link: ${err}` }
        }
    }

    /**
     * Deletes the file determined by params.uuid, the name of the file.
     * @param {string} uuid - unique version 4 UUID to access the file.
     */
    async deleteFile(uuid) {
        await this.ensureAuthorization();
        try {
            const versionsResponse = await this.b2.listFileVersions({
                bucketId: this.bucketId,
                fileName: `${uuid}.pdf`,
            });

            const file = versionsResponse.data.files.find(file => file.fileName === `${uuid}.pdf`);
            if (!file) {
                return { ok: false, message: 'File not found in B2 bucket.' };
            }

            await this.b2.deleteFileVersion({
                fileId: file.fileId,
                fileName: file.fileName
            });
            return { ok: true, message: 'Successfully deleted file.' };
        } catch (err) {
            console.error('Unable to delete file:', err);
            return { ok: false, message: `Unable to delete file: ${err}` };
        }
    }

}

module.exports = { B2 }