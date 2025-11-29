import { runAIWithSensorData } from '../services/ai.service.js';

export const analyzeSensorData = async (req, res) => {
	try {
		const sensorData = req.body;
		if (!sensorData || Object.keys(sensorData).length === 0) {
			return res.status(400).json({ message: 'No sensor data provided' });
		}
		// Call AI service with sensor data
		const aiResponse = await runAIWithSensorData(sensorData);
		return res.status(200).json({
			status: 'success',
			aiResponse,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('AI analysis error:', error);
		res.status(500).json({
			status: 'error',
			message: 'Internal Server Error',
			error: error.message
		});
	}
};
