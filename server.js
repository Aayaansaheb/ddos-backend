// --- 1. SETUP ---
// Import necessary libraries
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const axios = require('axios');

// Load environment variables from a .env file
require('dotenv').config();

// Initialize the app and server
const app = express();
const server = http.createServer(app);

// --- 2. MIDDLEWARE ---
// Enable CORS to allow your frontend to connect
app.use(cors());
// Enable the server to parse JSON request bodies
app.use(express.json());

// --- 3. SECURE API ENDPOINTS ---

// This endpoint securely calls the Gemini Text API
app.post('/analyze-attack', async (req, res) => {
    const { attackData } = req.body;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'API Key is not configured on the server.' });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
    
    const systemPrompt = "You are a helpful cybersecurity analyst. Your goal is to explain cyber attack concepts in a clear, concise, and easy-to-understand way for a non-technical audience. Do not use jargon without explaining it. Keep responses to a single paragraph.";
    const userQuery = `Explain what a '${attackData.type}' attack is in simple terms. The simulated attack is from ${attackData.source.country} to ${attackData.destination.country}. What could be a potential motivation for this type of attack?`;
    
    const payload = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userQuery }] }],
    };

    try {
        const response = await axios.post(apiUrl, payload);
        res.json(response.data);
    } catch (error) {
        console.error('Error calling Gemini Text API:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to get analysis from Gemini.' });
    }
});

// This endpoint securely calls the Gemini TTS API
app.post('/text-to-speech', async (req, res) => {
    const { text } = req.body;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'API Key is not configured on the server.' });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_API_KEY}`;
    const payload = {
        contents: [{ parts: [{ text: `Say with a clear, informative tone: ${text}` }] }],
        generationConfig: { responseModalities: ["AUDIO"] },
    };

    try {
        const response = await axios.post(apiUrl, payload);
        res.json(response.data);
    } catch (error) {
        console.error('Error calling Gemini TTS API:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to generate audio from Gemini.' });
    }
});


// --- 4. WEBSOCKET LOGIC FOR LIVE ATTACKS ---
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for simplicity, restrict in production
        methods: ["GET", "POST"]
    }
});

const countries = ["United States", "Russia", "China", "India", "Brazil", "Germany", "United Kingdom", "France", "Japan", "Canada", "Australia", "South Korea", "Netherlands", "Iran", "Turkey", "Vietnam", "Poland", "Ukraine", "Taiwan", "Romania"];
const attackTypes = ['UDP Flood', 'SYN Flood', 'HTTP GET', 'DNS Amplification'];
const locations = { "United States": { lat: 37.0902, lng: -95.7129 }, "Russia": { lat: 61.5240, lng: 105.3188 }, "China": { lat: 35.8617, lng: 104.1954 }, "India": { lat: 20.5937, lng: 78.9629 }, "Brazil": { lat: -14.2350, lng: -51.9253 }, "Germany": { lat: 51.1657, lng: 10.4515 }, "United Kingdom": { lat: 55.3781, lng: -3.4360 }, "France": { lat: 46.2276, lng: 2.2137 }, "Japan": { lat: 36.2048, lng: 138.2529 }, "Canada": { lat: 56.1304, lng: -106.3468 }, "Australia": { lat: -25.2744, lng: 133.7751 }, "South Korea": { lat: 35.9078, lng: 127.7669 }, "Netherlands": { lat: 52.1326, lng: 5.2913 }, "Iran": { lat: 32.4279, lng: 53.6880 }, "Turkey": { lat: 38.9637, lng: 35.2433 }, "Vietnam": { lat: 14.0583, lng: 108.2772 }, "Poland": { lat: 51.9194, lng: 19.1451 }, "Ukraine": { lat: 48.3794, lng: 31.1656 }, "Taiwan": { lat: 23.6978, lng: 120.9605 }, "Romania": { lat: 45.9432, lng: 24.9668 } };

io.on('connection', (socket) => {
    console.log('✅ A user connected');
    socket.on('disconnect', () => {
        console.log('❌ User disconnected');
    });
});

setInterval(() => {
    const sourceCountry = countries[Math.floor(Math.random() * countries.length)];
    let destCountry = countries[Math.floor(Math.random() * countries.length)];
    while (sourceCountry === destCountry) {
        destCountry = countries[Math.floor(Math.random() * countries.length)];
    }
    const attack = {
        type: attackTypes[Math.floor(Math.random() * attackTypes.length)],
        source: { country: sourceCountry, ...locations[sourceCountry] },
        destination: { country: destCountry, ...locations[destCountry] },
    };
    io.emit('new-attack', attack);
}, 2000);

// --- 5. START SERVER ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

