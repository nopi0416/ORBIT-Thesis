import { ForgotPasswordSecurityQuestionForm } from "@/components/forgot-password-security-question-form"
import { Shield } from "lucide-react"
import { redirect } from "next/navigation"

export default function ForgotPasswordSecurityQuestionPage({
  searchParams,
}: {
  searchParams: { email?: string }
}) {
  const email = searchParams.email

  if (!email) {
    redirect("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0a0e27] via-[#1a1f4d] to-[#2d3b8f] relative overflow-hidden">
      <div className="absolute top-20 right-20 w-96 h-96 bg-[#e91e8c]/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#ffd700]/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#2d3b8f]/30 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#1e2a3a] rounded-2xl shadow-2xl overflow-hidden p-8 md:p-10">
          <div className="space-y-8">
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-white text-balance">Verify Your Identity</h2>
            </div>

            {/* Security question form */}
            <ForgotPasswordSecurityQuestionForm email={email} />

            {/* Security badge */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <Shield className="w-3 h-3" />
              <span>Your security is our priority</span>
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-gray-400">© 2025 ORBIT. All rights reserved.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
