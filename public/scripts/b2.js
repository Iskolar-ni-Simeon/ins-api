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
        console.log("B2 initialized.");

    }
    async ensureAuthorization() {
        const now = Date.now();
        if (now - this.lastAuthTime >= this.authDuration) {
            const authResponse = await this.b2.authorize();
            this.authorizationToken = authResponse.data.authorizationToken;
            this.apiUrl = authResponse.data.apiUrl;
            this.lastAuthTime = now;
            console.log("Re-authorized B2.");
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
}

module.exports = { B2 }