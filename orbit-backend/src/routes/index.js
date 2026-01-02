import { Router } from 'express';
import budgetConfigRoutes from './budgetConfigRoutes.js';
import approvalRequestRoutes from './approvalRequestRoutes.js';

const router = Router();

/**
 * Main API Routes
 * All routes defined here
 */

// Budget Configuration routes
router.use('/budget-configurations', budgetConfigRoutes);

// Approval Request routes
router.use('/approval-requests', approvalRequestRoutes);

export default router;
