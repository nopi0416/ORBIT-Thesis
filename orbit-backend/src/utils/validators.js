/**
 * Budget Configuration Validators
 */

import { isValidUser } from './userMapping.js';

export const validateBudgetConfig = (data) => {
  const errors = {};

  // Budget Name validation (camelCase from frontend)
  if (!data.budgetName || data.budgetName.trim() === '') {
    errors.budgetName = 'Budget name is required';
  }

  // Period validation (camelCase from frontend)
  const validPeriods = ['Monthly', 'Quarterly', 'Semi-Annual', 'Yearly'];
  if (!data.period || !validPeriods.includes(data.period)) {
    errors.period = `Period must be one of: ${validPeriods.join(', ')}`;
  }

  // Min/Max limit validation
  if (data.minLimit !== null && data.maxLimit !== null) {
    if (parseFloat(data.minLimit) > parseFloat(data.maxLimit)) {
      errors.limits = 'Min limit cannot exceed max limit';
    }
  }

  // Budget control validation
  if (data.budgetControlEnabled && (!data.budgetControlLimit || data.budgetControlLimit <= 0)) {
    errors.budgetControlLimit = 'Budget limit is required when control is enabled';
  }

  // Approver validation - check if approvers are valid users
  if (data.approverL1 && !isValidUser(data.approverL1)) {
    errors.approverL1 = `Invalid approver: ${data.approverL1}. User not found in system.`;
  }
  if (data.backupApproverL1 && !isValidUser(data.backupApproverL1)) {
    errors.backupApproverL1 = `Invalid backup approver: ${data.backupApproverL1}. User not found in system.`;
  }
  if (data.approverL2 && !isValidUser(data.approverL2)) {
    errors.approverL2 = `Invalid approver: ${data.approverL2}. User not found in system.`;
  }
  if (data.backupApproverL2 && !isValidUser(data.backupApproverL2)) {
    errors.backupApproverL2 = `Invalid backup approver: ${data.backupApproverL2}. User not found in system.`;
  }
  if (data.approverL3 && !isValidUser(data.approverL3)) {
    errors.approverL3 = `Invalid approver: ${data.approverL3}. User not found in system.`;
  }
  if (data.backupApproverL3 && !isValidUser(data.backupApproverL3)) {
    errors.backupApproverL3 = `Invalid backup approver: ${data.backupApproverL3}. User not found in system.`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateScopeFields = (data) => {
  const errors = {};

  // At least one scope should be provided
  // Check both possible field name formats
  const geoScope = data.geo_scope || data.geoScope || data.countries;
  const locationScope = data.location_scope || data.locationScope || data.siteLocation;
  const departmentScope = data.department_scope || data.departmentScope || data.ou;
  
  const hasScope = geoScope || locationScope || departmentScope;
  if (!hasScope) {
    errors.scope = 'At least one scope (geo, location, or department) is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Admin User Creation Validator
 */
export const validateAdminUserCreation = (data) => {
  const errors = {};

  // Required fields
  if (!data.firstName || data.firstName.trim() === '') {
    errors.firstName = 'First name is required';
  }

  if (!data.lastName || data.lastName.trim() === '') {
    errors.lastName = 'Last name is required';
  }

  if (!data.email || data.email.trim() === '') {
    errors.email = 'Email is required';
  } else {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.email = 'Invalid email format';
    }
  }

  if (!data.employeeId || data.employeeId.trim() === '') {
    errors.employeeId = 'Employee ID is required';
  }

  if (!data.roleId || data.roleId.trim() === '') {
    errors.roleId = 'Role ID is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export default {
  validateBudgetConfig,
  validateScopeFields,
  validateAdminUserCreation,
};
