/**
 * User Mapping - Maps user identifiers to UUIDs
 * 
 * TEMPORARY: This is a placeholder for when real user management is implemented.
 * Once you have a proper user system, replace this with actual database lookups.
 */

export const userMapping = {
  // Approvers and backup approvers
  "john-smith": "11111111-1111-1111-1111-111111111111",
  "sarah-jones": "22222222-2222-2222-2222-222222222222",
  "michael-johnson": "33333333-3333-3333-3333-333333333333",
  "emily-davis": "44444444-4444-4444-4444-444444444444",
  "david-brown": "55555555-5555-5555-5555-555555555555",
  "kevin-wong": "66666666-6666-6666-6666-666666666666",
  
  // Add more users as needed
  "jane-doe": "77777777-7777-7777-7777-777777777777",
  "alex-smith": "88888888-8888-8888-8888-888888888888",
  "maria-garcia": "99999999-9999-9999-9999-999999999999",
};

/**
 * Convert user identifier to UUID
 * @param {string} userIdentifier - User name or ID (e.g., "john-smith" or UUID)
 * @returns {string|null} - UUID or null if not found
 */
export const getUserUUID = (userIdentifier) => {
  if (!userIdentifier) return null;
  
  // Check if it's already a UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(userIdentifier)) {
    return userIdentifier;
  }
  
  // Check if it's in the mapping
  if (userMapping[userIdentifier]) {
    return userMapping[userIdentifier];
  }
  
  // If not found, return null (will cause validation error)
  return null;
};

/**
 * Validate user identifier
 * @param {string} userIdentifier - User name or ID
 * @returns {boolean} - True if valid UUID or mapped user
 */
export const isValidUser = (userIdentifier) => {
  if (!userIdentifier) return false;
  return getUserUUID(userIdentifier) !== null;
};

/**
 * Reverse mapping: Convert UUID back to user name
 */
const reverseUserMapping = Object.entries(userMapping).reduce((acc, [name, uuid]) => {
  acc[uuid] = name;
  return acc;
}, {});

/**
 * Get user name from UUID
 * @param {string} uuid - User UUID
 * @returns {string} - User name or the UUID if not found
 */
export const getUserNameFromUUID = (uuid) => {
  if (!uuid) return "Not assigned";
  return reverseUserMapping[uuid] || uuid;
};

/**
 * Get user details from UUID
 * @param {string} uuid - User UUID
 * @returns {object} - Object with name, email, and uuid
 */
export const getUserDetailsFromUUID = (uuid) => {
  const name = getUserNameFromUUID(uuid);
  const email = name === "Not assigned" ? "N/A" : `${name.replace(/-/g, ".")}@company.com`;
  
  return {
    uuid,
    name,
    email,
  };
};

export default { userMapping, getUserUUID, isValidUser, getUserNameFromUUID, getUserDetailsFromUUID };
