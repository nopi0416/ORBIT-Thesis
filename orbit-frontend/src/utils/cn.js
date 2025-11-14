/**
 * Utility function to combine class names
 * Simplified version that works without external dependencies
 */
export function cn(...classes) {
  return classes
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}