const admin = require('firebase-admin');

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const buff = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64');
    serviceAccount = JSON.parse(buff.toString('ascii'));
} else {
    try {
        serviceAccount = require('./gen-lang-client-0741249377-firebase-adminsdk-fbsvc-5a3960ea83.json');
    } catch (err) {
        console.error("Firebase Service Account key is missing! Set FIREBASE_SERVICE_ACCOUNT_BASE64 env var or provide the json file.");
    }
}

if (serviceAccount) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

module.exports = { db, admin };
