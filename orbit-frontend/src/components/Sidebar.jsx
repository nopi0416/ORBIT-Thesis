import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../utils/cn';
import { LayoutDashboard, FileText, Building2, User, LogOut } from '../components/icons';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';

export function Sidebar({ userRole }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const normalizedRole = (userRole || '').toLowerCase();
  const isAdmin = normalizedRole.includes('admin');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Budget Configuration",
      href: "/budget-configuration",
      icon: FileText,
    },
    {
      name: "Approval Management",
      href: "/approval",
      icon: FileText,
    },
    {
      name: "Organization",
      href: "/organization",
      icon: Building2,
    },
    {
      name: "Profile",
      href: "/profile",
      icon: User,
    },
  ];

  const adminNavigation = [
    {
      name: "Admin Dashboard",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Admin Users",
      href: "/admin/users",
      icon: FileText,
    },
    {
      name: "Admin Organizations",
      href: "/admin/organizations",
      icon: Building2,
    },
    {
      name: "Admin Logs",
      href: "/admin/logs",
      icon: FileText,
    },
    {
      name: "Admin Settings",
      href: "/admin/settings",
      icon: User,
    },
  ];

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative flex flex-col border-r border-white/10 transition-all duration-300 h-screen",
        isHovered ? "w-64" : "w-16",
      )}
      style={{
        background: "linear-gradient(to bottom, oklch(0.15 0.05 270) 0%, oklch(0.25 0.08 280) 100%)",
      }}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        {isHovered && (
          <Link to={isAdmin ? "/admin/dashboard" : "/dashboard"} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-coral">
              <span className="text-lg font-bold text-white">O</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">ORBIT</span>
              <span className="text-xs text-white/60">Budget Intelligence</span>
            </div>
          </Link>
        )}
        {!isHovered && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-coral">
            <span className="text-lg font-bold text-white">O</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {(isAdmin ? adminNavigation : navigation).map((item) => {
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "bg-primary/20 text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
              title={!isHovered ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {isHovered && <span>{item.name}</span>}
            </Link>
          );
        })}

      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-3">
        {/* User Info */}
        {isHovered && user && (
          <div className="mb-3 rounded-lg bg-white/5 px-3 py-2">
            <p className="text-xs font-medium text-white/50">Signed in as</p>
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="text-xs capitalize text-primary">
              {isAdmin
                ? (userRole || "Admin")
                : userRole === "l1"
                  ? "L1 Approver"
                  : userRole === "l2"
                    ? "L2 Approver"
                    : userRole === "l3"
                      ? "L3 Approver"
                      : userRole === "payroll"
                        ? "Payroll Staff"
                        : "Requestor"}
            </p>
          </div>
        )}

        {/* Logout Button */}
        <Button
          variant="ghost"
          size={!isHovered ? "icon" : "default"}
          onClick={handleLogout}
          className={cn(
            "w-full justify-start text-red-400 hover:bg-red-500/10 hover:text-red-300",
            !isHovered && "justify-center",
          )}
          title={!isHovered ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {isHovered && <span className="ml-3">Logout</span>}
        </Button>
      </div>
    </div>
  );
}