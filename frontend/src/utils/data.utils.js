import { create } from 'zustand';
import { io } from 'socket.io-client';

// Transform raw data into display-ready format
const transformData = (rawData) => {
  if (!rawData) return null;

  // Handle different data formats from WebSocket
  const data = rawData.data || rawData;

  return {
    temperature: parseFloat(data.temperature || 0),
    humidity: parseFloat(data.humidity || 0),
    air_quality_ppm: parseFloat(data.air_quality_ppm || 0),
    rzero: parseFloat(data.rzero || 0),
    device_id: rawData.device_id || 'Unknown',
    esp32_timestamp: data.esp32_timestamp || Date.now(),
    server_timestamp: rawData.server_timestamp || new Date().toISOString(),
    received_at: rawData.received_at || Date.now()
  };
};

// Format data for display
const formatForDisplay = (data) => {
  if (!data) return null;

  return {
    displayText: `Temperature: ${data.temperature.toFixed(1)}°C, Humidity: ${data.humidity.toFixed(1)}%, Air Quality: ${data.air_quality_ppm.toFixed(1)} ppm`,
    values: {
      temperature: { value: data.temperature.toFixed(1), unit: '°C', label: 'Temperature' },
      humidity: { value: data.humidity.toFixed(1), unit: '%', label: 'Humidity' },
      airQuality: { value: data.air_quality_ppm.toFixed(1), unit: 'ppm', label: 'Air Quality' },
      rzero: { value: data.rzero.toFixed(1), unit: '', label: 'RZero' }
    },
    metadata: {
      timestamp: new Date(data.server_timestamp).toLocaleString(),
      device: data.device_id,
      lastUpdate: data.server_timestamp,
      latency: data.received_at - data.esp32_timestamp
    }
  };
};

// Zustand store for socket data
export const useSocketStore = create((set, get) => ({
  socket: null,
  isConnected: false,
  connectionStatus: 'disconnected',
  currentData: null,
  formattedData: null,
  error: null,
  socketId: null,
  dataRate: 0,
  lastReceived: null,

  connect: () => {
    const socketUrl = import.meta.env.VITE_BACKEND_PRODUCTION_URL || 'https://mvem.onrender.com';
    
    console.log('🔌 Connecting to socket:', socketUrl);
    set({ connectionStatus: 'connecting', error: null });

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      set({ 
        isConnected: true, 
        connectionStatus: 'connected', 
        socketId: socket.id,
        error: null
      });

      // Identify as frontend client
      socket.emit('frontend_connected', {
        client_id: socket.id,
        client_type: 'web_dashboard',
        timestamp: new Date().toISOString()
      });
    });

    socket.on('newData', (rawData) => {
      const now = Date.now();
      const { lastReceived } = get();
      
      console.log('📡 Received live data:', rawData);
      
      const transformedData = transformData(rawData);
      const formatted = formatForDisplay(transformedData);
      
      // Calculate data rate
      let dataRate = 0;
      if (lastReceived) {
        dataRate = 1000 / (now - lastReceived); // Messages per second
      }
      
      set({ 
        currentData: transformedData, 
        formattedData: formatted,
        lastReceived: now,
        dataRate: dataRate
      });
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      set({ 
        isConnected: false, 
        connectionStatus: 'disconnected', 
        socketId: null 
      });
    });

    socket.on('connect_error', (error) => {
      console.error('🚫 Socket connection error:', error);
      set({ 
        isConnected: false, 
        connectionStatus: 'error', 
        error: error.message 
      });
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ 
        socket: null, 
        isConnected: false, 
        connectionStatus: 'disconnected',
        socketId: null 
      });
    }
  },

  clearError: () => set({ error: null }),
  
  getConnectionInfo: () => {
    const { isConnected, socketId, dataRate } = get();
    return { 
      connected: isConnected, 
      socketId, 
      dataRate: dataRate.toFixed(2)
    };
  }
}));