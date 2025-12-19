import { Router } from 'express';
import budgetConfigRoutes from './budgetConfigRoutes.js';

const router = Router();

/**
 * Main API Routes
 * All routes defined here
 */

// Budget Configuration routes
router.use('/budget-configurations', budgetConfigRoutes);

export default router;
