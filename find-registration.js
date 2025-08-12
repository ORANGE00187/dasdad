const admin = require('firebase-admin');

// --- FIREBASE INITIALIZATION ---
// Important: In a real-world scenario, store your service account JSON in a Vercel environment variable.
try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
        : require('./service-account.json');

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
} catch (error) {
    console.error("CRITICAL ERROR: Could not initialize Firebase. Ensure 'service-account.json' is present or FIREBASE_SERVICE_ACCOUNT env var is set.", error);
    // We cannot proceed without Firebase, but in a serverless function,
    // we'll let the individual request fail instead of exiting the process.
}
const db = admin.firestore();

// --- CORS HELPER ---
function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// --- SERVERLESS FUNCTION ---
module.exports = async (req, res) => {
    setCorsHeaders(res);

    // Handle pre-flight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    
    // Vercel parses urlencoded bodies automatically.
    const code = req.body.code;
    if (!code) {
        return res.status(400).json({ message: "Code is required." });
    }

    try {
        const query = await db.collection('registrations').where('registrationCode', '==', code).limit(1).get();
        
        if (query.empty) {
            return res.status(404).json({ message: "Registration code not found." });
        }
        
        const doc = query.docs[0];
        const data = doc.data();
        
        if (data.checkedIn) {
            return res.status(409).json({ message: `Code already used for ${data.sname}. Seats: ${data.seat1}, ${data.seat2}` });
        }
        
        res.status(200).json({ data, doc_id: doc.id });

    } catch (error) {
        console.error("Error in /find-registration:", error);
        res.status(500).json({ message: error.message });
    }
};