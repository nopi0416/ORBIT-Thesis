import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Lock, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff, Check, X } from '../components/icons';
import { getDashboardRoute } from '../utils/roleRouting';
import { sanitizePassword, handlePaste, handleRestrictedKeyDown } from '../utils/inputSanitizer';

export default function FirstTimePassword() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const userId = searchParams.get('userId');
  const role = searchParams.get('role');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!email || !role || !userId) {
    navigate('/login');
    return null;
  }

  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const isPasswordValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSymbol && passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Please ensure all password requirements are met');
      return;
    }

    if (!currentPassword) {
      setError('Please enter your current password');
      return;
    }

    console.log('[FIRST TIME PASSWORD] Password validated, storing in session and redirecting to security questions');
    
    // Store validated password and new password in sessionStorage for use in security questions page
    sessionStorage.setItem('firstTimePassword', JSON.stringify({
      currentPassword,
      newPassword,
    }));
    
    // Redirect to security questions page with flag to indicate coming from password change
    navigate(`/security-questions?email=${encodeURIComponent(email)}&userId=${encodeURIComponent(userId)}&role=${encodeURIComponent(role)}&fromPasswordChange=true`);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, oklch(0.08 0.04 270) 0%, oklch(0.12 0.06 280) 50%, oklch(0.15 0.08 290) 100%)',
      }}
    >
      {/* Gradient overlays */}
      <div
        className="absolute top-20 right-20 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, oklch(0.65 0.28 340 / 0.15) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute bottom-20 left-20 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, oklch(0.85 0.18 85 / 0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl shadow-2xl overflow-hidden p-8 md:p-10" style={{ backgroundColor: 'oklch(0.18 0.05 280)' }}>
          <div className="space-y-8">
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold" style={{ color: 'oklch(0.95 0.02 280)' }}>Create New Password</h2>
              <p style={{ color: 'oklch(0.65 0.03 280)' }}>Set up your permanent password</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Back button */}
              <button
                type="button"
                onClick={() => navigate(`/user-agreement?email=${encodeURIComponent(email)}&userId=${encodeURIComponent(userId)}&role=${encodeURIComponent(role)}`)}
                className="inline-flex items-center gap-2 text-sm transition-colors"
                style={{ color: 'oklch(0.65 0.03 280)' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              {/* Error message */}
              {error && (
                <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Current Password (temporary for demo) */}
              <div className="space-y-2">
                <Label htmlFor="current-password" className="text-sm font-medium">
                  Current Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: 'oklch(0.65 0.03 280)' }} />
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Enter current password (demo123)"
                    value={currentPassword}
                    maxLength={50}
                    onInput={(e) => setCurrentPassword(sanitizePassword(e.target.value.slice(0, 50)))}
                    onPaste={(e) => handlePaste(e, sanitizePassword)}
                    onKeyDown={handleRestrictedKeyDown}
                    className="pl-10 pr-10 h-11"
                    style={{ backgroundColor: 'oklch(0.18 0.05 280)', borderColor: 'oklch(0.3 0.05 280)', color: 'oklch(0.95 0.02 280)' }}
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'oklch(0.65 0.03 280)' }}
                    disabled={isLoading}
                  >
                    {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs" style={{ color: 'oklch(0.65 0.03 280)' }}>Demo: use "demo123"</p>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-medium">
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: 'oklch(0.65 0.03 280)' }} />
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={newPassword}
                    maxLength={50}
                    onInput={(e) => setNewPassword(sanitizePassword(e.target.value.slice(0, 50)))}
                    onPaste={(e) => handlePaste(e, sanitizePassword)}
                    onKeyDown={handleRestrictedKeyDown}
                    className="pl-10 pr-10 h-11"
                    style={{ backgroundColor: 'oklch(0.18 0.05 280)', borderColor: 'oklch(0.3 0.05 280)', color: 'oklch(0.95 0.02 280)' }}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'oklch(0.65 0.03 280)' }}
                    disabled={isLoading}
                  >
                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-medium">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: 'oklch(0.65 0.03 280)' }} />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    maxLength={50}
                    onInput={(e) => setConfirmPassword(sanitizePassword(e.target.value.slice(0, 50)))}
                    onPaste={(e) => handlePaste(e, sanitizePassword)}
                    onKeyDown={handleRestrictedKeyDown}
                    className="pl-10 pr-10 h-11"
                    style={{ backgroundColor: 'oklch(0.18 0.05 280)', borderColor: 'oklch(0.3 0.05 280)', color: 'oklch(0.95 0.02 280)' }}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'oklch(0.65 0.03 280)' }}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="p-4 rounded-lg border border-border space-y-3" style={{ backgroundColor: 'oklch(0.12 0.04 270)' }}>
                <p className="text-sm font-medium" style={{ color: 'oklch(0.95 0.02 280)' }}>Password Requirements:</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {hasMinLength ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4" style={{ color: 'oklch(0.65 0.03 280)' }} />
                    )}
                    <span style={{ color: hasMinLength ? 'oklch(0.95 0.02 280)' : 'oklch(0.65 0.03 280)' }}>
                      At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {hasUpperCase ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4" style={{ color: 'oklch(0.65 0.03 280)' }} />
                    )}
                    <span style={{ color: hasUpperCase ? 'oklch(0.95 0.02 280)' : 'oklch(0.65 0.03 280)' }}>
                      One uppercase letter
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {hasLowerCase ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4" style={{ color: 'oklch(0.65 0.03 280)' }} />
                    )}
                    <span style={{ color: hasLowerCase ? 'oklch(0.95 0.02 280)' : 'oklch(0.65 0.03 280)' }}>
                      One lowercase letter
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {hasNumber ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4" style={{ color: 'oklch(0.65 0.03 280)' }} />
                    )}
                    <span style={{ color: hasNumber ? 'oklch(0.95 0.02 280)' : 'oklch(0.65 0.03 280)' }}>One number</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {hasSymbol ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4" style={{ color: 'oklch(0.65 0.03 280)' }} />
                    )}
                    <span style={{ color: hasSymbol ? 'oklch(0.95 0.02 280)' : 'oklch(0.65 0.03 280)' }}>
                      One special character (!@#$%...)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {passwordsMatch ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4" style={{ color: 'oklch(0.65 0.03 280)' }} />
                    )}
                    <span style={{ color: passwordsMatch ? 'oklch(0.95 0.02 280)' : 'oklch(0.65 0.03 280)' }}>
                      Passwords match
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold"
                disabled={isLoading || !isPasswordValid}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Continuing...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="text-center text-sm" style={{ color: 'oklch(0.65 0.03 280)' }}>© 2025 ORBIT. All rights reserved.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
