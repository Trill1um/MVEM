export const getData = async (req, res) => {
  try {
    const io = req.app.get("io");
    let sensorData = null;
    let message = "";

    // console.log("📡 Received request body:", req.body);

    // If a file is uploaded (e.g., via multipart/form-data), parse it
    if (req.file) {
      // console.log("File Uploaded");
      sensorData = JSON.parse(req.file.buffer.toString());
      message = "Sensor data from uploaded file";
    } else if (req.body && Object.keys(req.body).length > 0) {
      // console.log("Object Uploaded");
      // Check for wrapped data first, then direct data
      sensorData = req.body.data || req.body;
      message = "Sensor data received from ESP32";
      
      // console.log("📊 Processing sensor data:", sensorData);
    } else {
      return res.status(400).json({ message: "No sensor data provided" });
    }

    // Emit new data to all connected clients
    if (io && sensorData) {
      console.log("📡 Broadcasting data via Socket.io");
      io.emit("newData", sensorData);
    } else {
      console.warn("⚠️ No io instance or sensor data available");
    }

    return res.status(200).json({ 
      status: "success",
      data: sensorData, 
      message: message,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Error processing sensor data:", error);
    res.status(500).json({ 
      status: "error",
      message: "Internal Server Error",
      error: error.message
    });
  }
};