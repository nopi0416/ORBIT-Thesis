'use client';

import { useState } from 'react';
import { SystemAdminDashboard } from '@/components/system-admin-dashboard';
import { CompanyAdminDashboard } from '@/components/company-admin-dashboard';
import { ClientManagement } from '@/components/client-management';
import { GeographyManagement } from '@/components/geography-management';
import { RoleSelector } from '@/components/role-selector';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

type AdminRole = 'system' | 'company' | null;
type Section = 'organizations' | 'clients' | 'geography';

export default function Page() {
  const [role, setRole] = useState<AdminRole>(null);
  const [activeSection, setActiveSection] = useState<Section>('organizations');

  if (role === null) {
    return <RoleSelector onSelectRole={setRole} />;
  }

  const roleName = role === 'system' ? 'System Administrator' : 'Company Administrator';

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{roleName}</h1>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg">
            <button
              onClick={() => setActiveSection('organizations')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                activeSection === 'organizations'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              Organizations
            </button>
            <button
              onClick={() => setActiveSection('clients')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                activeSection === 'clients'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              Clients
            </button>
            <button
              onClick={() => setActiveSection('geography')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                activeSection === 'geography'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              Geography
            </button>
          </div>

          {/* Change Role */}
          <Button
            onClick={() => setRole(null)}
            variant="outline"
            size="sm"
            className="gap-2 border-border bg-transparent text-foreground hover:bg-muted"
          >
            <LogOut className="w-4 h-4" />
            Change Role
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeSection === 'organizations' &&
          (role === 'system' ? (
            <SystemAdminDashboard />
          ) : (
            <CompanyAdminDashboard />
          ))}
        {activeSection === 'clients' && (
          <ClientManagement role={role} />
        )}
        {activeSection === 'geography' && (
          <GeographyManagement role={role} />
        )}
      </main>
    </div>
  );
}
