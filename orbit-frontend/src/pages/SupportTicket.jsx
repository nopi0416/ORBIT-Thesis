import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { ArrowLeft, AlertCircle, Loader2, User, Mail, CheckCircle } from '../components/icons';

export default function SupportTicket() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !issueType || !description) {
      setError('Please fill in all fields');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (description.length < 10) {
      setError('Please provide more details about your issue (at least 10 characters)');
      return;
    }

    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitted(true);
    setIsLoading(false);
  };

  if (isSubmitted) {
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
          <div className="rounded-2xl shadow-2xl p-8" style={{ backgroundColor: 'oklch(0.18 0.05 280)' }}>
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold" style={{ color: 'oklch(0.95 0.02 280)' }}>Ticket Submitted Successfully!</h3>
                <p style={{ color: 'oklch(0.65 0.03 280)' }}>
                  We've received your support request. Our team will review it and contact you at{' '}
                  <span className="font-medium" style={{ color: 'oklch(0.95 0.02 280)' }}>{email}</span> within 24-48 hours.
                </p>
                <p className="text-sm pt-2" style={{ color: 'oklch(0.65 0.03 280)' }}>
                  Ticket ID: #{Math.random().toString(36).substr(2, 9).toUpperCase()}
                </p>
              </div>
              <Button
                onClick={() => navigate('/login')}
                className="w-full h-11 text-base font-semibold"
              >
                Return to Login
              </Button>
            </div>
          </div>
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

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl shadow-2xl p-8" style={{ backgroundColor: 'oklch(0.18 0.05 280)' }}>
          {/* Header with icon */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <svg className="w-8 h-8" style={{ color: 'oklch(0.55 0.22 250)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'oklch(0.95 0.02 280)' }}>Support Center</h1>
          </div>

          {/* Help text */}
          <p className="text-sm text-center mb-6" style={{ color: 'oklch(0.65 0.03 280)' }}>
            We're here to help. Submit a ticket and our team will assist you shortly.
          </p>

          {/* Back link */}
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 text-sm transition-colors mb-6"
            style={{ color: 'oklch(0.65 0.03 280)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </button>

          {/* Error message */}
          {error && (
            <Alert variant="destructive" className="mb-6 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium" style={{ color: 'oklch(0.95 0.02 280)' }}>
                Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: 'oklch(0.65 0.03 280)' }} />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-11"
                  style={{ backgroundColor: 'oklch(0.18 0.05 280)', borderColor: 'oklch(0.3 0.05 280)', color: 'oklch(0.95 0.02 280)' }}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Email field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium" style={{ color: 'oklch(0.95 0.02 280)' }}>
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: 'oklch(0.65 0.03 280)' }} />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11"
                  style={{ backgroundColor: 'oklch(0.18 0.05 280)', borderColor: 'oklch(0.3 0.05 280)', color: 'oklch(0.95 0.02 280)' }}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Issue Type field */}
            <div className="space-y-2">
              <Label htmlFor="issueType" className="text-sm font-medium" style={{ color: 'oklch(0.95 0.02 280)' }}>
                Issue Type
              </Label>
              <select
                id="issueType"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                disabled={isLoading}
                className="w-full h-11 px-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                style={{
                  backgroundColor: 'oklch(0.18 0.05 280)',
                  color: 'oklch(0.95 0.02 280)',
                  borderColor: 'oklch(0.3 0.05 280)',
                }}
              >
                <option value="" style={{ backgroundColor: 'oklch(0.18 0.05 280)', color: 'oklch(0.95 0.02 280)' }}>Select issue type</option>
                <option value="forgot-password" style={{ backgroundColor: 'oklch(0.18 0.05 280)', color: 'oklch(0.95 0.02 280)' }}>Forgot Password</option>
                <option value="forgot-security-questions" style={{ backgroundColor: 'oklch(0.18 0.05 280)', color: 'oklch(0.95 0.02 280)' }}>Forgot Security Questions/Answers</option>
                <option value="login-trouble" style={{ backgroundColor: 'oklch(0.18 0.05 280)', color: 'oklch(0.95 0.02 280)' }}>Trouble Logging In</option>
                <option value="account-locked" style={{ backgroundColor: 'oklch(0.18 0.05 280)', color: 'oklch(0.95 0.02 280)' }}>Account Locked</option>
                <option value="other" style={{ backgroundColor: 'oklch(0.18 0.05 280)', color: 'oklch(0.95 0.02 280)' }}>Other Issue</option>
              </select>
            </div>

            {/* Description field */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium" style={{ color: 'oklch(0.95 0.02 280)' }}>
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Please describe your issue in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px] resize-none"
                style={{ backgroundColor: 'oklch(0.18 0.05 280)', borderColor: 'oklch(0.3 0.05 280)', color: 'oklch(0.95 0.02 280)' }}
                disabled={isLoading}
              />
              <p className="text-xs" style={{ color: 'oklch(0.65 0.03 280)' }}>{description.length} characters</p>
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
                  Submitting...
                </>
              ) : (
                'Submit Ticket'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
