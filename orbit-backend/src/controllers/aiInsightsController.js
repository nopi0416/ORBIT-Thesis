import AiInsightsService from '../services/aiInsightsService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class AiInsightsController {
  static async generateInsights(req, res) {
    try {
      const userId = req.user?.id || null;
      const role = req.user?.role || null;
      const orgId = req.user?.org_id || null;
      const { fromDate, toDate } = req.body || {};

      const result = await AiInsightsService.generateInsights({
        userId,
        role,
        orgId,
        fromDate,
        toDate,
      });

      if (!result.success) {
        return sendError(res, result.error, 500);
      }

      return sendSuccess(res, result.data, 'AI insights generated', 200);
    } catch (error) {
      console.error('Error generating AI insights:', error);
      return sendError(res, error.message || 'Failed to generate AI insights', 500);
    }
  }

  static async getRealtimeMetrics(req, res) {
    try {
      const userId = req.user?.id || null;
      const role = req.user?.role || null;
      const orgId = req.user?.org_id || null;
      const { fromDate, toDate } = req.query || {};

      const result = await AiInsightsService.getRealtimeMetrics({
        userId,
        role,
        orgId,
        fromDate,
        toDate,
      });

      if (!result.success) {
        return sendError(res, result.error, 500);
      }

      return sendSuccess(res, result.data, 'Realtime metrics generated', 200);
    } catch (error) {
      console.error('Error generating realtime metrics:', error);
      return sendError(res, error.message || 'Failed to generate realtime metrics', 500);
    }
  }

  static async getLatestInsights(req, res) {
    try {
      const userId = req.user?.id || null;

      const result = await AiInsightsService.getLatestInsights({ userId });

      if (!result.success) {
        return sendError(res, result.error, 500);
      }

      return sendSuccess(res, result.data, 'Latest AI insights fetched', 200);
    } catch (error) {
      console.error('Error fetching latest AI insights:', error);
      return sendError(res, error.message || 'Failed to fetch latest AI insights', 500);
    }
  }
}

export default AiInsightsController;
