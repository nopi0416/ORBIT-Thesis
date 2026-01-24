import React from 'react';
import { AuthGuard } from '../components/AuthGuard';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from '../components/Sidebar';
import { DemoUserSwitcher } from '../components/DemoUserSwitcher';

export default function DashboardLayout({ children }) {
  const { user } = useAuth();
  const isAdminUser = user?.role === "admin";

  return (
    <AuthGuard requireAuth>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar with proper z-index */}
        <div className="relative z-20 flex-shrink-0">
          <Sidebar userRole={user?.role || "requestor"} />
        </div>

        {/* Main content area */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Demo User Switcher - Fixed top right (Only for non-admin users) */}
          {!isAdminUser && (
            <div className="fixed top-4 right-4 z-30">
              <DemoUserSwitcher />
            </div>
          )}
          {/* Base gradient background */}
          <div
            className="fixed inset-0 z-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.12 0.04 270) 0%, oklch(0.18 0.06 280) 50%, oklch(0.22 0.08 290) 100%)",
            }}
          />

          {/* Large pink glow - top right */}
          <div
            className="fixed z-0 pointer-events-none"
            style={{
              top: "15%",
              right: "10%",
              width: "650px",
              height: "650px",
              background: "radial-gradient(circle, oklch(0.42 0.30 330 / 0.4) 0%, transparent 70%)",
              filter: "blur(85px)",
            }}
          />

          {/* Large yellow glow - center left */}
          <div
            className="fixed z-0 pointer-events-none"
            style={{
              top: "40%",
              left: "15%",
              width: "600px",
              height: "600px",
              background: "radial-gradient(circle, oklch(0.62 0.24 75 / 0.42) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />

          {/* Medium pink glow - bottom center */}
          <div
            className="fixed z-0 pointer-events-none"
            style={{
              bottom: "10%",
              left: "45%",
              width: "500px",
              height: "500px",
              background: "radial-gradient(circle, oklch(0.40 0.28 340 / 0.35) 0%, transparent 70%)",
              filter: "blur(75px)",
            }}
          />

          {/* Medium yellow glow - top center */}
          <div
            className="fixed z-0 pointer-events-none"
            style={{
              top: "20%",
              left: "50%",
              width: "520px",
              height: "520px",
              background: "radial-gradient(circle, oklch(0.60 0.22 68 / 0.38) 0%, transparent 70%)",
              filter: "blur(75px)",
            }}
          />

          {/* Medium pink glow - middle left */}
          <div
            className="fixed z-0 pointer-events-none"
            style={{
              top: "50%",
              left: "8%",
              width: "480px",
              height: "480px",
              background: "radial-gradient(circle, oklch(0.38 0.26 325 / 0.32) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />

          {/* Medium yellow glow - bottom right */}
          <div
            className="fixed z-0 pointer-events-none"
            style={{
              bottom: "15%",
              right: "20%",
              width: "480px",
              height: "480px",
              background: "radial-gradient(circle, oklch(0.64 0.26 80 / 0.4) 0%, transparent 70%)",
              filter: "blur(78px)",
            }}
          />

          {/* Small pink accent - top left */}
          <div
            className="fixed z-0 pointer-events-none"
            style={{
              top: "10%",
              left: "25%",
              width: "300px",
              height: "300px",
              background: "radial-gradient(circle, oklch(0.44 0.24 335 / 0.25) 0%, transparent 65%)",
              filter: "blur(60px)",
            }}
          />

          {/* Small yellow accent - middle right */}
          <div
            className="fixed z-0 pointer-events-none"
            style={{
              top: "45%",
              right: "15%",
              width: "320px",
              height: "320px",
              background: "radial-gradient(circle, oklch(0.58 0.20 72 / 0.3) 0%, transparent 65%)",
              filter: "blur(62px)",
            }}
          />

          {/* Small pink accent - bottom left */}
          <div
            className="fixed z-0 pointer-events-none"
            style={{
              bottom: "25%",
              left: "30%",
              width: "280px",
              height: "280px",
              background: "radial-gradient(circle, oklch(0.40 0.22 320 / 0.22) 0%, transparent 60%)",
              filter: "blur(55px)",
            }}
          />

          {/* Small yellow accent - top right */}
          <div
            className="fixed z-0 pointer-events-none"
            style={{
              top: "30%",
              right: "35%",
              width: "280px",
              height: "280px",
              background: "radial-gradient(circle, oklch(0.56 0.18 65 / 0.28) 0%, transparent 60%)",
              filter: "blur(58px)",
            }}
          />

          {/* Small pink accent - center */}
          <div
            className="fixed z-0 pointer-events-none"
            style={{
              top: "60%",
              left: "55%",
              width: "300px",
              height: "300px",
              background: "radial-gradient(circle, oklch(0.42 0.26 328 / 0.28) 0%, transparent 60%)",
              filter: "blur(60px)",
            }}
          />

          {/* Small yellow accent - bottom center-left */}
          <div
            className="fixed z-0 pointer-events-none"
            style={{
              bottom: "35%",
              left: "40%",
              width: "300px",
              height: "300px",
              background: "radial-gradient(circle, oklch(0.60 0.22 78 / 0.32) 0%, transparent 60%)",
              filter: "blur(60px)",
            }}
          />

          {/* Content */}
          <div className="relative z-10 flex-1 overflow-y-auto">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}