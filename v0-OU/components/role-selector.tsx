'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ShieldHalfIcon as ShieldAdmin, Building2 } from 'lucide-react';

interface RoleSelectorProps {
  onSelectRole: (role: 'system' | 'company') => void;
}

export function RoleSelector({ onSelectRole }: RoleSelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">OU Management</h1>
          <p className="text-muted-foreground">Select your admin role to continue</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* System Admin Card */}
          <Card className="bg-card border-border hover:border-primary/50 transition-all cursor-pointer group"
            onClick={() => onSelectRole('system')}>
            <div className="p-8 flex flex-col items-center text-center">
              <div className="mb-4 p-4 bg-primary/10 rounded-full">
                <ShieldAdmin className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">System Admin</h2>
              <p className="text-muted-foreground mb-6 text-sm">
                Full control over organizational hierarchy
              </p>
              <ul className="text-left text-sm text-muted-foreground space-y-2 mb-6 w-full">
                <li className="flex items-start">
                  <span className="text-primary mr-2">✓</span>
                  <span>Create parent OUs (Company)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">✓</span>
                  <span>Create child OUs (Departments)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">✓</span>
                  <span>Manage nested structure</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">✓</span>
                  <span>Unlimited OU creation</span>
                </li>
              </ul>
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/50 transition-all">
                Continue as System Admin
              </Button>
            </div>
          </Card>

          {/* Company Admin Card */}
          <Card className="bg-card border-border hover:border-secondary/50 transition-all cursor-pointer group"
            onClick={() => onSelectRole('company')}>
            <div className="p-8 flex flex-col items-center text-center">
              <div className="mb-4 p-4 bg-secondary/10 rounded-full">
                <Building2 className="w-12 h-12 text-secondary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Company Admin</h2>
              <p className="text-muted-foreground mb-6 text-sm">
                Create and manage departments only
              </p>
              <ul className="text-left text-sm text-muted-foreground space-y-2 mb-6 w-full">
                <li className="flex items-start">
                  <span className="text-secondary mr-2">✓</span>
                  <span>Create departments</span>
                </li>
                <li className="flex items-start">
                  <span className="text-secondary mr-2">✓</span>
                  <span>No nested creation</span>
                </li>
                <li className="flex items-start">
                  <span className="text-secondary mr-2">✓</span>
                  <span>Manage department members</span>
                </li>
                <li className="flex items-start">
                  <span className="text-secondary mr-2">✓</span>
                  <span>Limited to company hierarchy</span>
                </li>
              </ul>
              <Button className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground group-hover:shadow-lg group-hover:shadow-secondary/50 transition-all">
                Continue as Company Admin
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
