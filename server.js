const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// --- CONFIGURATION (From your screenshot 1000090087.jpg) ---
const GATEWAY_URL = "https://api.sms-gate.app/v1/message";
const DEVICE_ID = "mXMCdKS4TTIPwNoAcMVBz"; 
const PASSWORD = "tk35bteldznl0x";        

let otpStore = {}; // Memory to store codes temporarily

// Serve the index.html file at the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route to generate and send OTP
app.post('/send-otp', async (req, res) => {
    const { phoneNumber } = req.body;
    const otp = Math.floor(1000 + Math.random() * 9000);
    otpStore[phoneNumber] = otp;

    try {
        await axios.post(GATEWAY_URL, {
            phone: phoneNumber,
            message: `Your Verification Code is: ${otp}`,
            device_id: DEVICE_ID
        }, {
            headers: { 'Authorization': `Bearer ${PASSWORD}` }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: "Phone gateway error" });
    }
});

// Route to verify the code entered by the user
app.post('/verify-otp', (req, res) => {
    const { phoneNumber, code } = req.body;
    if (otpStore[phoneNumber] && parseInt(code) === otpStore[phoneNumber]) {
        delete otpStore[phoneNumber]; // Clear after success
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Full Combo Server live on port ${PORT}`));
