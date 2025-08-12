const admin = require('firebase-admin');

// --- FIREBASE INITIALIZATION ---
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
    console.error("CRITICAL ERROR: Could not initialize Firebase.", error);
}
const db = admin.firestore();

// --- CORS HELPER ---
function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// --- SERVERLESS FUNCTION ---
module.exports = async (req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    try {
        const snapshot = await db.collection('registrations').where('checkedIn', '==', true).get();
        const allocated_seats = [];
        snapshot.forEach(doc => {
            const d = doc.data();
            if (d.seat1) allocated_seats.push(d.seat1);
            if (d.seat2) allocated_seats.push(d.seat2);
        });
        
        const stateDoc = await db.collection('app_state').doc('seat_allocator').get();
        const allocated_count = stateDoc.exists ? stateDoc.data().next_seat_index : 0;
        
        res.status(200).json({ allocated_seats, allocated_count });

    } catch (error) {
        console.error("Error in /get-seat-status:", error);
        res.status(500).json({ message: error.message });
    }
};