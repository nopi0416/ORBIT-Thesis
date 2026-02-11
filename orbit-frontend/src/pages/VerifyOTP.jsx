import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AlertCircle, Loader2, ArrowLeft } from '../components/icons';
import { authAPI } from '../utils/api';
import { sanitizeOTP, handlePaste, handleRestrictedKeyDown } from '../utils/inputSanitizer';

export default function VerifyOTP() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const type = searchParams.get('type');

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes
  const inputRefs = useRef([]);

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

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

  // Timer for OTP expiration
  useEffect(() => {
    if (timeRemaining <= 0) return;

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
  }, [timeRemaining]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    handleRestrictedKeyDown(e);
    if (e.defaultPrevented) return;

    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    if (timeRemaining <= 0) {
      setError('Verification code has expired. Please request a new one.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authAPI.verifyOTP(email, otpCode, type || 'reset');

      if (result.success) {
        if (type === 'reset') {
          // Password reset flow
          navigate(`/reset-password?email=${encodeURIComponent(email)}`);
        } else if (type === 'login') {
          // First-time login flow - start with user agreement
          navigate(`/user-agreement?email=${encodeURIComponent(email)}&role=requestor`);
        } else {
          // Regular login flow - go to dashboard
          navigate('/dashboard');
        }
      } else {
        setError(result.error || 'OTP verification failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again later.');
      console.error('OTP verification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setError('');
    setResendCooldown(120);
    setTimeRemaining(180);

    try {
      const result = await authAPI.resendOTP(email, type || 'reset');

      if (!result.success) {
        setError(result.error || 'Failed to resend OTP');
      }
    } catch (err) {
      setError('Failed to resend OTP. Please try again.');
      console.error('Resend OTP error:', err);
    }
  };

  if (!email) {
    return null;
  }

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
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, oklch(0.3 0.12 250 / 0.2) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl shadow-2xl overflow-hidden p-8 md:p-10" style={{ backgroundColor: 'oklch(0.18 0.05 280)' }}>
          <div className="space-y-8">
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold" style={{ color: 'oklch(0.95 0.02 280)' }}>Verify Your Identity</h2>
              <p style={{ color: 'oklch(0.65 0.03 280)' }}>Enter the 6-digit code sent to your email</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Back button */}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 text-sm transition-colors"
                style={{ color: 'oklch(0.65 0.03 280)' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </button>

              {/* Error message */}
              {error && (
                <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* OTP inputs */}
              <div className="space-y-4">
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
                      onInput={(e) => handleChange(index, sanitizeOTP(e.target.value))}
                      onPaste={handlePaste}
                      onKeyDown={(e) => handleKeyDown(index, e)}
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
                      aria-label={`Digit ${index + 1}`}
                    />
                  ))}
                </div>

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
                        onClick={handleResend}
                        className="font-medium transition-colors"
                        style={{ color: 'oklch(0.55 0.22 250)' }}
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold"
                disabled={isLoading || otp.join('').length !== 6 || timeRemaining <= 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
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
