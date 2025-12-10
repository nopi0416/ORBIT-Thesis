import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AlertCircle, Loader2, ArrowLeft } from '../components/icons';

const SECURITY_QUESTIONS = [
  'What was the name of your first pet?',
  'What city were you born in?',
  'What is your mother\'s maiden name?',
  'What was the name of your elementary school?',
  'What is your favorite book?',
  'What was your childhood nickname?',
  'What is the name of the street you grew up on?',
  'What was your first car model?',
];

export default function SecurityQuestions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const role = searchParams.get('role');

  const [question1, setQuestion1] = useState('');
  const [answer1, setAnswer1] = useState('');
  const [question2, setQuestion2] = useState('');
  const [answer2, setAnswer2] = useState('');
  const [question3, setQuestion3] = useState('');
  const [answer3, setAnswer3] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!email || !role) {
    navigate('/login');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!question1 || !answer1 || !question2 || !answer2 || !question3 || !answer3) {
      setError('Please answer all three security questions');
      return;
    }

    if (question1 === question2 || question1 === question3 || question2 === question3) {
      setError('Please select different questions for each security question');
      return;
    }

    if (answer1.trim().length < 2 || answer2.trim().length < 2 || answer3.trim().length < 2) {
      setError('Answers must be at least 2 characters long');
      return;
    }

    setIsLoading(true);

    // Simulate saving security questions
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Navigate to first-time password setup
    navigate(
      `/first-time-password?email=${encodeURIComponent(email)}&role=${role}`
    );
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
              <h2 className="text-3xl font-bold" style={{ color: 'oklch(0.95 0.02 280)' }}>Security Questions</h2>
              <p style={{ color: 'oklch(0.65 0.03 280)' }}>Choose three security questions to protect your account</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Back button */}
              <button
                type="button"
                onClick={() => navigate('/verify-otp')}
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

              {/* Question 1 */}
              <div className="space-y-2">
                <Label htmlFor="question1" className="text-sm font-medium">
                  Security Question 1
                </Label>
                <Select value={question1} onValueChange={setQuestion1} disabled={isLoading}>
                  <option value="">Select a question</option>
                  {SECURITY_QUESTIONS.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </Select>
                <Input
                  id="answer1"
                  type="text"
                  placeholder="Your answer"
                  value={answer1}
                  onChange={(e) => setAnswer1(e.target.value)}
                  className="h-11"
                  style={{ backgroundColor: 'oklch(0.18 0.05 280)', borderColor: 'oklch(0.3 0.05 280)', color: 'oklch(0.95 0.02 280)' }}
                  disabled={isLoading}
                />
              </div>

              {/* Question 2 */}
              <div className="space-y-2">
                <Label htmlFor="question2" className="text-sm font-medium">
                  Security Question 2
                </Label>
                <Select value={question2} onValueChange={setQuestion2} disabled={isLoading}>
                  <option value="">Select a question</option>
                  {SECURITY_QUESTIONS.map((q) => (
                    <option key={q} value={q} disabled={q === question1}>
                      {q}
                    </option>
                  ))}
                </Select>
                <Input
                  id="answer2"
                  type="text"
                  placeholder="Your answer"
                  value={answer2}
                  onChange={(e) => setAnswer2(e.target.value)}
                  className="h-11"
                  style={{ backgroundColor: 'oklch(0.18 0.05 280)', borderColor: 'oklch(0.3 0.05 280)', color: 'oklch(0.95 0.02 280)' }}
                  disabled={isLoading}
                />
              </div>

              {/* Question 3 */}
              <div className="space-y-2">
                <Label htmlFor="question3" className="text-sm font-medium">
                  Security Question 3
                </Label>
                <Select value={question3} onValueChange={setQuestion3} disabled={isLoading}>
                  <option value="">Select a question</option>
                  {SECURITY_QUESTIONS.map((q) => (
                    <option key={q} value={q} disabled={q === question1 || q === question2}>
                      {q}
                    </option>
                  ))}
                </Select>
                <Input
                  id="answer3"
                  type="text"
                  placeholder="Your answer"
                  value={answer3}
                  onChange={(e) => setAnswer3(e.target.value)}
                  className="h-11"
                  style={{ backgroundColor: 'oklch(0.18 0.05 280)', borderColor: 'oklch(0.3 0.05 280)', color: 'oklch(0.95 0.02 280)' }}
                  disabled={isLoading}
                />
              </div>

              {/* Info message */}
              <div className="p-4 rounded-lg border border-border" style={{ backgroundColor: 'oklch(0.12 0.04 270)' }}>
                <p className="text-sm" style={{ color: 'oklch(0.65 0.03 280)' }}>
                  These security questions will be used to verify your identity if you need to recover your account.
                  Please choose questions you can easily remember.
                </p>
              </div>

              {/* Submit button */}
              <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving...
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
