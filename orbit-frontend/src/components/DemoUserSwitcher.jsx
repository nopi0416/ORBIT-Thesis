import React, { useEffect, useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { User } from './icons';
import { useAuth } from '../context/AuthContext';
import { getUsersList } from '../services/budgetConfigService';

const mapRoleFromNames = (roleNames = []) => {
  const normalized = roleNames.map((role) => String(role || '').toUpperCase());
  if (normalized.includes('L3_APPROVER')) return 'l3';
  if (normalized.includes('L2_APPROVER')) return 'l2';
  if (normalized.includes('L1_APPROVER')) return 'l1';
  if (normalized.includes('PAYROLL')) return 'payroll';
  if (normalized.includes('REQUESTOR')) return 'requestor';
  return 'requestor';
};

const getRoleLabel = (role) => {
  switch (role) {
    case 'l1':
      return 'L1 Approver';
    case 'l2':
      return 'L2 Approver';
    case 'l3':
      return 'L3 Approver';
    case 'payroll':
      return 'Payroll Staff';
    default:
      return 'Requestor/Employee';
  }
};

export function DemoUserSwitcher() {
  const { user, setUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = useMemo(() => localStorage.getItem('authToken') || '', []);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getUsersList(token);
        const formatted = (data || []).map((entry) => {
          const fullName = entry.full_name || `${entry.first_name || ''} ${entry.last_name || ''}`.trim();
          const role = mapRoleFromNames(entry.roles || []);
          return {
            id: entry.user_id,
            name: fullName || entry.email || 'Unnamed User',
            email: entry.email || '',
            role,
            department: entry.department || '—',
            label: getRoleLabel(role),
          };
        });
        setUsers(formatted);

        if (!user && formatted.length > 0) {
          const defaultUser = formatted.find((item) => item.role === 'requestor') || formatted[0];
          setUser(defaultUser);
          localStorage.setItem('demoUser', JSON.stringify(defaultUser));
        }
      } catch (err) {
        setError(err.message || 'Failed to load users');
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [token]);

  const handleUserChange = (userId) => {
    const selectedUser = users.find(u => u.id === userId);
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
          <Select value={user?.id || ""} onValueChange={handleUserChange}>
            <SelectTrigger className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
              <SelectValue placeholder={loading ? "Loading users..." : "Select user"} />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-gray-300">
              {error ? (
                <div className="px-3 py-2 text-xs text-red-300">{error}</div>
              ) : users.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-400">No users available</div>
              ) : (
                users.map((demoUser) => (
                  <SelectItem key={demoUser.id} value={demoUser.id} className="text-white focus:bg-slate-700">
                    <div className="flex flex-col">
                      <span className="font-medium">{demoUser.name}</span>
                      <span className="text-xs text-gray-400">{demoUser.label}</span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
      {user && (
        <div className="mt-2 text-xs text-gray-400">
          <span>Department: {user.department || '—'}</span>
        </div>
      )}
    </div>
  );
}