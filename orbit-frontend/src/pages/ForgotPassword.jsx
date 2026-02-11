import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { User, AlertCircle, Loader2, ArrowLeft } from '../components/icons';
import { authAPI } from '../utils/api';
import { sanitizeUsername, handlePaste, handleRestrictedKeyDown } from '../utils/inputSanitizer';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleUsernameKeyDown = (event) => {
    handleRestrictedKeyDown(event);
    if (event.defaultPrevented) return;

    if (event.key.length === 1 && !/^[a-zA-Z0-9._@-]$/.test(event.key)) {
      event.preventDefault();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Username is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authAPI.forgotPassword(email);

      if (result.success) {
        // Redirect to OTP verification page with email
        navigate(`/verify-otp?email=${encodeURIComponent(email)}&type=reset`);
      } else {
        setError(result.error || 'Failed to send reset instructions');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again later.');
      console.error('Forgot password error:', err);
    } finally {
      setIsLoading(false);
    }
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
              <h2 className="text-3xl font-bold" style={{ color: 'oklch(0.95 0.02 280)' }}>Reset Password</h2>
              <p style={{ color: 'oklch(0.65 0.03 280)' }}>We'll help you get back into your account</p>
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

              {/* Email field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: 'oklch(0.65 0.03 280)' }} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your username"
                    value={email}
                    maxLength={50}
                    onInput={(e) => setEmail(sanitizeUsername(e.target.value.slice(0, 50)))}
                    onKeyDown={handleUsernameKeyDown}
                    style={{
                      paddingLeft: '2.5rem',
                      height: '2.75rem',
                      backgroundColor: 'oklch(0.18 0.05 280)',
                      borderColor: 'oklch(0.3 0.05 280)',
                      color: 'oklch(0.95 0.02 280)',
                    }}
                    className="border rounded-md transition-colors"
                    disabled={isLoading}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>

              {/* Support ticket link */}
              <div className="text-center">
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
                  Still having trouble? Submit a support ticket
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="text-center text-sm" style={{ color: 'oklch(0.65 0.03 280)' }}>© 2025 ORBIT. All rights reserved.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
