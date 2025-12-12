// Admin Types Definitions

/**
 * @typedef {Object} UserActivity
 * @property {string} id
 * @property {string} type - 'user_created' | 'role_assigned' | 'access_modified' | 'workflow_updated'
 * @property {string} user
 * @property {string} action
 * @property {string} timestamp
 * @property {string} status - 'success' | 'pending' | 'failed'
 */

/**
 * @typedef {Object} SystemMetric
 * @property {string} name
 * @property {string} description
 * @property {string} value
 * @property {string} status - 'healthy' | 'warning' | 'critical'
 */

export {};
