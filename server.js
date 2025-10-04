// A simple Node.js server to simulate and broadcast DDoS attack data over WebSockets.

// 1. SETUP: Import necessary libraries
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

// 2. INITIALIZATION: Create the Express app and the HTTP server
const app = express();
const server = http.createServer(app);

// 3. WEBSOCKET (SOCKET.IO) SETUP:
// Initialize Socket.IO and configure it to allow cross-origin requests (CORS)
// so our HTML file can connect to it.
const io = new Server(server, {
  cors: {
    origin: "*", // Allow connections from any origin
    methods: ["GET", "POST"]
  }
});

const PORT = 3000; // The port the server will run on

// 4. DATA SIMULATION: Define the data for our simulated attacks
const attackTypes = ['UDP Flood', 'SYN Flood', 'HTTP GET', 'DNS Amplification'];
const countries = [
    { name: "United States", lat: 37.0902, lon: -95.7129 },
    { name: "China", lat: 35.8617, lon: 104.1954 },
    { name: "Russia", lat: 61.5240, lon: 105.3188 },
    { name: "Germany", lat: 51.1657, lon: 10.4515 },
    { name: "Brazil", lat: -14.2350, lon: -51.9253 },
    { name: "India", lat: 20.5937, lon: 78.9629 },
    { name: "United Kingdom", lat: 55.3781, lon: -3.4360 },
    { name: "Iran", lat: 32.4279, lon: 53.6880 },
    { name: "South Korea", lat: 35.9078, lon: 127.7669 },
    { name: "Canada", lat: 56.1304, lon: -106.3468 }
];

// 5. EVENT HANDLING: Define what happens when a client connects
io.on('connection', (socket) => {
  console.log('A user connected to the WebSocket.');

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected.');
  });
});

// 6. DATA BROADCASTING:
// Set an interval to generate and broadcast a new simulated attack every few seconds.
setInterval(() => {
    // Pick two different random countries for source and destination
    let sourceIndex = Math.floor(Math.random() * countries.length);
    let destIndex;
    do {
        destIndex = Math.floor(Math.random() * countries.length);
    } while (sourceIndex === destIndex);

    const source = countries[sourceIndex];
    const destination = countries[destIndex];

    // Create the attack data object
    const attack = {
        type: attackTypes[Math.floor(Math.random() * attackTypes.length)],
        source: {
            country: source.name,
            lat: source.lat,
            lng: source.lon
        },
        destination: {
            country: destination.name,
            lat: destination.lat,
            lng: destination.lon
        }
    };
    
    // Broadcast the new attack data to all connected clients
    io.emit('new-attack', attack);
    console.log(`Simulated attack: ${attack.type} from ${attack.source.country} to ${attack.destination.country}`);

}, 2000); // Generate a new attack every 2 seconds

// 7. START SERVER:
// Make the server listen on the specified port.
server.listen(PORT, () => {
  console.log(`✅ Backend server is running and listening on http://localhost:${PORT}`);
});
