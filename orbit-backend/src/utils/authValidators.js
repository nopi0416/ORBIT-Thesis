/**
 * Authentication Validators
 * Validation logic for login, password, OTP, security questions, etc.
 */

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one symbol');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateLogin = (employeeId, password) => {
  const errors = {};

  if (!employeeId || employeeId.trim() === '') {
    errors.employee_id = 'Employee ID is required';
  }

  if (!password || password.trim() === '') {
    errors.password = 'Password is required';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateOTP = (otp) => {
  if (!otp || otp.length !== 6) {
    return {
      isValid: false,
      error: 'OTP must be 6 digits',
    };
  }

  if (!/^\d{6}$/.test(otp)) {
    return {
      isValid: false,
      error: 'OTP must contain only numbers',
    };
  }

  return { isValid: true };
};

export const validateSecurityQuestions = (questions) => {
  const errors = {};

  if (!questions.question1 || !questions.answer1) {
    errors.question1 = 'First security question and answer are required';
  }

  if (!questions.question2 || !questions.answer2) {
    errors.question2 = 'Second security question and answer are required';
  }

  if (!questions.question3 || !questions.answer3) {
    errors.question3 = 'Third security question and answer are required';
  }

  if (questions.question1 === questions.question2 || questions.question1 === questions.question3 || questions.question2 === questions.question3) {
    errors.duplicateQuestion = 'Please select different questions for each security question';
  }

  if ((questions.answer1 && questions.answer1.trim().length < 2) ||
      (questions.answer2 && questions.answer2.trim().length < 2) ||
      (questions.answer3 && questions.answer3.trim().length < 2)) {
    errors.answerLength = 'Answers must be at least 2 characters long';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateSupportTicket = (ticketData) => {
  const errors = {};

  if (!ticketData.name || ticketData.name.trim() === '') {
    errors.name = 'Name is required';
  }

  if (!ticketData.email || ticketData.email.trim() === '') {
    errors.email = 'Email is required';
  } else if (!validateEmail(ticketData.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!ticketData.issueType || ticketData.issueType.trim() === '') {
    errors.issueType = 'Issue type is required';
  }

  if (!ticketData.description || ticketData.description.trim() === '') {
    errors.description = 'Description is required';
  } else if (ticketData.description.trim().length < 10) {
    errors.description = 'Description must be at least 10 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateUserAgreement = (acceptedStatus) => {
  if (!acceptedStatus) {
    return {
      isValid: false,
      error: 'You must accept the user agreement to continue',
    };
  }

  return { isValid: true };
};
