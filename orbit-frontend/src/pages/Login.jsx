import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Eye, EyeOff, Lock, User, AlertCircle, Loader2, ArrowLeft } from '../components/icons';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';
import { getDashboardRoute } from '../utils/roleRouting';

export default function Login() {
  const navigate = useNavigate();
  const { login, completeLogin } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [requiresOTP, setRequiresOTP] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes
  const inputRefs = useRef([]);

  // Timer for OTP expiration
  useEffect(() => {
    if (!requiresOTP || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [requiresOTP, timeRemaining]);

  // Initialize resend cooldown when OTP page is shown
  useEffect(() => {
    if (requiresOTP) {
      setResendCooldown(120); // 2 minutes cooldown since OTP was just sent
    }
  }, [requiresOTP]);

  // Timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [resendCooldown]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split('').forEach((char, index) => {
      if (index < 6) newOtp[index] = char;
    });
    setOtp(newOtp);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setError('');
    setResendCooldown(120);
    setTimeRemaining(180);

    try {
      if (!otpEmail) {
        setError('Unable to resend OTP. Please sign in again.');
        setTimeRemaining(0);
        return;
      }

      const result = await authAPI.resendOTP(otpEmail, 'login');

      if (!result.success) {
        setError(result.error || 'Failed to resend OTP');
        setTimeRemaining(0); // Reset timer on error
      }
    } catch (err) {
      setError('Failed to resend OTP. Please try again.');
      setTimeRemaining(0);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (requiresOTP) {
      // OTP validation
      const otpCode = otp.join('');
      if (otpCode.length !== 6) {
        errors.otp = 'Please enter the complete 6-digit code';
      }
    } else {
      // Employee ID validation
      if (!employeeId) {
        errors.employee_id = 'Employee ID is required';
      }

      // Password validation
      if (!password) {
        errors.password = 'Password is required';
      } else if (password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (requiresOTP) {
        // Step 2: Verify OTP and complete login
        const otpCode = otp.join('');
        console.log('[LOGIN FORM] Submitting OTP:', otpCode);
        
        if (timeRemaining <= 0) {
          setError('Verification code has expired. Please request a new one.');
          setIsLoading(false);
          return;
        }

        const result = await completeLogin(otpEmail || employeeId, otpCode);
        
        console.log('[LOGIN FORM] Complete login result:', result);

        if (result.success) {
          // Check if user agreement is required (first-time login)
          if (result.requiresUserAgreement) {
            console.log('[LOGIN FORM] User agreement required, redirecting to user-agreement');
            navigate(`/user-agreement?email=${encodeURIComponent(otpEmail || employeeId)}&userId=${result.userId}&role=${encodeURIComponent(result.role || 'requestor')}`);
          } else if (result.requiresPasswordChange) {
            console.log('[LOGIN FORM] Password change required, redirecting to first-time-password');
            navigate(`/first-time-password?email=${encodeURIComponent(otpEmail || employeeId)}&role=${encodeURIComponent(result.role || 'requestor')}`);
          } else {
            // OTP verified, redirect to role-specific dashboard
            const dashboardRoute = getDashboardRoute(result.role);
            console.log('[LOGIN FORM] OTP verified, redirecting to', dashboardRoute, 'for role:', result.role);
            navigate(dashboardRoute);
          }
        } else {
          console.log('[LOGIN FORM] OTP verification failed:', result.error);
          setError(result.error || 'OTP verification failed. Please try again.');
        }
      } else {
        // Step 1: Submit employee ID and password
        console.log('[LOGIN FORM] Submitting credentials for:', employeeId);
        const result = await login({ employee_id: employeeId, password });
        
        console.log('[LOGIN FORM] Login result:', result);

        if (result.success) {
          console.log('[LOGIN FORM] Login success, requiresOTP:', result.requiresOTP);
          if (result.requiresOTP) {
            // OTP required - show OTP entry form
            console.log('[LOGIN FORM] Showing OTP page');
            setOtpEmail(result.email || otpEmail || employeeId);
            setRequiresOTP(true);
            setPassword('');
            setOtp(['', '', '', '', '', '']);
            setFieldErrors({});
          } else {
            // Direct login successful - redirect to role-specific dashboard
            const dashboardRoute = getDashboardRoute(result.role);
            console.log('[LOGIN FORM] Direct login successful, redirecting to', dashboardRoute, 'for role:', result.role);
            navigate(dashboardRoute);
          }
        } else {
          console.log('[LOGIN FORM] Login failed:', result.error);
          setError(result.error || 'Login failed. Please try again.');
        }
      }
    } catch (_error) {
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setRequiresOTP(false);
    setOtp(['', '', '', '', '', '']);
    setError('');
    setFieldErrors({});
    setResendCooldown(0);
    setTimeRemaining(180);
    setOtpEmail('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, oklch(0.08 0.04 270) 0%, oklch(0.12 0.06 280) 50%, oklch(0.15 0.08 290) 100%)',
      }}>
      {/* Gradient overlays for visual depth */}
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
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, oklch(0.3 0.12 250 / 0.2) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-4xl">
        <div className="rounded-2xl shadow-2xl overflow-hidden grid md:grid-cols-2 min-h-[650px]" style={{ backgroundColor: 'oklch(0.18 0.05 280)' }}>
          {/* Left side - Image carousel (simplified branding section) */}
          <div className="hidden md:flex md:flex-col md:justify-between p-10 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, oklch(0.15 0.08 250) 0%, oklch(0.12 0.06 260) 100%)',
            }}>
            {/* Logo and branding */}
            <div className="flex items-center gap-3 z-10">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-white/20"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                }}>
                <span className="text-xl font-bold text-white">O</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">ORBIT</h1>
                <p className="text-xs text-white/80">Budget Intelligence Tool</p>
              </div>
            </div>

            {/* Content overlay */}
            <div className="space-y-4 max-w-md z-10">
              <h2 className="text-3xl font-bold text-white">Enterprise Security</h2>
              <p className="text-lg text-white/90">Bank-level encryption for your sensitive data</p>
            </div>

            {/* Decorative gradient */}
            <div
              className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
              style={{
                background: 'linear-gradient(to top, oklch(0.1 0.04 260) 0%, transparent 100%)',
              }}
            />
          </div>

          {/* Right side - Login form */}
          <div className="p-8 md:p-10 flex flex-col justify-center">
            <div className="space-y-8">
              {/* Header */}
              <div className="space-y-2">
                <h2 className="text-3xl font-bold" style={{ color: 'oklch(0.95 0.02 280)' }}>Login</h2>
                <p style={{ color: 'oklch(0.65 0.03 280)' }}>
                  {requiresOTP ? 'Enter the OTP sent to your email' : 'Sign in to access your secure dashboard'}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {!requiresOTP ? (
                  <>
                    {/* Employee ID field */}
                    <div className="space-y-2">
                      <Label htmlFor="employee_id" className="text-sm font-medium">
                        Employee ID
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: 'oklch(0.65 0.03 280)' }} />
                        <Input
                          id="employee_id"
                          type="text"
                          placeholder="Enter your employee ID"
                          value={employeeId}
                          onChange={(e) => setEmployeeId(e.target.value)}
                          style={{
                            paddingLeft: '2.5rem',
                            height: '2.75rem',
                            backgroundColor: 'oklch(0.18 0.05 280)',
                            borderColor: fieldErrors.employee_id ? 'oklch(0.55 0.22 25)' : 'oklch(0.3 0.05 280)',
                            color: 'oklch(0.95 0.02 280)',
                          }}
                          className="border rounded-md transition-colors"
                          disabled={isLoading}
                          autoComplete="username"
                          autoFocus
                          aria-invalid={!!fieldErrors.employee_id}
                          aria-describedby={fieldErrors.employee_id ? 'employee-id-error' : undefined}
                        />
                      </div>
                      {fieldErrors.employee_id && (
                        <p id="employee-id-error" className="text-sm animate-in fade-in slide-in-from-top-1" style={{ color: 'oklch(0.55 0.22 25)' }}>
                          {fieldErrors.employee_id}
                        </p>
                      )}
                    </div>

                    {/* Password field */}
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: 'oklch(0.65 0.03 280)' }} />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          style={{
                            paddingLeft: '2.5rem',
                            paddingRight: '2.5rem',
                            height: '2.75rem',
                            backgroundColor: 'oklch(0.18 0.05 280)',
                            borderColor: fieldErrors.password ? 'oklch(0.55 0.22 25)' : 'oklch(0.3 0.05 280)',
                            color: 'oklch(0.95 0.02 280)',
                          }}
                          className="border rounded-md transition-colors"
                          disabled={isLoading}
                          autoComplete="current-password"
                          aria-invalid={!!fieldErrors.password}
                          aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                          style={{ color: 'oklch(0.65 0.03 280)' }}
                          disabled={isLoading}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      {fieldErrors.password && (
                        <p id="password-error" className="text-sm animate-in fade-in slide-in-from-top-1" style={{ color: 'oklch(0.55 0.22 25)' }}>
                          {fieldErrors.password}
                        </p>
                      )}
                    </div>

                    {/* Forgot password link */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => navigate('/forgot-password')}
                        className="text-sm transition-colors"
                        style={{ color: 'oklch(0.55 0.22 250)' }}
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* OTP input boxes */}
                    <div className="space-y-4">
                      {/* Back button for OTP */}
                      <button
                        type="button"
                        onClick={handleBackToLogin}
                        className="inline-flex items-center gap-2 text-sm transition-colors"
                        style={{ color: 'oklch(0.65 0.03 280)' }}
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Login
                      </button>

                      {/* OTP digit inputs */}
                      <div className="flex gap-2 justify-center">
                        {otp.map((digit, index) => (
                          <input
                            key={index}
                            ref={(el) => {
                              inputRefs.current[index] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(index, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            onPaste={handleOtpPaste}
                            autoFocus={index === 0}
                            style={{
                              width: '3rem',
                              height: '3.5rem',
                              textAlign: 'center',
                              fontSize: '1.25rem',
                              fontWeight: '600',
                              backgroundColor: 'oklch(0.18 0.05 280)',
                              borderColor: 'oklch(0.3 0.05 280)',
                              color: 'oklch(0.95 0.02 280)',
                              border: '1px solid',
                              borderRadius: '0.375rem',
                              transition: 'all 0.3s',
                            }}
                            disabled={isLoading || timeRemaining <= 0}
                            aria-label={`OTP Digit ${index + 1}`}
                          />
                        ))}
                      </div>

                      {/* Timer and Resend */}
                      <div className="flex justify-between items-center text-sm">
                        <p style={{ color: timeRemaining <= 60 ? 'oklch(0.55 0.22 25)' : 'oklch(0.65 0.03 280)', fontWeight: timeRemaining <= 60 ? '500' : 'normal' }}>
                          OTP Expires in {formatTime(timeRemaining)}
                        </p>
                        <div>
                          {resendCooldown > 0 ? (
                            <span style={{ color: 'oklch(0.65 0.03 280)' }}>Resend code in {formatTime(resendCooldown)}</span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleResendOtp}
                              className="font-medium transition-colors"
                              style={{ color: 'oklch(0.55 0.22 250)' }}
                            >
                              Resend OTP
                            </button>
                          )}
                        </div>
                      </div>

                      {fieldErrors.otp && (
                        <p className="text-sm animate-in fade-in slide-in-from-top-1" style={{ color: 'oklch(0.55 0.22 25)' }}>
                          {fieldErrors.otp}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold"
                  disabled={isLoading || (requiresOTP && otp.join('').length !== 6) || (requiresOTP && timeRemaining <= 0)}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {requiresOTP ? 'Verifying Code...' : 'Signing in...'}
                    </>
                  ) : (
                    requiresOTP ? 'Verify Code' : 'Sign In'
                  )}
                </Button>

                {/* Support ticket link (only show on login, not OTP) */}
                {!requiresOTP && (
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/support-ticket')}
                      className="text-sm transition-colors inline-flex items-center gap-1"
                      style={{ color: 'oklch(0.65 0.03 280)' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                      Need help? Submit a support ticket
                    </button>
                  </div>
                )}
              </form>

              {/* Footer */}
              <div className="text-center text-sm" style={{ color: 'oklch(0.65 0.03 280)' }}>© 2025 ORBIT. All rights reserved.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}