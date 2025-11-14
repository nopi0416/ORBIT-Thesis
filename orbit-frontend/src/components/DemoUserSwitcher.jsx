import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { User } from './icons';
import { useAuth } from '../context/AuthContext';

const DEMO_USERS = [
  {
    id: "requestor",
    name: "John Employee",
    role: "requestor",
    department: "IT",
    label: "Requestor/Employee"
  },
  {
    id: "l1",
    name: "Sarah Manager",
    role: "l1", 
    department: "IT",
    label: "L1 Approver"
  },
  {
    id: "l2",
    name: "Mike Director",
    role: "l2",
    department: "Operations", 
    label: "L2 Approver"
  },
  {
    id: "l3",
    name: "Lisa VP",
    role: "l3",
    department: "Executive",
    label: "L3 Approver"
  },
  {
    id: "payroll",
    name: "Emma Payroll",
    role: "payroll",
    department: "Finance",
    label: "Payroll Staff"
  }
];

export function DemoUserSwitcher() {
  const { user, setUser } = useAuth();

  const handleUserChange = (userId) => {
    const selectedUser = DEMO_USERS.find(u => u.id === userId);
    if (selectedUser) {
      setUser(selectedUser);
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
          <Select value={user?.id || "requestor"} onValueChange={handleUserChange}>
            <SelectTrigger className="bg-slate-700 border-gray-300 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-gray-300">
              {DEMO_USERS.map((demoUser) => (
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
      {user && (
        <div className="mt-2 text-xs text-gray-400">
          <span>Department: {user.department}</span>
        </div>
      )}
    </div>
  );
}