'use client';

import { Button } from '@/components/ui/button';
import { LogOut, Building2, Users, UserCheck } from 'lucide-react';

interface SidebarProps {
  role: string;
  activeSection: 'organizations' | 'clients' | 'members';
  onSelectSection: (section: 'organizations' | 'clients' | 'members') => void;
  onChangeRole: () => void;
}

export function Sidebar({ role, activeSection, onSelectSection, onChangeRole }: SidebarProps) {
  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen sticky top-0">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h1 className="text-lg font-bold text-foreground mb-1">Admin Panel</h1>
        <p className="text-xs text-muted-foreground truncate">{role}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <button
          onClick={() => onSelectSection('organizations')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            activeSection === 'organizations'
              ? 'bg-primary text-primary-foreground'
              : 'text-foreground hover:bg-muted'
          }`}
        >
          <Building2 className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">Organization Mgmt</span>
        </button>

        <button
          onClick={() => onSelectSection('clients')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            activeSection === 'clients'
              ? 'bg-primary text-primary-foreground'
              : 'text-foreground hover:bg-muted'
          }`}
        >
          <UserCheck className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">Client Mgmt</span>
        </button>

        <button
          onClick={() => onSelectSection('members')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            activeSection === 'members'
              ? 'bg-primary text-primary-foreground'
              : 'text-foreground hover:bg-muted'
          }`}
        >
          <Users className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">Member Mgmt</span>
        </button>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-2">
        <Button
          onClick={onChangeRole}
          variant="outline"
          className="w-full justify-start gap-2 border-border text-foreground bg-transparent hover:bg-muted text-sm"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Change Role
        </Button>
      </div>
    </aside>
  );
}
