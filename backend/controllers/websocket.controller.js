// Handle WebSocket sensor data processing
export const handleSensorData = (io, socket, data) => {
  try {
    console.log(`📊 Processing sensor data from ${data.device_id}:`, data.data);
    
    // Validate required data fields
    if (!data.device_id || !data.data) {
      console.error('❌ Invalid data format - missing device_id or data');
      socket.emit('error', { message: 'Invalid data format' });
      return;
    }

    // Add server-side processing and timestamps
    const processedData = {
      device_id: data.device_id,
      temperature: data.data.temperature || null,
      humidity: data.data.humidity || null,
      air_quality_ppm: data.data.air_quality_ppm || null,
      rzero: data.data.rzero || null,
      esp32_timestamp: data.data.esp32_timestamp || data.data.timestamp || Date.now(),
      server_timestamp: new Date().toISOString(),
      received_at: Date.now()
    };

    console.log('✅ Data processed successfully:', processedData);

    // Broadcast to all connected frontend clients
    io.emit('newData', processedData);
    
    // Send acknowledgment back to ESP32
    socket.emit('data_ack', {
      status: 'received',
      timestamp: processedData.server_timestamp,
      device_id: data.device_id
    });

    return processedData;
    
  } catch (error) {
    console.error('❌ Error processing sensor data:', error);
    socket.emit('error', { 
      message: 'Failed to process sensor data',
      error: error.message 
    });
    throw error;
  }
};

// Handle ESP32 device connection
export const handleESP32Connection = (socket, data) => {
  try {
    console.log(`🤖 ESP32 device connected: ${data.device_id}`);
    
    // Add ESP32 to device room for targeted messaging
    socket.join('esp32_devices');
    socket.join(`device_${data.device_id}`);
    
    // Store device info in socket
    socket.device_info = {
      device_id: data.device_id,
      device_type: data.device_type || 'sensor',
      capabilities: data.capabilities || [],
      connected_at: new Date().toISOString()
    };
    
    // Send connection acknowledgment
    socket.emit('connection_ack', {
      status: 'connected',
      server_time: new Date().toISOString(),
      socket_id: socket.id,
      message: `Device ${data.device_id} connected successfully`
    });
    
    return socket.device_info;
    
  } catch (error) {
    console.error('❌ Error handling ESP32 connection:', error);
    socket.emit('error', { 
      message: 'Failed to process device connection',
      error: error.message 
    });
    throw error;
  }
};

// Handle frontend client connection
export const handleFrontendConnection = (socket, data) => {
  try {
    console.log(`💻 Frontend client connected: ${data?.client_id || socket.id}`);
    
    // Add frontend to client room
    socket.join('frontend_clients');
    
    // Store client info in socket
    socket.client_info = {
      client_id: data?.client_id || socket.id,
      client_type: data?.client_type || 'web_dashboard',
      connected_at: new Date().toISOString()
    };
    
    // Send connection acknowledgment
    socket.emit('connection_ack', {
      status: 'connected',
      server_time: new Date().toISOString(),
      socket_id: socket.id,
      message: 'Frontend client connected successfully'
    });
    
    return socket.client_info;
    
  } catch (error) {
    console.error('❌ Error handling frontend connection:', error);
    socket.emit('error', { 
      message: 'Failed to process client connection',
      error: error.message 
    });
    throw error;
  }
};

// Handle client disconnection
export const handleDisconnection = (socket) => {
  const deviceInfo = socket.device_info;
  const clientInfo = socket.client_info;
  
  if (deviceInfo) {
    console.log(`❌ ESP32 device disconnected: ${deviceInfo.device_id} (${socket.id})`);
  } else if (clientInfo) {
    console.log(`❌ Frontend client disconnected: ${clientInfo.client_id} (${socket.id})`);
  } else {
    console.log(`❌ Client disconnected: ${socket.id}`);
  }
};

// Get connection statistics
export const getConnectionStats = (io) => {
  const sockets = io.sockets.sockets;
  const stats = {
    total_connections: sockets.size,
    esp32_devices: 0,
    frontend_clients: 0,
    unknown_clients: 0,
    devices: [],
    clients: []
  };
  
  sockets.forEach(socket => {
    if (socket.device_info) {
      stats.esp32_devices++;
      stats.devices.push({
        device_id: socket.device_info.device_id,
        socket_id: socket.id,
        connected_at: socket.device_info.connected_at
      });
    } else if (socket.client_info) {
      stats.frontend_clients++;
      stats.clients.push({
        client_id: socket.client_info.client_id,
        socket_id: socket.id,
        connected_at: socket.client_info.connected_at
      });
    } else {
      stats.unknown_clients++;
    }
  });
  
  return stats;
};