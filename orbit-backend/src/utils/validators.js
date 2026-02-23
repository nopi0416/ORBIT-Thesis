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

  // Date range validation (camelCase from frontend)
  if (!data.startDate) {
    errors.startDate = 'Start date is required';
  }
  if (!data.endDate) {
    errors.endDate = 'End date is required';
  }
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (Number.isNaN(start.getTime())) {
      errors.startDate = 'Start date must be a valid date';
    }
    if (Number.isNaN(end.getTime())) {
      errors.endDate = 'End date must be a valid date';
    }
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start > end) {
      errors.dateRange = 'Start date must be on or before end date';
    }
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

  // Payroll cycle validation
  const payCycle = data.payCycle || data.pay_cycle;
  if (!payCycle) {
    errors.payCycle = 'Payroll cycle is required';
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
  const geoScope = data.geo || data.geo_scope || data.geoScope || data.countries;
  const locationScope = data.location || data.location_scope || data.locationScope || data.siteLocation;
  const clientScope = data.client || data.clients || data.clientScope;
  const accessOuScope = data.access_ou || data.accessibleOUPaths || data.accessOu || data.accessOuPaths;
  const affectedOuScope = data.affected_ou || data.affectedOUPaths || data.affectedOu || data.affectedOuPaths;

  const hasScope = geoScope || locationScope || clientScope || accessOuScope || affectedOuScope;
  if (!hasScope) {
    errors.scope = 'At least one scope (geo, location, client, access OU, or affected OU) is required';
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
  } else {
    const employeeIdRegex = /^[a-zA-Z0-9]+$/;
    if (!employeeIdRegex.test(data.employeeId.trim())) {
      errors.employeeId = 'Employee ID must be alphanumeric only';
    }
  }

  if (!data.roleId || data.roleId.trim() === '') {
    errors.roleId = 'Role ID is required';
  }

  if (!data.geoId || data.geoId.trim() === '') {
    errors.geoId = 'Geo ID is required';
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
