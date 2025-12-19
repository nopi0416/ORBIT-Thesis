/**
 * Standardized Response Helper
 */

export const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendError = (res, error, statusCode = 400) => {
  res.status(statusCode).json({
    success: false,
    error,
  });
};

export default {
  sendSuccess,
  sendError,
};
