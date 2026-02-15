const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors()); 
app.use(express.json());

// --- UPDATED CONFIGURATION (From your working app) ---
const GATEWAY_URL = "https://api.sms-gate.app/v1/message";
const DEVICE_ID = "mXMCdKS4TTIPwNoAcMVBz"; //
const TOKEN = "tk35bteldznl0x";        //

let otpStore = {}; 

// Serve your HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Send OTP Route
app.post('/send-otp', async (req, res) => {
    const { phoneNumber } = req.body;
    const otp = Math.floor(1000 + Math.random() * 9000);
    otpStore[phoneNumber] = otp;

    try {
        const response = await axios.post(GATEWAY_URL, {
            phone: phoneNumber,
            message: `Your Login Code: ${otp}`,
            device_id: DEVICE_ID
        }, {
            headers: { 
                // IMPORTANT: The word 'Bearer' must have a space after it
                'Authorization': `Bearer ${TOKEN}` 
            }
        });
        
        console.log("Success! SMS sent through gateway.");
        res.json({ success: true });
    } catch (err) {
        // Log the exact error from the gateway for debugging
        console.error("Gateway Error Details:", err.response ? err.response.data : err.message);
        res.status(500).json({ success: false, message: "Phone gateway error" });
    }
});

// Verify OTP Route
app.post('/verify-otp', (req, res) => {
    const { phoneNumber, code } = req.body;
    if (otpStore[phoneNumber] && parseInt(code) === otpStore[phoneNumber]) {
        delete otpStore[phoneNumber];
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Full Combo Server running on port ${PORT}`));
