/**
 * Approval Request API Service
 * Handles API calls for approval requests and line items
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const getHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token && { Authorization: `Bearer ${token}` }),
});

const parseResponse = async (response) => {
  let data;
  try {
    data = await response.json();
  } catch (error) {
    console.error('[parseResponse] Failed to parse JSON:', error);
    throw new Error(`Failed to parse server response: ${response.statusText}`);
  }
  
  if (!response.ok) {
    const errorMessage = data.error || data.message || `Request failed with status ${response.status}`;
    console.error('[parseResponse] Request failed:', errorMessage, 'Full data:', data);
    throw new Error(errorMessage);
  }
  return data.data || data || [];
};

const getApprovalRequests = async (filters = {}, token) => {
  const wantsPaginated = Boolean(filters.page || filters.limit);
  const queryParams = new URLSearchParams();
  if (filters.budget_id) queryParams.append('budget_id', filters.budget_id);
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.search) queryParams.append('search', filters.search);
  if (filters.submitted_by) queryParams.append('submitted_by', filters.submitted_by);
  if (filters.approval_stage_status) queryParams.append('approval_stage_status', filters.approval_stage_status);
  if (filters.page) queryParams.append('page', String(filters.page));
  if (filters.limit) queryParams.append('limit', String(filters.limit));

  const url = `${API_BASE_URL}/approval-requests${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(token),
  });

  const payload = await parseResponse(response);
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (!wantsPaginated) {
      return Array.isArray(payload.items) ? payload.items : [];
    }

    return {
      items: Array.isArray(payload.items) ? payload.items : [],
      pagination: payload.pagination || {
        page: Number(filters.page || 1),
        limit: Number(filters.limit || 10),
        totalItems: Array.isArray(payload.items) ? payload.items.length : 0,
        totalPages: 1,
        hasPrev: false,
        hasNext: false,
      },
    };
  }
  return [];
};

const getApprovalRequest = async (requestId, token) => {
  const response = await fetch(`${API_BASE_URL}/approval-requests/${requestId}`, {
    method: 'GET',
    headers: getHeaders(token),
  });

  return parseResponse(response);
};

const getPendingApprovals = async (userId, token) => {
  const queryParams = new URLSearchParams();
  if (userId) queryParams.append('user_id', userId);
  const url = `${API_BASE_URL}/approval-requests/my-approvals/pending${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(token),
  });

  return parseResponse(response);
};

const approveRequest = async (requestId, payload, token) => {
  const response = await fetch(`${API_BASE_URL}/approval-requests/${requestId}/approvals/approve`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
};

const rejectRequest = async (requestId, payload, token) => {
  const response = await fetch(`${API_BASE_URL}/approval-requests/${requestId}/approvals/reject`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
};

const completePayrollPayment = async (requestId, payload, token) => {
  const response = await fetch(`${API_BASE_URL}/approval-requests/${requestId}/approvals/complete-payment`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload || {}),
  });

  return parseResponse(response);
};

const createApprovalRequest = async (payload, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/approval-requests`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    return parseResponse(response);
  } catch (error) {
    console.error('[createApprovalRequest] Network or parsing error:', error);
    throw error;
  }
};

const submitApprovalRequest = async (requestId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/approval-requests/${requestId}/submit`, {
      method: 'POST',
      headers: getHeaders(token),
    });
    return parseResponse(response);
  } catch (error) {
    console.error('[submitApprovalRequest] Network or parsing error:', error);
    throw error;
  }
};

const getEmployeeByEid = async (eid, companyId, token) => {
  if (!eid) throw new Error('Employee ID is required');
  const queryParams = new URLSearchParams();
  if (companyId) queryParams.append('company_id', companyId);
  const url = `${API_BASE_URL}/approval-requests/employees/${encodeURIComponent(eid)}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(token),
  });

  return parseResponse(response);
};

const addLineItem = async (requestId, payload, token) => {
  const response = await fetch(`${API_BASE_URL}/approval-requests/${requestId}/line-items`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
};

const addLineItemsBulk = async (requestId, payload, token) => {
  try {
    const lineItems = Array.isArray(payload?.line_items) ? payload.line_items : [];
    if (!lineItems.length) {
      throw new Error('line_items must be a non-empty array');
    }

    const chunkSize = 500;
    const totalChunks = Math.ceil(lineItems.length / chunkSize);
    const combinedData = [];

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const start = chunkIndex * chunkSize;
      const end = start + chunkSize;
      const chunk = lineItems.slice(start, end);

      const response = await fetch(`${API_BASE_URL}/approval-requests/${requestId}/line-items/bulk`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ line_items: chunk }),
      });

      const chunkResult = await parseResponse(response);
      if (Array.isArray(chunkResult)) {
        combinedData.push(...chunkResult);
      } else if (chunkResult) {
        combinedData.push(chunkResult);
      }
    }

    return combinedData;
  } catch (error) {
    console.error('[addLineItemsBulk] Network or parsing error:', error);
    throw error;
  }
};

const getMySubmittedRequests = async (userId, token) => {
  const queryParams = new URLSearchParams();
  if (userId) queryParams.append('submitted_by', userId);
  const url = `${API_BASE_URL}/approval-requests${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(token),
  });

  return parseResponse(response);
};

const getUserNotifications = async (filters = {}, token) => {
  const queryParams = new URLSearchParams();
  if (filters.role) queryParams.append('role', filters.role);
  const url = `${API_BASE_URL}/approval-requests/notifications${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(token),
  });

  return parseResponse(response);
};

const markNotificationRead = async (notificationId, token) => {
  const response = await fetch(`${API_BASE_URL}/approval-requests/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: getHeaders(token),
  });

  return parseResponse(response);
};

const markAllNotificationsRead = async (token) => {
  const response = await fetch(`${API_BASE_URL}/approval-requests/notifications/read-all`, {
    method: 'PATCH',
    headers: getHeaders(token),
  });

  return parseResponse(response);
};

/**
 * Get multiple employees by EIDs in batch (optimized for bulk uploads)
 */
const getEmployeesBatch = async (eids, companyId, token) => {
  const response = await fetch(`${API_BASE_URL}/approval-requests/employees/batch`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ eids, company_id: companyId }),
  });

  return parseResponse(response);
};

export default {
  getApprovalRequests,
  getApprovalRequest,
  getApprovalRequestDetails: getApprovalRequest, // Alias for compatibility
  getMySubmittedRequests,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getPendingApprovals,
  approveRequest,
  rejectRequest,
  completePayrollPayment,
  createApprovalRequest,
  submitApprovalRequest,
  getEmployeeByEid,
  getEmployeesBatch,
  addLineItem,
  addLineItemsBulk,
};
