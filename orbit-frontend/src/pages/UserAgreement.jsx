import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AlertCircle, Loader2, ArrowLeft } from '../components/icons';

export default function UserAgreement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const role = searchParams.get('role');

  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!email || !role) {
    navigate('/login');
    return null;
  }

  const handleContinue = async () => {
    if (!accepted) {
      setError('You must accept the user agreement to continue');
      return;
    }

    setIsLoading(true);
    setError('');

    const userId = searchParams.get('userId') || searchParams.get('email');
    const result = await authAPI.acceptUserAgreement(userId, '1.0');

    setIsLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    // Navigate to dashboard
    navigate('/dashboard');
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

      <div className="relative z-10 w-full max-w-2xl">
        <div className="rounded-2xl shadow-2xl overflow-hidden p-8 md:p-10" style={{ backgroundColor: 'oklch(0.18 0.05 280)' }}>
          <div className="space-y-8">
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold" style={{ color: 'oklch(0.95 0.02 280)' }}>User Agreement</h2>
              <p style={{ color: 'oklch(0.65 0.03 280)' }}>Please review and accept the terms to continue</p>
            </div>

            {/* Error message */}
            {error && (
              <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Terms content */}
            <div className="border border-border rounded-lg p-6 max-h-96 overflow-y-auto" style={{ backgroundColor: 'oklch(0.12 0.04 270)' }}>
              <div className="space-y-4 text-sm" style={{ color: 'oklch(0.65 0.03 280)' }}>
                <h3 className="font-semibold text-lg" style={{ color: 'oklch(0.95 0.02 280)' }}>ORBIT System User Agreement</h3>

                <section>
                  <h4 className="font-semibold mb-2" style={{ color: 'oklch(0.95 0.02 280)' }}>1. Acceptance of Terms</h4>
                  <p>
                    By accessing and using the ORBIT system, you acknowledge that you have read, understood, and agree to be bound by these
                    terms and conditions.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold mb-2" style={{ color: 'oklch(0.95 0.02 280)' }}>2. User Responsibilities</h4>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Maintain the confidentiality of your login credentials</li>
                    <li>Use the system only for authorized business purposes</li>
                    <li>Report any security incidents or unauthorized access immediately</li>
                    <li>Comply with all applicable laws and company policies</li>
                  </ul>
                </section>

                <section>
                  <h4 className="font-semibold mb-2" style={{ color: 'oklch(0.95 0.02 280)' }}>3. Data Privacy and Security</h4>
                  <p>
                    You acknowledge that all data entered into the system is subject to company data protection policies. You agree to handle
                    sensitive information in accordance with applicable privacy laws and regulations.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold mb-2" style={{ color: 'oklch(0.95 0.02 280)' }}>4. System Access and Usage</h4>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Access is granted based on your role and responsibilities</li>
                    <li>Unauthorized access attempts will be logged and investigated</li>
                    <li>System usage may be monitored for security and compliance purposes</li>
                    <li>The company reserves the right to suspend or terminate access at any time</li>
                  </ul>
                </section>

                <section>
                  <h4 className="font-semibold mb-2" style={{ color: 'oklch(0.95 0.02 280)' }}>5. Prohibited Activities</h4>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Attempting to bypass security measures</li>
                    <li>Sharing login credentials with others</li>
                    <li>Using the system for personal gain or unauthorized purposes</li>
                    <li>Introducing malicious software or code</li>
                  </ul>
                </section>

                <section>
                  <h4 className="font-semibold mb-2" style={{ color: 'oklch(0.95 0.02 280)' }}>6. Intellectual Property</h4>
                  <p>
                    All content, features, and functionality of the ORBIT system are owned by the company and are protected by intellectual
                    property laws.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold mb-2" style={{ color: 'oklch(0.95 0.02 280)' }}>7. Modifications</h4>
                  <p>
                    The company reserves the right to modify these terms at any time. Continued use of the system constitutes acceptance of any
                    modifications.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold mb-2" style={{ color: 'oklch(0.95 0.02 280)' }}>8. Termination</h4>
                  <p>
                    Your access may be terminated immediately without notice if you violate these terms or engage in unauthorized activities.
                  </p>
                </section>
              </div>
            </div>

            {/* Checkbox */}
            <div className="flex items-start gap-3 p-4 border border-border rounded-lg" style={{ backgroundColor: 'oklch(0.12 0.04 270)' }}>
              <Checkbox id="accept-agreement" checked={accepted} onCheckedChange={setAccepted} className="mt-1" />
              <label htmlFor="accept-agreement" className="text-sm cursor-pointer leading-relaxed" style={{ color: 'oklch(0.95 0.02 280)' }}>
                I have read and agree to the ORBIT System User Agreement. I understand my responsibilities and the consequences of violating
                these terms.
              </label>
            </div>

            {/* Submit button */}
            <Button onClick={handleContinue} className="w-full h-11 text-base font-semibold" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Continuing...
                </>
              ) : (
                'Accept & Continue'
              )}
            </Button>

            {/* Footer */}
            <div className="text-center text-sm" style={{ color: 'oklch(0.65 0.03 280)' }}>© 2025 ORBIT. All rights reserved.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
