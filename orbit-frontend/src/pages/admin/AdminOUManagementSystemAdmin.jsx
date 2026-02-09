import { AdminOUManagementShell } from '../../components/admin-ou/AdminOUManagementShell';
import { SystemAdminDashboard } from '../../components/admin-ou/SystemAdminDashboard';

export default function AdminOUManagementSystemAdmin() {
  return (
    <AdminOUManagementShell
      roleLabel="System Administrator"
      roleType="system"
      OrganizationComponent={SystemAdminDashboard}
    />
  );
}
