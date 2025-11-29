import express from 'express';
import { analyzeSensorData } from '../controllers/ai.controller.js';

const router = express.Router();

router.post('/analyze', analyzeSensorData);

export default router;
