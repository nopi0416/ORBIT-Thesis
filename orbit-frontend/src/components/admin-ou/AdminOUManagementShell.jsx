import { useState } from 'react';
import { ClientManagement } from './ClientManagement';
import { GeographyManagement } from './GeographyManagement';

export function AdminOUManagementShell({ roleLabel, roleType, OrganizationComponent }) {
  const [activeSection, setActiveSection] = useState('organizations');

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 shadow-lg sticky top-0 z-50">
        <div className="w-full px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{roleLabel}</h1>
          </div>

          <div className="flex items-center gap-1 bg-slate-900/40 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => setActiveSection('organizations')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                activeSection === 'organizations'
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              Organizations
            </button>
            <button
              onClick={() => setActiveSection('clients')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                activeSection === 'clients'
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              Clients
            </button>
            <button
              onClick={() => setActiveSection('geography')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                activeSection === 'geography'
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              Geography
            </button>
          </div>

          <div className="w-4" />
        </div>
      </header>

      <main className="w-full px-6 py-8">
        {activeSection === 'organizations' && <OrganizationComponent />}
        {activeSection === 'clients' && <ClientManagement role={roleType} />}
        {activeSection === 'geography' && <GeographyManagement role={roleType} />}
      </main>
    </div>
  );
}
