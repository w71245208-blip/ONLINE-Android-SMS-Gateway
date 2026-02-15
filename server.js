const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// --- CONFIGURATION ---
// Use Environment Variables for safety (See Step 4 below)
const GATEWAY_URL = "https://api.sms-gate.app/v1/message";
const DEVICE_ID = process.env.DEVICE_ID || "mXMCdKS4TTIPwNoAcMVBz"; 
const TOKEN = process.env.TOKEN || "tk35bteldznl0x"; 

// --- MEMORY OPTIMIZATION ---
let otpStore = {}; 

// Serve HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- KEEP-ALIVE ROUTE (CRITICAL FOR RENDER FREE TIER) ---
app.get('/ping', (req, res) => {
    res.status(200).send('Pong! Server is awake.');
});

app.post('/send-otp', async (req, res) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ success: false, message: "Phone required" });

    const otp = Math.floor(1000 + Math.random() * 9000);
    
    // Store OTP
    otpStore[phoneNumber] = otp;

    // OPTIMIZATION: Auto-delete OTP after 5 minutes to free up memory
    setTimeout(() => {
        if (otpStore[phoneNumber]) {
            delete otpStore[phoneNumber];
            console.log(`Cleared expired OTP for ${phoneNumber}`);
        }
    }, 5 * 60 * 1000); // 5 minutes

    try {
        await axios.post(GATEWAY_URL, {
            phone: phoneNumber,
            message: `Your Login Code: ${otp}`,
            device_id: DEVICE_ID
        }, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        
        console.log(`OTP sent to ${phoneNumber}`);
        res.json({ success: true });
    } catch (err) {
        console.error("Gateway Error:", err.response ? err.response.data : err.message);
        res.status(500).json({ success: false, message: "Failed to send SMS" });
    }
});

app.post('/verify-otp', (req, res) => {
    const { phoneNumber, code } = req.body;
    
    // Check if OTP exists and matches
    if (otpStore[phoneNumber] && parseInt(code) === otpStore[phoneNumber]) {
        delete otpStore[phoneNumber]; // Clear immediately after use
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "Invalid or expired code" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server optimized for Render running on port ${PORT}`));
