import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";

import readingRoute from "./routes/reading.route.js";
import aiRoute from "./routes/ai.route.js";

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
      console.log("No origin in request, allowing by default");
      return callback(null, true);
    }
    const allowedOrigins = [
      process.env.BACKEND_DEVELOPMENT_URL,
      process.env.BACKEND_PRODUCTION_URL,
    ].filter(Boolean);
    console.log(`Checking origin: ${origin} against allowed: ${allowedOrigins.join(', ')}`);
    if (allowedOrigins.includes(origin)) {
      console.log(`CORS allowed origin: ${origin}`);
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
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

// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Handle ESP32 connections
  socket.on('esp32_connected', (data) => {
    socket.join('esp32_devices');
  });
  
  // Handle sensor data from ESP32
  socket.on('sensor_data', (data) => {
    io.emit('newData', {
      ...data.data,
      timestamp: new Date().toISOString()
    });
  });
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
  
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

// Make io accessible in routes/controllers
app.set("io", io);

app.use("/api/", readingRoute);
app.use("/api/", aiRoute);

server.listen(PORT, () => {
  console.log("Server is running on port ", PORT);
});