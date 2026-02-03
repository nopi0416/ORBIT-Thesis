/**
 * Role-Based Routing Utility
 * Determines the correct dashboard route based on user role
 */

/**
 * Get the dashboard route based on user role
 * @param {string} role - User role (L1, L2, L3, Requestor, Admin, Payroll)
 * @returns {string} - Route path for the user's dashboard
 */
export const getDashboardRoute = (role) => {
  if (!role) return '/dashboard'; // Default fallback

  const roleMap = {
    // Approval levels (L1, L2, L3)
    'l1': '/dashboard',
    'l2': '/dashboard',
    'l3': '/dashboard',
    'L1': '/dashboard',
    'L2': '/dashboard',
    'L3': '/dashboard',
    
    // Requestor role
    'requestor': '/dashboard',
    'Requestor': '/dashboard',
    
    // Admin role
    'admin': '/admin/dashboard',
    'Admin': '/admin/dashboard',
    
    // Payroll role
    'payroll': '/dashboard',
    'Payroll': '/dashboard',
  };

  // Get route from map, default to /dashboard if role not found
  return roleMap[role] || '/dashboard';
};

/**
 * Get the sidebar navigation items based on user role
 * Used by Sidebar component to show role-specific menu items
 * @param {string} role - User role
 * @returns {array} - Array of navigation items
 */
export const getNavigationItems = (role) => {
  const normalizedRole = role?.toLowerCase() || 'requestor';

  // Base items available to all users
  const baseItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: 'LayoutDashboard',
      roles: ['l1', 'l2', 'l3', 'requestor', 'payroll'],
    },
    {
      label: 'Budget Configuration',
      href: '/budget-configuration',
      icon: 'Settings',
      roles: ['l1', 'l2', 'l3', 'requestor', 'payroll'],
    },
    {
      label: 'Budget Requests',
      href: '/approval',
      icon: 'FileText',
      roles: ['l1', 'l2', 'l3', 'requestor', 'payroll'],
    },
    {
      label: 'Organization',
      href: '/organization',
      icon: 'Users',
      roles: ['l1', 'l2', 'l3', 'requestor', 'payroll'],
    },
  ];

  // Admin-specific items
  const adminItems = [
    {
      label: 'Admin Dashboard',
      href: '/admin/dashboard',
      icon: 'Shield',
      roles: ['admin'],
    },
    {
      label: 'Users',
      href: '/admin/users',
      icon: 'Users',
      roles: ['admin'],
    },
    {
      label: 'Organizations',
      href: '/admin/organizations',
      icon: 'Building',
      roles: ['admin'],
    },
    {
      label: 'Logs',
      href: '/admin/logs',
      icon: 'FileText',
      roles: ['admin'],
    },
    {
      label: 'Admin Settings',
      href: '/admin/settings',
      icon: 'Settings',
      roles: ['admin'],
    },
  ];

  // Combine and filter items based on user role
  const allItems = [...baseItems, ...adminItems];
  
  return allItems.filter(item => 
    item.roles.includes(normalizedRole)
  );
};

/**
 * Check if user can access a specific route
 * @param {string} userRole - User's role
 * @param {string} route - Route to check access for
 * @returns {boolean} - Whether user can access the route
 */
export const canAccessRoute = (userRole, route) => {
  const normalizedRole = userRole?.toLowerCase() || 'requestor';

  // Define route access by role
  const routeAccess = {
    '/dashboard': ['l1', 'l2', 'l3', 'requestor', 'payroll'],
    '/budget-configuration': ['l1', 'l2', 'l3', 'requestor', 'payroll'],
    '/approval': ['l1', 'l2', 'l3', 'requestor', 'payroll'],
    '/organization': ['l1', 'l2', 'l3', 'requestor', 'payroll'],
    '/profile': ['l1', 'l2', 'l3', 'requestor', 'payroll', 'admin'],
    '/admin': ['admin'],
    '/admin/dashboard': ['admin'],
    '/admin/users': ['admin'],
    '/admin/organizations': ['admin'],
    '/admin/logs': ['admin'],
    '/admin/settings': ['admin'],
  };

  const allowedRoles = routeAccess[route] || [];
  return allowedRoles.includes(normalizedRole);
};
