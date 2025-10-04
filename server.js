/*
 * FINAL SECURE BACKEND SERVER
 * This server performs two main tasks:
 * 1. Simulates and broadcasts cyber attack data to all connected clients via WebSockets.
 * 2. Acts as a secure proxy to the Gemini API, protecting your API key.
 *
 * How to Run:
 * 1. Run `npm install express socket.io axios dotenv`
 * 2. Create a `.env` file in the same directory.
 * 3. Add your Gemini API key to the `.env` file: GEMINI_API_KEY="your_actual_api_key"
 * 4. Run `node server.js`
 */

// --- 1. SETUP ---
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');

// --- 2. INITIALIZATION ---
const app = express();
app.use(express.json()); // Middleware to parse JSON bodies from frontend requests
const server = http.createServer(app);

// --- 3. CORS & WEBSOCKET CONFIGURATION ---
// Configure Socket.IO with CORS rules to allow connections from any origin.
// This is crucial for allowing your GitHub Pages frontend to connect.
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins
        methods: ["GET", "POST"]
    }
});

// Use the port provided by the hosting environment (like Render) or default to 3000.
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// --- 4. SECURE API PROXY ENDPOINTS ---

// Endpoint to get text analysis from Gemini
app.post('/analyze-attack', async (req, res) => {
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'API key is not configured on the server.' });
    }

    const { attackData } = req.body;
    if (!attackData) {
        return res.status(400).json({ error: 'attackData is required.' });
    }

    const model = 'gemini-2.5-flash-preview-05-20';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const prompt = `In a concise, single paragraph for a non-technical audience, explain this cyber attack. What is it, and what is the likely motivation? Attack Type: ${attackData.type}, From: ${attackData.source.country}, To: ${attackData.destination.country}`;

    try {
        const response = await axios.post(apiUrl, {
            contents: [{ parts: [{ text: prompt }] }],
        });
        const text = response.data.candidates[0].content.parts[0].text;
        res.json({ analysis: text });
    } catch (error) {
        console.error("Gemini API Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to retrieve analysis from Gemini API.' });
    }
});

// Endpoint to get Text-to-Speech audio from Gemini
app.post('/text-to-speech', async (req, res) => {
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'API key is not configured on the server.' });
    }

    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Text is required for TTS.' });
    }

    const model = 'gemini-2.5-flash-preview-tts';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    
    try {
        const response = await axios.post(apiUrl, {
            contents: [{ parts: [{ text: `Say this in a clear, informative voice: ${text}` }] }],
            generationConfig: { responseModalities: ["AUDIO"] },
        });
        const audioContent = response.data.candidates[0].content.parts[0].inlineData.data;
        res.json({ audioContent });
    } catch (error) {
        console.error("Gemini TTS API Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to retrieve audio from Gemini TTS API.' });
    }
});


// --- 5. DATA SIMULATION & WEBSOCKET BROADCAST ---
const attackTypes = ['UDP Flood', 'SYN Flood', 'HTTP GET', 'DNS Amplification', 'Botnet'];
const countries = [
    { name: "United States", lat: 37.0902, lon: -95.7129 }, { name: "China", lat: 35.8617, lon: 104.1954 },
    { name: "Russia", lat: 61.5240, lon: 105.3188 }, { name: "Germany", lat: 51.1657, lon: 10.4515 },
    { name: "Brazil", lat: -14.2350, lon: -51.9253 }, { name: "India", lat: 20.5937, lon: 78.9629 },
    { name: "United Kingdom", lat: 55.3781, lon: -3.4360 }, { name: "Iran", lat: 32.4279, lon: 53.6880 },
    { name: "South Korea", lat: 35.9078, lon: 127.7669 }, { name: "Canada", lat: 56.1304, lon: -106.3468 }
];

io.on('connection', (socket) => {
    console.log('✅ Client connected via WebSocket.');
    socket.on('disconnect', () => console.log('Client disconnected.'));
});

setInterval(() => {
    let sourceIndex = Math.floor(Math.random() * countries.length);
    let destIndex;
    do { destIndex = Math.floor(Math.random() * countries.length); } while (sourceIndex === destIndex);

    const attack = {
        type: attackTypes[Math.floor(Math.random() * attackTypes.length)],
        source: { country: countries[sourceIndex].name, lat: countries[sourceIndex].lat, lng: countries[sourceIndex].lon },
        destination: { country: countries[destIndex].name, lat: countries[destIndex].lat, lng: countries[destIndex].lon },
        color: ['rgba(255, 50, 50, 0.7)', 'rgba(255, 150, 50, 0.7)'][Math.round(Math.random())]
    };
    io.emit('new-attack', attack);
}, 2500);


// --- 6. START SERVER ---
server.listen(PORT, () => {
    console.log(`✅ Backend server running on port ${PORT}`);
    if (!GEMINI_API_KEY) {
        console.warn('⚠️ WARNING: GEMINI_API_KEY environment variable not set. AI features will not work.');
    }
});

