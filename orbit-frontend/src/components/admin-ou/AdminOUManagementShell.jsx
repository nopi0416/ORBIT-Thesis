import { ClientManagement } from './ClientManagement';
import { GeographyManagement } from './GeographyManagement';

export function AdminOUManagementShell({ roleLabel, roleType, OrganizationComponent }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 shadow-lg sticky top-0 z-50">
        <div className="w-full px-6 py-4 flex items-center">
          <div>
            <h1 className="text-xl font-bold text-white">{roleLabel} - OU Management</h1>
            <p className="text-sm text-white/80">Manage all organizational data in one place</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden">
          <OrganizationComponent />
          <ClientManagement role={roleType} />
          <GeographyManagement role={roleType} />
        </div>
      </main>
    </div>
  );
}
