"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSession, updateUserAgreement } from "@/lib/auth"
import { AlertCircle, Loader2 } from "lucide-react"

interface UserAgreementFormProps {
  email: string
  role: string
}

export function UserAgreementForm({ email, role }: UserAgreementFormProps) {
  const router = useRouter()
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleContinue = async () => {
    if (!accepted) {
      setError("You must accept the user agreement to continue")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const session = getSession()
      if (!session) {
        router.push("/")
        return
      }

      updateUserAgreement(session.userId)
      router.push(`/security-questions?email=${encodeURIComponent(email)}&role=${role}`)
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="border border-gray-700 rounded-lg p-6 max-h-96 overflow-y-auto bg-[#0f1729] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#1e2a3a] [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-500">
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

      <div className="flex items-start gap-3 p-4 bg-[#1e2a3a] border border-gray-700 rounded-lg">
        <Checkbox
          id="accept-agreement"
          checked={accepted}
          onCheckedChange={(checked) => setAccepted(checked as boolean)}
          className="mt-1"
        />
        <label htmlFor="accept-agreement" className="text-sm text-white cursor-pointer leading-relaxed">
          I have read and agree to the ORBIT System User Agreement. I understand my responsibilities and the
          consequences of violating these terms.
        </label>
      </div>

      <Button
        onClick={handleContinue}
        className="w-full h-11 text-base font-semibold bg-[#4c5fd5] hover:bg-[#3d4fb5] text-white transition-all shadow-md hover:shadow-lg"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          "Continue"
        )}
      </Button>
    </div>
  )
}
