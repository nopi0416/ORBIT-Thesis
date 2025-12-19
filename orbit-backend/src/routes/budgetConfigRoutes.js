import { Router } from 'express';
import { BudgetConfigController } from '../controllers/budgetConfigController.js';

const router = Router();

/**
 * Budget Configuration Routes
 * Base path: /api/budget-configurations
 */

// POST - Create a new budget configuration
router.post('/', BudgetConfigController.createBudgetConfig);

// GET - Get all budget configurations (with optional filters)
router.get('/', BudgetConfigController.getAllBudgetConfigs);

// GET - Get configurations by user
router.get('/user/:userId', BudgetConfigController.getConfigsByUser);

// GET - Get a single budget configuration by ID
router.get('/:id', BudgetConfigController.getBudgetConfigById);

// PUT - Update a budget configuration
router.put('/:id', BudgetConfigController.updateBudgetConfig);

// DELETE - Delete a budget configuration
router.delete('/:id', BudgetConfigController.deleteBudgetConfig);

export default router;
