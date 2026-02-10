import { useAuth } from '../../context/AuthContext';
import { AdminOUManagementShell } from '../../components/admin-ou/AdminOUManagementShell';
import { CompanyAdminDashboard } from '../../components/admin-ou/CompanyAdminDashboard';
import { SystemAdminDashboard } from '../../components/admin-ou/SystemAdminDashboard';

export default function AdminOUManagement() {
  const { user } = useAuth();
  const normalizedRole = user?.role?.toLowerCase().trim() || '';
  const normalizedKey = normalizedRole.replace(/\s+/g, '_');
  const isSystemAdmin =
    ['admin', 'super_admin', 'system_admin'].includes(normalizedKey)
    || normalizedRole.includes('system')
    || normalizedRole.includes('super');
  const isCompanyAdmin =
    ['company_admin'].includes(normalizedKey)
    || normalizedRole.includes('company admin');

  if (!user) {
    return null;
  }

  if (isSystemAdmin) {
    return (
      <AdminOUManagementShell
        roleLabel="System Administrator"
        roleType="system"
        OrganizationComponent={SystemAdminDashboard}
      />
    );
  }

  if (isCompanyAdmin) {
    return (
      <AdminOUManagementShell
        roleLabel="Company Administrator"
        roleType="company"
        OrganizationComponent={CompanyAdminDashboard}
      />
    );
  }

  return (
    <div className="p-8 text-sm text-muted-foreground">
      Access denied. This area is available to system and company admins only.
    </div>
  );
}
