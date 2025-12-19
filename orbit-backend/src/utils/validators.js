/**
 * Budget Configuration Validators
 */

export const validateBudgetConfig = (data) => {
  const errors = {};

  // Budget Name validation
  if (!data.budgetName || data.budgetName.trim() === '') {
    errors.budgetName = 'Budget name is required';
  }

  // Period validation
  const validPeriods = ['Monthly', 'Quarterly', 'Semi-Annual', 'Yearly'];
  if (!data.period || !validPeriods.includes(data.period)) {
    errors.period = `Period must be one of: ${validPeriods.join(', ')}`;
  }

  // Min/Max limit validation
  if (data.min_limit !== null && data.max_limit !== null) {
    if (parseFloat(data.min_limit) > parseFloat(data.max_limit)) {
      errors.limits = 'Min limit cannot exceed max limit';
    }
  }

  // Budget control validation
  if (data.budget_control && (!data.budgetControlLimit || data.budgetControlLimit <= 0)) {
    errors.budgetControlLimit = 'Budget limit is required when control is enabled';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateScopeFields = (data) => {
  const errors = {};

  // At least one scope should be provided
  const hasScope = data.geo_scope || data.location_scope || data.department_scope;
  if (!hasScope) {
    errors.scope = 'At least one scope (geo, location, or department) is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export default {
  validateBudgetConfig,
  validateScopeFields,
};
