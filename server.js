const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// --- CONFIGURATION ---
// Standard URL for the app in your screenshot
const GATEWAY_URL = "https://api.sms-gate.app/3rdparty/v1/message";

// Use Render Environment Variables
const DEVICE_ID = process.env.DEVICE_ID || "mXMCdKS4TTIPwNoAcMVBz";
const TOKEN = process.env.TOKEN || "tk35bteldznl0x";

let otpStore = {};

// Serve HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Keep-Alive Route
app.get('/ping', (req, res) => {
    res.status(200).send('Pong! Server is awake.');
});

app.post('/send-otp', async (req, res) => {
    let { phoneNumber } = req.body;
    
    if (!phoneNumber) return res.status(400).json({ success: false, message: "Phone required" });

    // --- AUTO-FIX PHONE NUMBER ---
    // 1. Remove non-numbers
    phoneNumber = phoneNumber.replace(/\D/g, ''); 
    // 2. Add country code if missing (assuming 10 digit numbers are Indian)
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
        console.log(`Sending OTP to: ${phoneNumber}`);
        console.log(`Using Device ID: ${DEVICE_ID}`);
        
        // SMS Gateway Request
        // We use 'device_id' and 'phone' to match your Android App's requirements
        const response = await axios.post(GATEWAY_URL, {
            phone: phoneNumber, 
            message: `Your Login Code: ${otp}`,
            device_id: DEVICE_ID
        }, {
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}` 
            }
        });
        
        console.log("Gateway Success:", response.data);
        res.json({ success: true });

    } catch (err) {
        // DETAILED ERROR LOGGING
        console.error("--- SMS GATEWAY ERROR ---");
        if (err.response) {
            // The gateway responded, but with an error (e.g., 404, 401)
            console.error("Status Code:", err.response.status);
            console.error("Error Data:", JSON.stringify(err.response.data));
        } else {
            // Network error (server unreachable)
            console.error("Connection Error:", err.message);
        }
        console.error("-------------------------");
        
        res.status(500).json({ success: false, message: "Failed to send SMS. See logs." });
    }
});

app.post('/verify-otp', (req, res) => {
    let { phoneNumber, code } = req.body;
    
    // Normalize phone number exactly like we did in send-otp
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
