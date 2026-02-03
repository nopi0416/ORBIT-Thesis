/**
 * Budget Configuration API Service
 * Handles all API calls for budget configuration CRUD operations
 */

const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Get authorization headers with token
 */
const getHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token && { 'Authorization': `Bearer ${token}` }),
});

/**
 * Handle API error responses
 */
const handleApiError = (error) => {
  console.error('API Error:', error);
  if (typeof error === 'object') {
    return JSON.stringify(error);
  }
  return error.response?.data?.error || error.message || 'An error occurred';
};

/**
 * CREATE - Create a new budget configuration
 */
export const createBudgetConfiguration = async (configData, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget-configurations`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(configData),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = typeof data.error === 'object' 
        ? JSON.stringify(data.error, null, 2)
        : data.error || 'Failed to create budget configuration';
      throw new Error(errorMessage);
    }

    return data.data;
  } catch (error) {
    console.error('Error creating budget configuration:', error);
    throw error;
  }
};

/**
 * READ - Get all budget configurations
 */
export const getBudgetConfigurations = async (filters = {}, token) => {
  try {
    const queryParams = new URLSearchParams();
    
    // Add filters to query parameters if provided
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.period) queryParams.append('period', filters.period);
    if (filters.geo) queryParams.append('geo', filters.geo);
    if (filters.location) queryParams.append('location', filters.location);
    if (filters.search) queryParams.append('search', filters.search);
    
    const url = `${API_BASE_URL}/budget-configurations${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch budget configurations');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching budget configurations:', error);
    throw error;
  }
};

/**
 * READ - Get a single budget configuration by ID
 */
export const getBudgetConfigurationById = async (budgetId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget-configurations/${budgetId}`, {
      method: 'GET',
      headers: getHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch budget configuration');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching budget configuration:', error);
    throw error;
  }
};

/**
 * UPDATE - Update a budget configuration
 */
export const updateBudgetConfiguration = async (budgetId, updateData, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget-configurations/${budgetId}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update budget configuration');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error updating budget configuration:', error);
    throw error;
  }
};

/**
 * DELETE - Delete a budget configuration
 */
export const deleteBudgetConfiguration = async (budgetId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget-configurations/${budgetId}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete budget configuration');
    }

    return true;
  } catch (error) {
    console.error('Error deleting budget configuration:', error);
    throw error;
  }
};

/**
 * GET - Get configurations by user
 */
export const getConfigurationsByUser = async (userId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget-configurations/user/${userId}`, {
      method: 'GET',
      headers: getHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch user configurations');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching user configurations:', error);
    throw error;
  }
};

/**
 * READ - Get all users with roles
 */
export const getUsersList = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget-configurations/users/list/all`, {
      method: 'GET',
      headers: getHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch users');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * Tenure Groups - GET
 */
export const getTenureGroups = async (budgetId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget-configurations/${budgetId}/tenure-groups`, {
      method: 'GET',
      headers: getHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch tenure groups');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching tenure groups:', error);
    throw error;
  }
};

/**
 * Tenure Groups - ADD
 */
export const addTenureGroups = async (budgetId, groupsData, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget-configurations/${budgetId}/tenure-groups`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(groupsData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add tenure groups');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error adding tenure groups:', error);
    throw error;
  }
};

/**
 * Tenure Groups - REMOVE
 */
export const removeTenureGroup = async (tenureGroupId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget-configurations/tenure-groups/${tenureGroupId}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove tenure group');
    }

    return true;
  } catch (error) {
    console.error('Error removing tenure group:', error);
    throw error;
  }
};

/**
 * Approvers - GET
 */
export const getApprovers = async (budgetId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget-configurations/${budgetId}/approvers`, {
      method: 'GET',
      headers: getHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch approvers');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching approvers:', error);
    throw error;
  }
};

/**
 * Approvers - SET
 */
export const setApprover = async (budgetId, approverData, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget-configurations/${budgetId}/approvers`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(approverData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to set approver');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error setting approver:', error);
    throw error;
  }
};

/**
 * Approvers - REMOVE
 */
export const removeApprover = async (approverId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget-configurations/approvers/${approverId}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove approver');
    }

    return true;
  } catch (error) {
    console.error('Error removing approver:', error);
    throw error;
  }
};

/**
 * Access Scopes - GET
 */
export const getAccessScopes = async (budgetId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget-configurations/${budgetId}/access-scopes`, {
      method: 'GET',
      headers: getHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch access scopes');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching access scopes:', error);
    throw error;
  }
};

/**
 * Access Scopes - ADD
 */
export const addAccessScope = async (budgetId, scopeData, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget-configurations/${budgetId}/access-scopes`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(scopeData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add access scope');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error adding access scope:', error);
    throw error;
  }
};

/**
 * Access Scopes - REMOVE
 */
export const removeAccessScope = async (scopeId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget-configurations/access-scopes/${scopeId}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove access scope');
    }

    return true;
  } catch (error) {
    console.error('Error removing access scope:', error);
    throw error;
  }
};

/**
 * GET - Get all organizations
 */
export const getOrganizations = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget-configurations/organizations/list/all`, {
      method: 'GET',
      headers: getHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch organizations');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching organizations:', error);
    throw error;
  }
};

/**
 * GET - Get organizations grouped by hierarchy level
 */
export const getOrganizationsByLevel = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget-configurations/organizations/by-level/list`, {
      method: 'GET',
      headers: getHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch organizations by level');
    }

    const data = await response.json();
    return data.data || {};
  } catch (error) {
    console.error('Error fetching organizations by level:', error);
    throw error;
  }
};

/**
 * GET - Get all geo entries
 */
export const getGeoList = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget-configurations/geo/list/all`, {
      method: 'GET',
      headers: getHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch geo list');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching geo list:', error);
    throw error;
  }
};

/**
 * GET - Get locations (optional geo_id)
 */
export const getLocations = async (geoId, token) => {
  try {
    const query = geoId ? `?geo_id=${encodeURIComponent(geoId)}` : '';
    const response = await fetch(`${API_BASE_URL}/budget-configurations/locations/list/all${query}`, {
      method: 'GET',
      headers: getHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch locations');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching locations:', error);
    throw error;
  }
};

/**
 * GET - Get organization geo/location mappings
 */
export const getOrganizationGeoLocations = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget-configurations/organization-geo-location/list/all`, {
      method: 'GET',
      headers: getHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch organization geo/location mappings');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching organization geo/location mappings:', error);
    throw error;
  }
};

/**
 * GET - Get organization geo/location mappings by org IDs
 */
export const getOrganizationGeoLocationsByOrg = async (orgIds = [], token) => {
  try {
    const query = orgIds.length ? `?org_id=${encodeURIComponent(orgIds.join(','))}` : '';
    const response = await fetch(`${API_BASE_URL}/budget-configurations/organization-geo-location/by-org${query}`, {
      method: 'GET',
      headers: getHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch organization geo/location mappings');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching organization geo/location mappings by org:', error);
    throw error;
  }
};

/**
 * GET - Get clients by parent org IDs
 */
export const getClientsByParentOrg = async (orgIds = [], token) => {
  try {
    const query = orgIds.length ? `?org_id=${encodeURIComponent(orgIds.join(','))}` : '';
    const response = await fetch(`${API_BASE_URL}/budget-configurations/clients/by-org${query}`, {
      method: 'GET',
      headers: getHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch clients by organization');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching clients by organization:', error);
    throw error;
  }
};

/**
 * GET - Get all approvers grouped by level (L1, L2, L3)
 */
export const getAllApprovers = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget-configurations/approvers/list/all`, {
      method: 'GET',
      headers: getHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch approvers');
    }

    const data = await response.json();
    return data.data || { L1: [], L2: [], L3: [] };
  } catch (error) {
    console.error('Error fetching approvers:', error);
    throw error;
  }
};

/**
 * GET - Get approvers for a specific level (L1, L2, L3)
 */
export const getApproversByLevel = async (level, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget-configurations/approvers/level/${level}`, {
      method: 'GET',
      headers: getHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to fetch ${level} approvers`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error(`Error fetching ${level} approvers:`, error);
    throw error;
  }
};

/**
 * GET - Get user by ID
 */
export const getUserById = async (userId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget-configurations/users/get/${userId}`, {
      method: 'GET',
      headers: getHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch user');
    }

    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

export default {
  // CRUD operations
  createBudgetConfiguration,
  getBudgetConfigurations,
  getBudgetConfigurationById,
  updateBudgetConfiguration,
  deleteBudgetConfiguration,
  getConfigurationsByUser,
  
  // Tenure Groups
  getTenureGroups,
  addTenureGroups,
  removeTenureGroup,
  
  // Approvers
  getApprovers,
  setApprover,
  removeApprover,
  
  // Access Scopes
  getAccessScopes,
  addAccessScope,
  removeAccessScope,
  
  // Organizations
  getOrganizations,
  getOrganizationsByLevel,
  getGeoList,
  getLocations,
  getOrganizationGeoLocations,
  getOrganizationGeoLocationsByOrg,
  getClientsByParentOrg,
  
  // Real Approvers Data
  getAllApprovers,
  getApproversByLevel,
  
  // Users
  getUserById,
};
