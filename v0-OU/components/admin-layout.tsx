'use client';

import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Building2, Users, UserCheck } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
  role: string;
  onChangeRole: () => void;
}

export function AdminLayout({ children, role, onChangeRole }: AdminLayoutProps) {
  const [activeSection, setActiveSection] = useState<'organizations' | 'clients' | 'members'>('organizations');

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <h1 className="text-lg font-bold text-foreground mb-1">Admin Panel</h1>
          <p className="text-xs text-muted-foreground">{role}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveSection('organizations')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeSection === 'organizations'
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span className="text-sm font-medium">Organization Management</span>
          </button>

          <button
            onClick={() => setActiveSection('clients')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeSection === 'clients'
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span className="text-sm font-medium">Client Management</span>
          </button>

          <button
            onClick={() => setActiveSection('members')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeSection === 'members'
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">Member Management</span>
          </button>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-2">
          <Button
            onClick={onChangeRole}
            variant="outline"
            className="w-full justify-start gap-2 border-border text-foreground bg-transparent"
          >
            <LogOut className="w-4 h-4" />
            Change Role
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children && typeof children === 'object' && 'type' in children ? (
            // If children is a React component, render it with the activeSection prop
            <div data-section={activeSection}>{children}</div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}
