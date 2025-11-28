import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";

import { 
  handleSensorData, 
  handleESP32Connection, 
  handleFrontendConnection, 
  handleDisconnection, 
  getConnectionStats 
} from "./controllers/websocket.controller.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
// const io = new Server(server, { cors: { origin: "*" } });
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for ESP32 and frontend
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin

    if (!origin) {
      console.log("⚠️ No origin in request, allowing by default");
      return callback(null, true);
    }
    const allowedOrigins = [
      process.env.BACKEND_DEVELOPMENT_URL,
      process.env.BACKEND_PRODUCTION_URL,
    ].filter(Boolean);
    console.log(`🔍 Checking origin: ${origin} against allowed: ${allowedOrigins.join(', ')}`);
    if (allowedOrigins.includes(origin)) {
      console.log(`✅ CORS allowed origin: ${origin}`);
      callback(null, true);
    } else {
      console.log(`🚫 CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use((req, res, next) => {
  console.log(`🚀 ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  next(); // This was missing!
});


// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  // Handle ESP32 device connections
  socket.on('esp32_connected', (data) => {
    handleESP32Connection(socket, data);
  });
  
  // Handle sensor data from ESP32
  socket.on('sensor_data', (data) => {
    handleSensorData(io, socket, data);
  });
  
  // Handle frontend client connections
  socket.on('frontend_connected', (data) => {
    handleFrontendConnection(socket, data);
  });
  
  // Handle disconnections
  socket.on('disconnect', () => {
    handleDisconnection(socket);
  });
  
  // Handle socket errors
  socket.on('error', (error) => {
    console.error(`🚫 Socket error for ${socket.id}:`, error);
  });
});

// Make io accessible for any future middleware (if needed)
app.set("io", io);

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = getConnectionStats(io);
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'WebSocket-only sensor data server',
    ...stats
  });
});

// WebSocket connection stats endpoint
app.get('/connections', (req, res) => {
  const stats = getConnectionStats(io);
  res.json(stats);
});

server.listen(PORT, () => {
  console.log("Server is running on port ", PORT);
});