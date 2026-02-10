/**
 * Input Sanitizer Utility
 * Removes emojis, control characters, and potentially dangerous symbols
 * while allowing safe alphanumeric characters and common punctuation
 * 
 * Uses multiple regex patterns to catch all emoji formats including:
 * - Standard emojis
 * - Emojis with skin tone modifiers
 * - Emojis with zero-width joiners
 * - Supplementary multilingual plane characters
 */

/**
 * Comprehensive emoji and special character regex patterns
 */
const EMOJI_PATTERNS = [
  /[\u{1F300}-\u{1F9FF}]/gu,     // Emoticons, symbols, pictographs
  /[\u{2600}-\u{26FF}]/gu,       // Miscellaneous symbols
  /[\u{2700}-\u{27BF}]/gu,       // Dingbats
  /[\u{1F900}-\u{1F9FF}]/gu,     // Supplementary symbols
  /[\u{1F600}-\u{1F64F}]/gu,     // Emoticons
  /[\u{1F680}-\u{1F6FF}]/gu,     // Transport and map symbols
  /[\u{2300}-\u{23FF}]/gu,       // Miscellaneous technical
  /[\u{FE00}-\u{FE0F}]/gu,       // Variation selectors
  /[\u{200D}]/gu,                // Zero-width joiner
  /[\u{200C}]/gu,                // Zero-width non-joiner
  /[\u{200B}]/gu,                // Zero-width space
  /[\u{FEFF}]/gu,                // Zero-width no-break space
];

/**
 * Control and invalid character patterns
 */
const CONTROL_CHAR_PATTERN = /[\u{0000}-\u{001F}\u{007F}-\u{009F}]/gu;

/**
 * Aggressive emoji removal - removes ALL emoji and special Unicode
 * @param {string} input - The input string to sanitize
 * @returns {string} - Sanitized input with all emojis removed
 */
const removeAllEmoji = (input) => {
  if (!input) return '';
  
  let result = input;
  
  // Apply all emoji patterns
  EMOJI_PATTERNS.forEach(pattern => {
    result = result.replace(pattern, '');
  });
  
  // Remove control characters
  result = result.replace(CONTROL_CHAR_PATTERN, '');
  
  return result;
};

/**
 * Sanitizes input to prevent emojis and dangerous symbols
 * Allows: letters, numbers, spaces, and safe punctuation (.-_@)
 * @param {string} input - The input string to sanitize
 * @returns {string} - Sanitized input
 */
export const sanitizeInput = (input) => {
  return removeAllEmoji(input);
};

/**
 * Sanitizes email input specifically
 * Allows: letters, numbers, dots, hyphens, underscores, @ symbol
 * @param {string} input - The email input to sanitize
 * @returns {string} - Sanitized email
 */
export const sanitizeEmail = (input) => {
  if (!input) return '';
  
  // First remove all emoji and special chars
  let sanitized = removeAllEmoji(input);
  
  // Then remove invalid email characters
  sanitized = sanitized.replace(/[^\w.-@]/g, '');
  
  return sanitized;
};

/**
 * Sanitizes password input
 * Allows all printable ASCII characters (more permissive for passwords)
 * Removes only emojis and control characters
 * @param {string} input - The password input to sanitize
 * @returns {string} - Sanitized password
 */
export const sanitizePassword = (input) => {
  if (!input) return '';
  
  // Remove emojis and control characters but keep special symbols for passwords
  return removeAllEmoji(input);
};

/**
 * Sanitizes general text input (names, answers, etc.)
 * Allows: letters, numbers, spaces, and common punctuation
 * @param {string} input - The text input to sanitize
 * @returns {string} - Sanitized text
 */
export const sanitizeText = (input) => {
  if (!input) return '';
  
  // Remove emojis first
  let sanitized = removeAllEmoji(input);
  
  // Keep letters, numbers, spaces, and safe punctuation
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\.\,\-\'\"\?\!]/g, '');
  
  return sanitized;
};

/**
 * Sanitizes OTP input (numbers only)
 * @param {string} input - The OTP input to sanitize
 * @returns {string} - Sanitized OTP (numbers only)
 */
export const sanitizeOTP = (input) => {
  if (!input) return '';
  
  // Remove emojis first, then keep only numbers
  const cleaned = removeAllEmoji(input);
  return cleaned.replace(/[^0-9]/g, '');
};

/**
 * Checks if input contains any emoji or invalid characters
 * @param {string} input - The input to check
 * @returns {boolean} - True if input contains emoji/invalid chars
 */
export const containsEmoji = (input) => {
  if (!input) return false;
  return input !== removeAllEmoji(input);
};

/**
 * Paste handler - sanitizes pasted content
 * @param {ClipboardEvent} event - The paste event
 * @param {Function} sanitizeFn - The sanitization function to use
 */
export const handlePaste = (event, sanitizeFn = sanitizeInput) => {
  event.preventDefault();
  const pastedText = event.clipboardData.getData('text/plain');
  const sanitized = sanitizeFn(pastedText);
  
  // Insert sanitized text at cursor position
  const target = event.target;
  const start = target.selectionStart;
  const end = target.selectionEnd;
  const text = target.value;
  const newText = text.substring(0, start) + sanitized + text.substring(end);
  
  target.value = newText;
  target.selectionStart = target.selectionEnd = start + sanitized.length;
  
  // Trigger change event
  target.dispatchEvent(new Event('input', { bubbles: true }));
};

export default {
  sanitizeInput,
  sanitizeEmail,
  sanitizePassword,
  sanitizeText,
  sanitizeOTP,
  containsEmoji,
  handlePaste,
  removeAllEmoji,
};
