import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AlertCircle, Loader2, FileText } from '../components/icons';

export default function UserAgreement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const userId = searchParams.get('userId');
  const role = searchParams.get('role') || 'requestor';

  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!email || !userId) {
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

    try {
      console.log('[USER AGREEMENT] Agreement accepted, redirecting to password change');
      
      // Don't record agreement yet - just redirect to password change
      // Agreement will be recorded after password change succeeds
      navigate(`/first-time-password?email=${encodeURIComponent(email)}&userId=${encodeURIComponent(userId)}&role=${encodeURIComponent(role)}`);
    } catch (err) {
      console.error('[USER AGREEMENT] Error:', err);
      setError('An error occurred while processing your request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'linear-gradient(to bottom right, #0a0e27, #1a1f4d, #2d3b8f)' }}>
      <div className="absolute top-20 right-20 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: '#e91e8c/20' }} />
      <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: '#ffd700/10' }} />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: '#2d3b8f/30', transform: 'translate(-50%, -50%)' }} />

      <div className="relative z-10 w-full max-w-2xl">
        <div className="bg-[#1e2a3a] rounded-2xl shadow-2xl overflow-hidden p-8 md:p-10">
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: '#4c5fd5/10' }}>
                  <FileText className="w-6 h-6" style={{ color: '#4c5fd5' }} />
                </div>
                <h2 className="text-3xl font-bold text-white">User Agreement</h2>
              </div>
              <p className="text-gray-300">Please review and accept the terms to continue</p>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Terms Content */}
            <div 
              className="border border-gray-700 rounded-lg p-6 max-h-96 overflow-y-auto bg-[#0f1729]"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#4a5568 #1e2a3a',
              }}>
              <style>{`
                div[style*="scrollbarWidth"]::-webkit-scrollbar {
                  width: 8px;
                }
                div[style*="scrollbarWidth"]::-webkit-scrollbar-track {
                  background: #1e2a3a;
                }
                div[style*="scrollbarWidth"]::-webkit-scrollbar-thumb {
                  background: #4a5568;
                  border-radius: 4px;
                }
                div[style*="scrollbarWidth"]::-webkit-scrollbar-thumb:hover {
                  background: #5a6578;
                }
              `}</style>
              <div className="space-y-4 text-sm text-gray-200">
                <h3 className="font-semibold text-lg text-white">ORBIT System User Agreement</h3>

                <section>
                  <h4 className="font-semibold text-white mb-2">1. Acceptance of Terms</h4>
                  <p>
                    By accessing and using the ORBIT system, you acknowledge that you have read, understood, and agree to be
                    bound by these terms and conditions.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-white mb-2">2. User Responsibilities</h4>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Maintain the confidentiality of your login credentials</li>
                    <li>Use the system only for authorized business purposes</li>
                    <li>Report any security incidents or unauthorized access immediately</li>
                    <li>Comply with all applicable laws and company policies</li>
                  </ul>
                </section>

                <section>
                  <h4 className="font-semibold text-white mb-2">3. Data Privacy and Security</h4>
                  <p>
                    You acknowledge that all data entered into the system is subject to company data protection policies. You
                    agree to handle sensitive information in accordance with applicable privacy laws and regulations.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-white mb-2">4. System Access and Usage</h4>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Access is granted based on your role and responsibilities</li>
                    <li>Unauthorized access attempts will be logged and investigated</li>
                    <li>System usage may be monitored for security and compliance purposes</li>
                    <li>The company reserves the right to suspend or terminate access at any time</li>
                  </ul>
                </section>

                <section>
                  <h4 className="font-semibold text-white mb-2">5. Prohibited Activities</h4>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Attempting to bypass security measures</li>
                    <li>Sharing login credentials with others</li>
                    <li>Using the system for personal gain or unauthorized purposes</li>
                    <li>Introducing malicious software or code</li>
                  </ul>
                </section>

                <section>
                  <h4 className="font-semibold text-white mb-2">6. Intellectual Property</h4>
                  <p>
                    All content, features, and functionality of the ORBIT system are owned by the company and are protected by
                    intellectual property laws.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-white mb-2">7. Modifications</h4>
                  <p>
                    The company reserves the right to modify these terms at any time. Continued use of the system constitutes
                    acceptance of any modifications.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-white mb-2">8. Termination</h4>
                  <p>
                    Your access may be terminated immediately without notice if you violate these terms or engage in
                    unauthorized activities.
                  </p>
                </section>
              </div>
            </div>

            {/* Checkbox */}
            <div className="flex items-start gap-3 p-4 bg-[#1e2a3a] border border-gray-700 rounded-lg">
              <Checkbox
                id="accept-agreement"
                checked={accepted}
                onCheckedChange={setAccepted}
                disabled={isLoading}
                className="mt-1"
              />
              <label htmlFor="accept-agreement" className="text-sm text-white cursor-pointer leading-relaxed">
                I have read and agree to the ORBIT System User Agreement. I understand my responsibilities and the
                consequences of violating these terms.
              </label>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleContinue}
              disabled={isLoading}
              className="w-full h-11 text-base font-semibold text-white transition-all shadow-md hover:shadow-lg"
              style={{
                backgroundColor: '#4c5fd5',
              }}
              onMouseEnter={(e) => !isLoading && (e.target.style.backgroundColor = '#3d4fb5')}
              onMouseLeave={(e) => !isLoading && (e.target.style.backgroundColor = '#4c5fd5')}
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

            {/* Footer */}
            <div className="text-center text-sm text-gray-400">
              © 2025 ORBIT. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
