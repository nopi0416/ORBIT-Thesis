import { Router } from 'express';
import budgetConfigRoutes from './budgetConfigRoutes.js';
import approvalRequestRoutes from './approvalRequestRoutes.js';
import authRoutes from './authRoutes.js';
import adminUserManagementRoutes from './adminUserManagementRoutes.js';

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

// Admin User Management routes
router.use('/admin', adminUserManagementRoutes);



export default router;
