const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const getHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token && { Authorization: `Bearer ${token}` }),
});

const parseResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Failed to generate AI insights');
  }
  return data.data || data;
};

const getAiInsights = async (payload = {}, token) => {
  const response = await fetch(`${API_BASE_URL}/ai/insights`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
};

const getRealtimeMetrics = async (params = {}, token) => {
  const searchParams = new URLSearchParams(params);
  const queryString = searchParams.toString();
  const response = await fetch(`${API_BASE_URL}/ai/metrics${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
    headers: getHeaders(token),
  });

  return parseResponse(response);
};

const getLatestAiInsights = async (token) => {
  const response = await fetch(`${API_BASE_URL}/ai/insights/latest`, {
    method: 'GET',
    headers: getHeaders(token),
  });

  return parseResponse(response);
};

export default {
  getAiInsights,
  getLatestAiInsights,
  getRealtimeMetrics,
};
