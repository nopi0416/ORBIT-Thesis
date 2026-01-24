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
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Request failed');
  }
  return data.data || [];
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

const getPendingApprovals = async (token) => {
  const response = await fetch(`${API_BASE_URL}/approval-requests/my-approvals/pending`, {
    method: 'GET',
    headers: getHeaders(token),
  });

  return parseResponse(response);
};

const createApprovalRequest = async (payload, token) => {
  const response = await fetch(`${API_BASE_URL}/approval-requests`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
};

const submitApprovalRequest = async (requestId, token) => {
  const response = await fetch(`${API_BASE_URL}/approval-requests/${requestId}/submit`, {
    method: 'POST',
    headers: getHeaders(token),
  });

  return parseResponse(response);
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
  const response = await fetch(`${API_BASE_URL}/approval-requests/${requestId}/line-items/bulk`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
};

export default {
  getApprovalRequests,
  getPendingApprovals,
  createApprovalRequest,
  submitApprovalRequest,
  getEmployeeByEid,
  addLineItem,
  addLineItemsBulk,
};
