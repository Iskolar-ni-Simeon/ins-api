const { generateKeyPairSync } = require('crypto');

function generateKey() {
    return { publicKey, privateKey } = generateKeyPairSync('ec', {
        namedCurve: 'P-256',
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
}

const g = generateKey();