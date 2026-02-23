const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const getHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token && { 'Authorization': `Bearer ${token}` }),
});

/**
 * Create a single user
 */
export const createUser = async (userData, token) => {
  try {
    const normalizedName = (userData.name || '').trim().replace(/\s+/g, ' ');
    const nameParts = normalizedName ? normalizedName.split(' ') : [];
    const lastName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : normalizedName;
    const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : normalizedName;

    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({
        firstName,
        lastName,
        email: userData.email,
        employeeId: userData.employeeId,
        roleId: userData.role,
        organizationId: userData.ou,
        departmentId: userData.departmentId,
        geoId: userData.geoId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle different error response formats
      let errorMessage = 'Failed to create user';
      let fieldErrors = null;
      
      if (data.error) {
        if (typeof data.error === 'string') {
          errorMessage = data.error;
        } else if (typeof data.error === 'object') {
          errorMessage = JSON.stringify(data.error);
          fieldErrors = data.error;
        }
      } else if (data.message) {
        errorMessage = data.message;
      } else if (data.errors) {
        errorMessage = JSON.stringify(data.errors);
      }
      
      console.error('Backend error response:', data);
      const error = new Error(errorMessage);
      if (fieldErrors) {
        error.fieldErrors = fieldErrors;
      }
      throw error;
    }

    return data.data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Create a single admin user
 */
export const createAdminUser = async (adminData, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/admin-users`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({
        fullName: adminData.fullName,
        email: adminData.email,
        adminRole: adminData.adminRole,
        orgId: adminData.orgId || null,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      let errorMessage = 'Failed to create admin user';

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
    console.error('Error creating admin user:', error);
    throw error;
  }
};

/**
 * Bulk create users/admins
 */
export const createUsersBulk = async (users, token, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/users/bulk`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ users }),
      signal: options?.signal,
    });

    const data = await response.json();

    if (!response.ok) {
      let errorMessage = 'Failed to create users in bulk';
      let details = null;
      if (data?.error) {
        if (typeof data.error === 'string') {
          errorMessage = data.error;
        } else if (typeof data.error === 'object') {
          errorMessage = data.error.message || JSON.stringify(data.error);
          details = data.error;
        }
      }
      const error = new Error(errorMessage);
      if (details) error.details = details;
      throw error;
    }

    return data.data;
  } catch (error) {
    console.error('Error creating users in bulk:', error);
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
      let errorMessage = 'Failed to fetch users';
      if (data?.error) {
        if (typeof data.error === 'string') {
          errorMessage = data.error;
        } else if (typeof data.error === 'object') {
          errorMessage = JSON.stringify(data.error);
        }
      }
      throw new Error(errorMessage);
    }

    // Transform backend data to match frontend format
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((user) => ({
        id: user.user_id,
        employeeId: user.employee_id || (user.user_type === 'admin' ? 'ADMIN' : user.user_id),
        name: `${user.first_name} ${user.last_name}`.trim() || 'Admin User',
        email: user.email,
        ou: user.organization?.org_name || 'Unassigned',
        geo: user.tblgeo?.geo_name || user.tblgeo?.geo_code || (user.user_type === 'admin' ? '—' : 'Unassigned'),
        role: user.tbluserroles?.[0]?.tblroles?.role_name || 'N/A',
        status: user.status || (user.user_type === 'admin' ? 'Active' : 'Unknown'),
        department: user.department_org?.org_name || user.department_name || '--',
        orgId: user.org_id || null,
        geoId: user.geo_id || null,
        roleId: user.tbluserroles?.[0]?.role_id || null,
        departmentId: user.department_id || null,
        userType: user.user_type || 'user',
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * Update user status (lock/unlock/deactivate/reactivate)
 */
export const updateUserStatus = async (userIds, action, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/users/status`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify({ userIds, action }),
    });

    const data = await response.json();

    if (!response.ok) {
      let errorMessage = 'Failed to update user status';
      if (data?.error) {
        if (typeof data.error === 'string') {
          errorMessage = data.error;
        } else if (typeof data.error === 'object') {
          errorMessage = JSON.stringify(data.error);
        }
      }
      throw new Error(errorMessage);
    }

    return data.data;
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
};

/**
 * Update a single user
 */
export const updateUser = async (userId, userData, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        roleId: userData.roleId,
        organizationId: userData.organizationId,
        departmentId: userData.departmentId,
        geoId: userData.geoId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      let errorMessage = 'Failed to update user';
      let details = null;
      if (data?.error) {
        if (typeof data.error === 'string') {
          errorMessage = data.error;
        } else if (typeof data.error === 'object') {
          errorMessage = data.error.error || data.error.message || JSON.stringify(data.error);
          details = data.error;
        }
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      if (details) error.details = details;
      throw error;
    }

    return data.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

export const resetUserCredentials = async (userId, basePassword, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/reset-credentials`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify({ basePassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      let errorMessage = 'Failed to reset user credentials';
      let details = null;

      if (data?.error) {
        if (typeof data.error === 'string') {
          errorMessage = data.error;
        } else if (typeof data.error === 'object') {
          errorMessage = data.error.error || data.error.message || JSON.stringify(data.error);
          details = data.error;
        }
      }

      const error = new Error(errorMessage);
      error.status = response.status;
      if (details) error.details = details;
      throw error;
    }

    return data.data;
  } catch (error) {
    console.error('Error resetting user credentials:', error);
    throw error;
  }
};

export const resetUsersCredentials = async (userIds, basePassword, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/users/reset-credentials`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify({ userIds, basePassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      let errorMessage = 'Failed to reset user credentials';
      let details = null;

      if (data?.error) {
        if (typeof data.error === 'string') {
          errorMessage = data.error;
        } else if (typeof data.error === 'object') {
          errorMessage = data.error.error || data.error.message || JSON.stringify(data.error);
          details = data.error;
        }
      }

      const error = new Error(errorMessage);
      error.status = response.status;
      if (details) error.details = details;
      throw error;
    }

    return data.data;
  } catch (error) {
    console.error('Error resetting users credentials:', error);
    throw error;
  }
};

/**
 * Get admin logs
 */
export const getAdminLogs = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/logs`, {
      method: 'GET',
      headers: getHeaders(token),
    });

    const data = await response.json();

    if (!response.ok) {
      let errorMessage = 'Failed to fetch admin logs';
      if (data?.error) {
        if (typeof data.error === 'string') {
          errorMessage = data.error;
        } else if (typeof data.error === 'object') {
          errorMessage = JSON.stringify(data.error);
        }
      }
      throw new Error(errorMessage);
    }

    return data.data || [];
  } catch (error) {
    console.error('Error fetching admin logs:', error);
    throw error;
  }
};

/**
 * Get login logs
 */
export const getLoginLogs = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/logs/login`, {
      method: 'GET',
      headers: getHeaders(token),
    });

    const data = await response.json();

    if (!response.ok) {
      let errorMessage = 'Failed to fetch login logs';
      if (data?.error) {
        if (typeof data.error === 'string') {
          errorMessage = data.error;
        } else if (typeof data.error === 'object') {
          errorMessage = JSON.stringify(data.error);
        }
      }
      throw new Error(errorMessage);
    }

    return data.data || [];
  } catch (error) {
    console.error('Error fetching login logs:', error);
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
        parent_org_id: org.parent_org_id || null,
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching organizations:', error);
    // Return empty array as fallback
    return [];
  }
};

/**
 * Get available geos
 */
export const getAvailableGeos = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/geos`, {
      method: 'GET',
      headers: getHeaders(token),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch geos');
    }

    if (data.data && Array.isArray(data.data)) {
      return data.data.map((geo) => ({
        geo_id: geo.geo_id,
        geo_name: geo.geo_name,
        geo_code: geo.geo_code,
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching geos:', error);
    return [];
  }
};
