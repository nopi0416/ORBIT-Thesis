import { UserAgreementForm } from "@/components/user-agreement-form"
import { FileText } from "lucide-react"
import { redirect } from "next/navigation"

export default function UserAgreementPage({
  searchParams,
}: {
  searchParams: { email?: string; role?: string }
}) {
  const email = searchParams.email
  const role = searchParams.role

  if (!email || !role) {
    redirect("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0a0e27] via-[#1a1f4d] to-[#2d3b8f] relative overflow-hidden">
      <div className="absolute top-20 right-20 w-96 h-96 bg-[#e91e8c]/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#ffd700]/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#2d3b8f]/30 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-2xl">
        <div className="bg-[#1e2a3a] rounded-2xl shadow-2xl overflow-hidden p-8 md:p-10">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#4c5fd5]/10 rounded-lg">
                  <FileText className="w-6 h-6 text-[#4c5fd5]" />
                </div>
                <h2 className="text-3xl font-bold text-white">User Agreement</h2>
              </div>
              <p className="text-gray-300">Please review and accept the terms to continue</p>
            </div>

            <UserAgreementForm email={email} role={role} />

            <div className="text-center text-sm text-gray-400">© 2025 ORBIT. All rights reserved.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
