import { useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { User } from './icons';
import { useAuth } from '../context/AuthContext';

const demoUsers = [
  {
    id: 'demo-system-admin',
    name: 'System Admin User',
    email: 'system.admin@orbit.com',
    role: 'system_admin',
    label: 'System Admin',
  },
  {
    id: 'demo-company-admin',
    name: 'Company Admin User',
    email: 'company.admin@orbit.com',
    role: 'company_admin',
    label: 'Company Admin',
  },
];

export function DemoUserSwitcher() {
  const { user, setUser } = useAuth();

  useEffect(() => {
    if (!user) {
      setUser(demoUsers[0]);
      localStorage.setItem('demoUser', JSON.stringify(demoUsers[0]));
    }
  }, [user, setUser]);

  const handleUserChange = (userId) => {
    const selectedUser = demoUsers.find((entry) => entry.id === userId);
    if (selectedUser) {
      setUser(selectedUser);
      localStorage.setItem('demoUser', JSON.stringify(selectedUser));
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-400" />
          <Label className="text-white text-sm font-medium">Demo User:</Label>
        </div>
        <div className="min-w-[180px]">
          <Select value={user?.id || ''} onValueChange={handleUserChange}>
            <SelectTrigger className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-gray-300">
              {demoUsers.map((demoUser) => (
                <SelectItem key={demoUser.id} value={demoUser.id} className="text-white focus:bg-slate-700">
                  <div className="flex flex-col">
                    <span className="font-medium">{demoUser.name}</span>
                    <span className="text-xs text-gray-400">{demoUser.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
