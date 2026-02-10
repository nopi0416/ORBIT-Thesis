import express from 'express';
import AiInsightsController from '../controllers/aiInsightsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/ai/insights
 * Generate AI insights for dashboard
 * Body: { fromDate?, toDate? }
 */
router.post('/insights', authenticateToken, AiInsightsController.generateInsights);
router.get('/insights/latest', authenticateToken, AiInsightsController.getLatestInsights);
router.get('/metrics', authenticateToken, AiInsightsController.getRealtimeMetrics);

export default router;
