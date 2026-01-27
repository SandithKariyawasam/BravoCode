const admin = require('firebase-admin');

// Load service account
// Ideally usage in production is slightly different (env vars), but for local dev this is fine since it's gitignored (hopefully) or user provided.
// Since the user said "root", I'll look for the JSON file we found.
const serviceAccount = require('./gen-lang-client-0741249377-firebase-adminsdk-fbsvc-2769ee9bae.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

module.exports = { db, admin };
