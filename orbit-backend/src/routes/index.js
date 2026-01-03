import { Router } from 'express';
import budgetConfigRoutes from './budgetConfigRoutes.js';
import authRoutes from './authRoutes.js';

const router = Router();

/**
 * Main API Routes
 * All routes defined here
 */

// Authentication routes
router.use('/auth', authRoutes);

// Budget Configuration routes
router.use('/budget-configurations', budgetConfigRoutes);

export default router;
