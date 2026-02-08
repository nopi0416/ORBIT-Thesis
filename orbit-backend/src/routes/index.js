import { Router } from 'express';
import budgetConfigRoutes from './budgetConfigRoutes.js';
import approvalRequestRoutes from './approvalRequestRoutes.js';
import authRoutes from './authRoutes.js';
import aiInsightsRoutes from './aiInsightsRoutes.js';

const router = Router();

/**
 * Main API Routes
 * All routes defined here
 */

// Authentication routes
router.use('/auth', authRoutes);

// Budget Configuration routes
router.use('/budget-configurations', budgetConfigRoutes);

// Approval Request routes
router.use('/approval-requests', approvalRequestRoutes);

// AI Insights routes
router.use('/ai', aiInsightsRoutes);

export default router;
