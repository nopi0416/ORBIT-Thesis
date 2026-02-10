import { useAuth } from '../../context/AuthContext';
import { AdminOUManagementShell } from '../../components/admin-ou/AdminOUManagementShell';
import { CompanyAdminDashboard } from '../../components/admin-ou/CompanyAdminDashboard';
import { SystemAdminDashboard } from '../../components/admin-ou/SystemAdminDashboard';

export default function AdminOUManagement() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  if (user.role === 'system_admin') {
    return (
      <AdminOUManagementShell
        roleLabel="System Administrator"
        roleType="system"
        OrganizationComponent={SystemAdminDashboard}
      />
    );
  }

  if (user.role === 'company_admin') {
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
