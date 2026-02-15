const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// --- CONFIGURATION ---
const GATEWAY_URL = "https://api.sms-gate.app/3rdparty/v1/message";

// --- CREDENTIALS FROM YOUR SCREENSHOT ---
const DEVICE_ID = process.env.DEVICE_ID || "mXMCdKS4TTIPwNoAcMVBz";
const API_PASSWORD = process.env.TOKEN || "tk35bteldznl0x";
const API_USERNAME = process.env.USERNAME || "7THBJ9"; // Added this!

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
    phoneNumber = phoneNumber.replace(/\D/g, ''); 
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
        console.log(`Sending to: ${phoneNumber}`);
        
        // --- UPDATED REQUEST ---
        // We now send username/password inside the body (Standard for this Gateway)
        const response = await axios.post(GATEWAY_URL, {
            username: API_USERNAME,    // The missing piece!
            password: API_PASSWORD,    // Your app password
            device: DEVICE_ID,         // Changed parameter name to 'device' (common for this API)
            phone: phoneNumber,
            message: `Your Login Code: ${otp}`
        }, {
            headers: { 
                'Content-Type': 'application/json' 
                // Removed 'Authorization' header because we are sending creds in body now
            }
        });
        
        console.log("Gateway Success:", response.data);
        res.json({ success: true });

    } catch (err) {
        console.error("Gateway Failed!");
        if (err.response) {
            console.error("Status:", err.response.status);
            console.error("Data:", err.response.data);
        } else {
            console.error("Error:", err.message);
        }
        res.status(500).json({ success: false, message: "Failed to send SMS." });
    }
});

app.post('/verify-otp', (req, res) => {
    let { phoneNumber, code } = req.body;
    
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
