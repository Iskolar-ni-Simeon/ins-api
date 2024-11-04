// public/scripts/keyManager.js
const { generateKey } = require('./auth.js');

class KeyManager {
    constructor() {
        if (!KeyManager.instance) {
            KeyManager.instance = this;
            this.initializeKeys();
        }
        return KeyManager.instance;
    }

    async initializeKeys() {
        try {
            const data = await generateKey();
            this.privateKey = data.privateKey;
            this.publicKey = data.publicKey;
        } catch (error) {
            console.error("Error generating keys:", error);
        }
    }

    getPrivateKey() {
        return this.privateKey;
    }

    getPublicKey() {
        return this.publicKey;
    }
}

const keyManager = new KeyManager();
module.exports = keyManager;
