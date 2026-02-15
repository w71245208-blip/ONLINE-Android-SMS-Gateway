const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// --- CONFIGURATION ---
// I fixed the URL here.
const GATEWAY_URL = "https://api.sms-gate.app/3rdparty/v1/message";

// These will use your Render settings, or fallback to the hardcoded strings
const DEVICE_ID = process.env.DEVICE_ID || "mXMCdKS4TTIPwNoAcMVBz";
const TOKEN = process.env.TOKEN || "tk35bteldznl0x";

let otpStore = {};

// Serve HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Keep-Alive Route (For UptimeRobot)
app.get('/ping', (req, res) => {
    res.status(200).send('Pong! Server is awake.');
});

app.post('/send-otp', async (req, res) => {
    let { phoneNumber } = req.body;
    
    if (!phoneNumber) return res.status(400).json({ success: false, message: "Phone required" });

    // --- AUTO-FIX PHONE NUMBER ---
    // If user types '9525...', we change it to '919525...'
    // This prevents the "Gateway Error" for missing country codes.
    phoneNumber = phoneNumber.replace(/\D/g, ''); // Remove spaces/dashes
    if (phoneNumber.length === 10) {
        phoneNumber = '91' + phoneNumber;
    }

    const otp = Math.floor(1000 + Math.random() * 9000);
    otpStore[phoneNumber] = otp;

    // Auto-delete OTP after 5 minutes
    setTimeout(() => {
        if (otpStore[phoneNumber]) delete otpStore[phoneNumber];
    }, 5 * 60 * 1000);

    try {
        console.log(`Attempting to send to: ${phoneNumber} using Device: ${DEVICE_ID}`);
        
        const response = await axios.post(GATEWAY_URL, {
            phone: phoneNumber,
            message: `Your Login Code: ${otp}`,
            device_id: DEVICE_ID
        }, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        
        console.log("Gateway Response:", response.data);
        res.json({ success: true });

    } catch (err) {
        // Detailed Error Logging
        console.error("Gateway Failed!");
        if (err.response) {
            console.error("Status:", err.response.status);
            console.error("Data:", err.response.data);
        } else {
            console.error("Error:", err.message);
        }
        res.status(500).json({ success: false, message: "Failed to send SMS. Check Server Logs." });
    }
});

app.post('/verify-otp', (req, res) => {
    let { phoneNumber, code } = req.body;
    
    // Clean phone number to match the one we stored
    phoneNumber = phoneNumber.replace(/\D/g, '');
    if (phoneNumber.length === 10) phoneNumber = '91' + phoneNumber;

    if (otpStore[phoneNumber] && parseInt(code) === otpStore[phoneNumber]) {
        delete otpStore[phoneNumber];
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "Invalid code" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
