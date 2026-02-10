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
        department: user.department_org?.org_name || user.department_name || (user.user_type === 'admin' ? '—' : 'Unassigned'),
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
