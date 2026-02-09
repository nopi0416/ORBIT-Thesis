import { AdminOUManagementShell } from '../../components/admin-ou/AdminOUManagementShell';
import { CompanyAdminDashboard } from '../../components/admin-ou/CompanyAdminDashboard';

export default function AdminOUManagementCompanyAdmin() {
  return (
    <AdminOUManagementShell
      roleLabel="Company Administrator"
      roleType="company"
      OrganizationComponent={CompanyAdminDashboard}
    />
  );
}
