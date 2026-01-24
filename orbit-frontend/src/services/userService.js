const API_BASE_URL = 'http://localhost:3001/api';

const getHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token && { 'Authorization': `Bearer ${token}` }),
});

/**
 * Create a single user
 */
export const createUser = async (userData, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({
        firstName: userData.name.split(' ')[0],
        lastName: userData.name.split(' ').slice(1).join(' ') || userData.name,
        email: userData.email,
        employeeId: userData.employeeId,
        roleId: userData.role,
        organizationId: userData.ou,
        department: userData.ou,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle different error response formats
      let errorMessage = 'Failed to create user';
      
      if (data.error) {
        if (typeof data.error === 'string') {
          errorMessage = data.error;
        } else if (typeof data.error === 'object') {
          errorMessage = JSON.stringify(data.error);
        }
      } else if (data.message) {
        errorMessage = data.message;
      } else if (data.errors) {
        errorMessage = JSON.stringify(data.errors);
      }
      
      console.error('Backend error response:', data);
      throw new Error(errorMessage);
    }

    return data.data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Get all users
 */
export const getAllUsers = async (token, filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.search) queryParams.append('search', filters.search);

    const response = await fetch(`${API_BASE_URL}/admin/users?${queryParams}`, {
      method: 'GET',
      headers: getHeaders(token),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch users');
    }

    // Transform backend data to match frontend format
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((user) => ({
        id: user.user_id,
        employeeId: user.employee_id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        ou: user.department,
        role: user.tbluserroles?.[0]?.tblroles?.role_name || 'N/A',
        status: user.status,
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * Get available roles
 */
export const getAvailableRoles = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/roles`, {
      method: 'GET',
      headers: getHeaders(token),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch roles');
    }

    return data.data || [];
  } catch (error) {
    console.error('Error fetching roles:', error);
    // Return empty array as fallback
    return [];
  }
};

/**
 * Get available organizations
 */
export const getAvailableOrganizations = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/organizations`, {
      method: 'GET',
      headers: getHeaders(token),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch organizations');
    }

    // Transform backend data to match frontend format
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((org) => ({
        organization_id: org.org_id,
        org_name: org.org_name,
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching organizations:', error);
    // Return empty array as fallback
    return [];
  }
};
