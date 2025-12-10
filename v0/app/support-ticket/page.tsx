import { SupportTicketForm } from "@/components/support-ticket-form"

export default function SupportTicketPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0a0e27] via-[#1a1f4d] to-[#2d3b8f] relative overflow-hidden">
      <div className="absolute top-20 right-20 w-96 h-96 bg-[#e91e8c]/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#ffd700]/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#2d3b8f]/30 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#1e2a3a] rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#4c5fd5]/10 rounded-full mb-4">
              <svg className="w-8 h-8 text-[#4c5fd5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Support Center</h1>
          </div>

          <SupportTicketForm />
        </div>
      </div>
    </div>
  )
}
