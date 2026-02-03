/**
 * API Client Utility
 * Centralized HTTP client for all backend API requests
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Generic fetch wrapper with error handling
 */
async function apiCall(endpoint, options = {}) {
  const {
    method = 'GET',
    body = null,
    headers = {},
    includeToken = true,
  } = options;

  try {
    const requestConfig = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    // Add authorization token if available
    if (includeToken) {
      const token = localStorage.getItem('authToken');
      if (token) {
        requestConfig.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Add body for POST/PUT requests
    if (body && (method === 'POST' || method === 'PUT')) {
      requestConfig.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, requestConfig);

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Check if response is successful
    if (!response.ok) {
      return {
        success: false,
        error: data?.error || data?.message || 'An error occurred',
        statusCode: response.status,
        data: data?.data || null,
      };
    }

    return {
      success: true,
      data: data?.data || data,
      message: data?.message || '',
      statusCode: response.status,
    };
  } catch (error) {
    console.error(`API call failed to ${endpoint}:`, error);
    return {
      success: false,
      error: error.message || 'Network request failed',
      statusCode: 0,
    };
  }
}

/**
 * Authentication API Endpoints
 */
export const authAPI = {
  /**
   * Login with email and password
   * Returns OTP requirement status
   */
  login: async (email, password) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: { email, password },
      includeToken: false,
    });
  },

  /**
   * Complete login with OTP verification
   * Returns authentication token
   */
  completeLogin: async (email, otp) => {
    return apiCall('/auth/complete-login', {
      method: 'POST',
      body: { email, otp },
      includeToken: false,
    });
  },

  /**
   * Request password reset OTP
   */
  forgotPassword: async (email) => {
    return apiCall('/auth/forgot-password', {
      method: 'POST',
      body: { email },
      includeToken: false,
    });
  },

  /**
   * Verify OTP for password reset
   */
  verifyOTP: async (email, otp, type = 'reset') => {
    return apiCall('/auth/verify-otp', {
      method: 'POST',
      body: { email, otp, type },
      includeToken: false,
    });
  },

  /**
   * Reset password after OTP verification
   */
  resetPassword: async (email, newPassword) => {
    return apiCall('/auth/reset-password', {
      method: 'POST',
      body: { email, newPassword },
      includeToken: false,
    });
  },

  /**
   * Change password (requires current password)
   */
  changePassword: async (email, currentPassword, newPassword) => {
    return apiCall('/auth/change-password', {
      method: 'POST',
      body: { email, currentPassword, newPassword },
      includeToken: true,
    });
  },

  /**
   * Set password for first time login
   */
  firstTimePassword: async (email, currentPassword, newPassword) => {
    return apiCall('/auth/first-time-password', {
      method: 'POST',
      body: { email, currentPassword, newPassword },
      includeToken: false,
    });
  },

  /**
   * Save security questions
   */
  saveSecurityQuestions: async (userId, questions) => {
    return apiCall('/auth/security-questions', {
      method: 'POST',
      body: {
        userId,
        question1: questions.question1,
        answer1: questions.answer1,
        question2: questions.question2,
        answer2: questions.answer2,
        question3: questions.question3,
        answer3: questions.answer3,
      },
      includeToken: true,
    });
  },

  /**
   * Verify security answers
   */
  verifySecurityAnswers: async (email, answers) => {
    return apiCall('/auth/verify-security-answers', {
      method: 'POST',
      body: {
        email,
        answer1: answers.answer1,
        answer2: answers.answer2,
        answer3: answers.answer3,
      },
      includeToken: false,
    });
  },

  /**
   * Create support ticket
   */
  createSupportTicket: async (ticketData) => {
    return apiCall('/auth/support-ticket', {
      method: 'POST',
      body: {
        name: ticketData.name,
        email: ticketData.email,
        issueType: ticketData.issueType,
        description: ticketData.description,
      },
      includeToken: false,
    });
  },

  /**
   * Accept user agreement
   */
  acceptUserAgreement: async (userId, version = '1.0') => {
    return apiCall('/auth/user-agreement', {
      method: 'POST',
      body: {
        userId,
        accepted: true,
        version,
      },
      includeToken: false,
    });
  },

  /**
   * Resend OTP
   */
  resendOTP: async (email, type = 'reset') => {
    return apiCall('/auth/resend-otp', {
      method: 'POST',
      body: { email, type },
      includeToken: false,
    });
  },

  /**
   * Register new user
   */
  register: async (userData) => {
    return apiCall('/auth/register', {
      method: 'POST',
      body: {
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || 'requestor',
      },
      includeToken: false,
    });
  },

  /**
   * Get user details by user ID
   */
  getUserDetails: async (userId) => {
    return apiCall(`/auth/user/${userId}`, {
      method: 'GET',
      includeToken: false,
    });
  },
};

export default apiCall;
