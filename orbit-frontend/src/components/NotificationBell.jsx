import React, { useState } from 'react';
import { Bell } from './icons';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useAuth } from '../context/AuthContext';
import { resolveUserRole } from '../utils/roleUtils';

export function NotificationBell() {
  const { user } = useAuth();
  const userRole = resolveUserRole(user);

  // Mock notifications - in real app, fetch from API based on userRole/ID
  const [notifications, setNotifications] = useState([
    { 
      id: 1, 
      title: 'Budget Approved', 
      message: 'Budget Q1 2024 has been approved.', 
      time: '2 mins ago',
      roles: ['requestor', 'l1'] // Example filtering
    },
    { 
      id: 2, 
      title: 'New Request', 
      message: 'New approval request available.', 
      time: '1 hour ago',
      roles: ['l1', 'l2', 'payroll']
    }
  ]);

  // Filter notifications logic (placeholder)
  const visibleNotifications = notifications; 
  // In a real implementation: notifications.filter(n => n.roles.includes(userRole));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-10 w-10 rounded-full text-white hover:bg-white/10">
          <Bell className="h-5 w-5" />
          {visibleNotifications.length > 0 && (
            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-slate-900" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-slate-800 border-slate-700 shadow-xl" align="end">
        <Card className="border-0 bg-transparent text-white">
          <CardHeader className="py-3 px-4 border-b border-slate-700/50">
            <CardTitle className="text-sm font-semibold text-white">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[300px] overflow-y-auto custom-scrollbar">
            {visibleNotifications.length > 0 ? (
              <div className="flex flex-col divide-y divide-slate-700/50">
                {visibleNotifications.map((notif) => (
                  <div key={notif.id} className="p-4 hover:bg-white/5 cursor-pointer transition-colors">
                    <div className="text-sm font-medium text-white mb-1">{notif.title}</div>
                    <div className="text-xs text-slate-400 mb-2 leading-relaxed">{notif.message}</div>
                    <div className="text-[10px] text-slate-500 font-medium">{notif.time}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-slate-500">
                No new notifications
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
