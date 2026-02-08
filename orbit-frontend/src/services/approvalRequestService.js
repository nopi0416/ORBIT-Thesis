/**
 * Approval Request API Service
 * Handles API calls for approval requests and line items
 */

const API_BASE_URL = 'http://localhost:3001/api';

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
  
  console.log('[parseResponse] Response status:', response.status, 'Data:', data);
  
  if (!response.ok) {
    const errorMessage = data.error || data.message || `Request failed with status ${response.status}`;
    console.error('[parseResponse] Request failed:', errorMessage, 'Full data:', data);
    throw new Error(errorMessage);
  }
  return data.data || data || [];
};

const getApprovalRequests = async (filters = {}, token) => {
  const queryParams = new URLSearchParams();
  if (filters.budget_id) queryParams.append('budget_id', filters.budget_id);
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.search) queryParams.append('search', filters.search);
  if (filters.submitted_by) queryParams.append('submitted_by', filters.submitted_by);

  const url = `${API_BASE_URL}/approval-requests${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(token),
  });

  return parseResponse(response);
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

const createApprovalRequest = async (payload, token) => {
  try {
    console.log('[createApprovalRequest] Sending request with payload:', payload);
    const response = await fetch(`${API_BASE_URL}/approval-requests`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    console.log('[createApprovalRequest] Response received:', response.status);
    return parseResponse(response);
  } catch (error) {
    console.error('[createApprovalRequest] Network or parsing error:', error);
    throw error;
  }
};

const submitApprovalRequest = async (requestId, token) => {
  try {
    console.log('[submitApprovalRequest] Submitting request:', requestId);
    const response = await fetch(`${API_BASE_URL}/approval-requests/${requestId}/submit`, {
      method: 'POST',
      headers: getHeaders(token),
    });
    console.log('[submitApprovalRequest] Response received:', response.status);
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
    console.log('[addLineItemsBulk] Adding line items to request:', requestId, 'Count:', payload?.line_items?.length);
    const response = await fetch(`${API_BASE_URL}/approval-requests/${requestId}/line-items/bulk`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    console.log('[addLineItemsBulk] Response received:', response.status);
    return parseResponse(response);
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
  getPendingApprovals,
  approveRequest,
  rejectRequest,
  createApprovalRequest,
  submitApprovalRequest,
  getEmployeeByEid,
  getEmployeesBatch,
  addLineItem,
  addLineItemsBulk,
};
