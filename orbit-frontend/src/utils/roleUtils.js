/**
 * Normalize role string to lowercase standard format
 * Handles various backend formats: "L1_APPROVER", "L1 Approver", "Requestor", etc.
 */
export const normalizeRole = (role) => {
  const normalized = String(role ?? 'requestor').trim().toLowerCase();
  if (normalized.includes('requestor')) return 'requestor';
  if (normalized.includes('l1')) return 'l1';
  if (normalized.includes('l2')) return 'l2';
  if (normalized.includes('l3')) return 'l3';
  if (normalized.includes('payroll')) return 'payroll';
  if (normalized.includes('admin')) return 'admin';
  return normalized;
};

/**
 * Resolve user role from user object by checking multiple possible field names
 * Returns normalized role: 'requestor', 'l1', 'l2', 'l3', 'payroll', 'admin'
 */
export const resolveUserRole = (user) => {
  const candidates = [
    user?.role_name,
    user?.roleName,
    user?.user_role,
    user?.userRole,
    user?.role,
    user?.userType,
  ].filter(Boolean);

  const normalizedCandidates = candidates.map((candidate) => normalizeRole(candidate));
  
  // Priority order: payroll > l1 > l2 > l3 > admin > requestor
  if (normalizedCandidates.includes('payroll')) return 'payroll';
  if (normalizedCandidates.includes('l1')) return 'l1';
  if (normalizedCandidates.includes('l2')) return 'l2';
  if (normalizedCandidates.includes('l3')) return 'l3';
  if (normalizedCandidates.includes('admin')) return 'admin';
  if (normalizedCandidates.includes('requestor')) return 'requestor';
  
  // Fallback to first candidate or 'requestor'
  return normalizedCandidates[0] || 'requestor';
};

/**
 * Get display name for role
 */
export const getRoleDisplayName = (role) => {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case 'l1': return 'L1 Approver';
    case 'l2': return 'L2 Approver';
    case 'l3': return 'L3 Approver';
    case 'payroll': return 'Payroll Staff';
    case 'admin': return 'Administrator';
    default: return 'Requestor';
  }
};
