import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Lock, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff, Check, CheckCircle } from '../components/icons';
import { authAPI } from '../utils/api';
import { sanitizePassword, sanitizeText, handlePaste, handleRestrictedKeyDown } from '../utils/inputSanitizer';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');

  // Security question state
  const [securityQuestion, setSecurityQuestion] = useState(null);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [securityVerified, setSecurityVerified] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(true);

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Success modal state
  const [showSuccess, setShowSuccess] = useState(false);

  if (!email) {
    navigate('/login');
    return null;
  }

  // Load security question on mount
  useEffect(() => {
    const loadQuestion = async () => {
      try {
        const result = await authAPI.getSecurityQuestion(email);
        if (result.success) {
          setSecurityQuestion(result.data);
        } else {
          setSecurityError(result.error || 'Failed to load security question');
        }
      } catch (err) {
        setSecurityError('Failed to load security question');
        console.error('Error loading security question:', err);
      } finally {
        setLoadingQuestion(false);
      }
    };

    loadQuestion();
  }, [email]);

  const handleVerifySecurityAnswer = async (e) => {
    e.preventDefault();
    setSecurityError('');

    if (!securityAnswer.trim()) {
      setSecurityError('Please answer the security question');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authAPI.verifySingleSecurityAnswer(
        email,
        securityQuestion.questionIndex,
        securityAnswer
      );

      if (result.success) {
        setSecurityVerified(true);
      } else {
        setSecurityError(result.error || 'Incorrect answer. Please try again.');
      }
    } catch (err) {
      setSecurityError('Failed to verify security answer');
      console.error('Verification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return 'Password must contain at least one symbol';
    }
    return null;
  };

  const getPasswordRequirements = () => {
    if (!newPassword) return [];
    return [
      {
        label: 'At least 8 characters',
        met: newPassword.length >= 8,
      },
      {
        label: 'One uppercase letter',
        met: /[A-Z]/.test(newPassword),
      },
      {
        label: 'One lowercase letter',
        met: /[a-z]/.test(newPassword),
      },
      {
        label: 'One number',
        met: /[0-9]/.test(newPassword),
      },
      {
        label: 'One symbol (!@#$%^&*...)',
        met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword),
      },
    ];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authAPI.resetPassword(email, newPassword);

      if (result.success) {
        setShowSuccess(true);
        // Redirect after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(result.error || 'Failed to reset password. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again later.');
      console.error('Reset password error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const requirements = getPasswordRequirements();
  const allRequirementsMet = requirements.length > 0 && requirements.every((req) => req.met);

  if (loadingQuestion) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: 'linear-gradient(135deg, oklch(0.08 0.04 270) 0%, oklch(0.12 0.06 280) 50%, oklch(0.15 0.08 290) 100%)',
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'oklch(0.95 0.02 280)' }} />
          <p style={{ color: 'oklch(0.95 0.02 280)' }}>Loading security question...</p>
        </div>
      </div>
    );
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

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div
            className="rounded-2xl shadow-2xl p-8 max-w-md text-center animate-in fade-in zoom-in-50"
            style={{ backgroundColor: 'oklch(0.18 0.05 280)' }}
          >
            <div className="mb-4 flex justify-center">
              <div
                className="rounded-full p-4 animate-bounce"
                style={{
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                }}
              >
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
            </div>
            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: 'oklch(0.95 0.02 280)' }}
            >
              Password Changed Successfully!
            </h2>
            <p
              className="mb-6 text-sm"
              style={{ color: 'oklch(0.65 0.03 280)' }}
            >
              Your password has been reset successfully. You'll be redirected to the login page in a moment.
            </p>
            <Button
              onClick={() => navigate('/login')}
              className="w-full"
            >
              Go to Login
            </Button>
          </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl shadow-2xl overflow-hidden p-8 md:p-10 animate-in fade-in slide-in-from-bottom-4" style={{ backgroundColor: 'oklch(0.18 0.05 280)' }}>
          <div className="space-y-8">
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold" style={{ color: 'oklch(0.95 0.02 280)' }}>Reset Password</h2>
              <p style={{ color: 'oklch(0.65 0.03 280)' }}>
                {securityVerified ? 'Create a new password for your account' : 'Verify your identity first'}
              </p>
            </div>

            {/* Form */}
            {!securityVerified ? (
              // Security Question Form
              <form onSubmit={handleVerifySecurityAnswer} className="space-y-6">
                {/* Back button */}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center gap-2 text-sm transition-colors hover:opacity-80"
                  style={{ color: 'oklch(0.65 0.03 280)' }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to login
                </button>

                {/* Error message */}
                {securityError && (
                  <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{securityError}</AlertDescription>
                  </Alert>
                )}

                {/* Security Question */}
                {securityQuestion && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'oklch(0.12 0.04 270)' }}>
                      <p
                        className="text-sm font-medium mb-2"
                        style={{ color: 'oklch(0.65 0.03 280)' }}
                      >
                        Security Question
                      </p>
                      <p style={{ color: 'oklch(0.95 0.02 280)' }} className="font-semibold">
                        {securityQuestion.question}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="security-answer" className="text-sm font-medium">
                        Your Answer
                      </Label>
                      <Input
                        id="security-answer"
                        type="text"
                        placeholder="Enter your answer"
                        value={securityAnswer}
                        maxLength={50}
                        onInput={(e) => setSecurityAnswer(sanitizeText(e.target.value.slice(0, 50)))}
                        onPaste={(e) => handlePaste(e, sanitizeText)}
                        onKeyDown={handleRestrictedKeyDown}
                        style={{
                          height: '2.75rem',
                          backgroundColor: 'oklch(0.18 0.05 280)',
                          borderColor: 'oklch(0.3 0.05 280)',
                          color: 'oklch(0.95 0.02 280)',
                        }}
                        className="border rounded-md transition-colors"
                        disabled={isLoading}
                        autoFocus
                      />
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold"
                  disabled={isLoading || !securityAnswer.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Continue'
                  )}
                </Button>
              </form>
            ) : (
              // Password Reset Form
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Back button */}
                <button
                  type="button"
                  onClick={() => setSecurityVerified(false)}
                  className="inline-flex items-center gap-2 text-sm transition-colors hover:opacity-80"
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
                      style={{
                        paddingLeft: '2.5rem',
                        paddingRight: '2.5rem',
                        height: '2.75rem',
                        backgroundColor: 'oklch(0.18 0.05 280)',
                        borderColor: 'oklch(0.3 0.05 280)',
                        color: 'oklch(0.95 0.02 280)',
                      }}
                      className="border rounded-md transition-colors"
                      disabled={isLoading}
                      autoComplete="new-password"
                      autoFocus
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

                  {/* Password Requirements */}
                  {newPassword && (
                    <div className="mt-3 space-y-2 p-3 rounded-lg" style={{ backgroundColor: 'oklch(0.12 0.04 270)' }}>
                      {requirements.map((req, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <Check
                            className="h-4 w-4"
                            style={{ color: req.met ? '#22c55e' : 'oklch(0.65 0.03 280)' }}
                          />
                          <span style={{ color: req.met ? 'oklch(0.95 0.02 280)' : 'oklch(0.65 0.03 280)' }}>
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-medium">
                    Confirm Password
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
                      style={{
                        paddingLeft: '2.5rem',
                        paddingRight: '2.5rem',
                        height: '2.75rem',
                        backgroundColor: 'oklch(0.18 0.05 280)',
                        borderColor: 'oklch(0.3 0.05 280)',
                        color: 'oklch(0.95 0.02 280)',
                      }}
                      className="border rounded-md transition-colors"
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

                {/* Submit button */}
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold"
                  disabled={isLoading || !allRequirementsMet || !confirmPassword}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </form>
            )}

            {/* Footer */}
            <div className="text-center text-sm" style={{ color: 'oklch(0.65 0.03 280)' }}>© 2025 ORBIT. All rights reserved.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
