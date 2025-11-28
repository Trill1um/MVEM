import { create } from 'zustand';
import { io } from "socket.io-client";

// Transform raw data into display-ready format
const transformData = (rawData) => {
  if (!rawData) return null;

  // Handle different data formats
  const data = rawData.data || rawData;

  return {
    temperature: data.temperature ? parseFloat(data.temperature).toFixed(1) : null,
    humidity: data.humidity ? parseFloat(data.humidity).toFixed(1) : null,
    airQuality: data.air_quality_ppm ? parseFloat(data.air_quality_ppm).toFixed(1) : null,
    rzero: data.rzero ? parseFloat(data.rzero).toFixed(1) : null,
    timestamp: rawData.timestamp || new Date().toISOString(),
    raw: rawData // Keep original data for debugging
  };
};

// Format data for display
const formatForDisplay = (data) => {
  if (!data) return null;

  return {
    displayText: `Temperature: ${data.temperature}°C, Humidity: ${data.humidity}%`,
    values: {
      temperature: { value: data.temperature, unit: '°C', label: 'Temperature' },
      humidity: { value: data.humidity, unit: '%', label: 'Humidity' },
      airQuality: { value: data.airQuality, unit: 'ppm', label: 'Air Quality' },
      rzero: { value: data.rzero, unit: '', label: 'RZero' }
    },
    metadata: {
      timestamp: new Date(data.timestamp).toLocaleString(),
      lastUpdate: data.timestamp
    }
  };
};

// Zustand store for socket data
export const useSocketStore = create((set, get) => ({
  // State
  socket: null,
  isConnected: false,
  currentData: null,
  formattedData: null,
  error: null,
  socketId: null,

  // Actions
  connect: () => {
    const state = get();
    
    // Disconnect existing socket
    if (state.socket) {
      state.socket.disconnect();
    }

    // Get URL from environment variable
    const socketUrl = import.meta.env.VITE_BACKEND_PRODUCTION_URL || "https://mvem.onrender.com";
    
    console.log("🔌 Connecting to socket:", socketUrl);
    
    set({ 
      connectionStatus: 'connecting',
      error: null 
    });

    const socket = io(socketUrl);

    // Socket event handlers
    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
      set({
        socket,
        isConnected: true,
        connectionStatus: 'connected',
        socketId: socket.id,
        error: null
      });
    });

    socket.on("newData", (rawData) => {
      console.log("📡 Received live data:", rawData);
      const transformedData = transformData(rawData);
      const formattedData = formatForDisplay(transformedData);
      
      set({
        currentData: transformedData,
        formattedData: formattedData,
        error: null
      });
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
      set({
        isConnected: false,
        connectionStatus: 'disconnected',
        socketId: null
      });
    });

    socket.on("connect_error", (error) => {
      console.error("🚫 Socket connection error:", error);
      set({
        isConnected: false,
        connectionStatus: 'error',
        error: error.message,
        socketId: null
      });
    });

    set({ socket });
  },

  disconnect: () => {
    const state = get();
    if (state.socket) {
      state.socket.disconnect();
      set({
        socket: null,
        isConnected: false,
        connectionStatus: 'disconnected',
        currentData: null,
        formattedData: null,
        socketId: null
      });
    }
  },

  // Reset error
  clearError: () => set({ error: null }),

  // Get connection info
  getConnectionInfo: () => {
    const state = get();
    return {
      isConnected: state.isConnected,
      status: state.connectionStatus,
      socketId: state.socketId,
      hasData: !!state.currentData
    };
  }
}));
