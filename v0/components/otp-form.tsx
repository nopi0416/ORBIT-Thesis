"use client"

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent, type ClipboardEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getDashboardPath, getSession, getUserById } from "@/lib/auth"
import { AlertCircle, Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface OtpFormProps {
  email: string
  role?: string
  type?: string
}

export function OtpForm({ email, role, type }: OtpFormProps) {
  const router = useRouter()
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(300) // 5 minutes in seconds
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (timeRemaining <= 0) return

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timeRemaining])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").slice(0, 6)
    if (!/^\d+$/.test(pastedData)) return

    const newOtp = [...otp]
    pastedData.split("").forEach((char, index) => {
      if (index < 6) newOtp[index] = char
    })
    setOtp(newOtp)

    // Focus last filled input or next empty
    const nextIndex = Math.min(pastedData.length, 5)
    inputRefs.current[nextIndex]?.focus()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")

    const otpCode = otp.join("")
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit code")
      return
    }

    if (timeRemaining <= 0) {
      setError("Verification code has expired. Please request a new one.")
      return
    }

    setIsLoading(true)

    // Simulate OTP verification
    await new Promise((resolve) => setTimeout(resolve, 1000))

    if (type === "reset") {
      router.push(`/forgot-password-security-question?email=${encodeURIComponent(email)}`)
    } else {
      // For login, check if first-time user
      const session = getSession()
      if (session) {
        const user = getUserById(session.userId)

        if (user && user.isFirstLogin) {
          // First-time login flow
          if (!user.hasAcceptedAgreement) {
            router.push(`/user-agreement?email=${encodeURIComponent(email)}&role=${role}`)
          } else if (!user.hasSetupSecurityQuestions) {
            router.push(`/security-questions?email=${encodeURIComponent(email)}&role=${role}`)
          } else if (!user.hasChangedPassword) {
            router.push(`/first-time-password?email=${encodeURIComponent(email)}&role=${role}`)
          } else {
            // All steps completed, go to dashboard
            if (role) {
              const dashboardPath = getDashboardPath(role)
              router.push(dashboardPath)
            }
          }
        } else {
          // Regular login, go to dashboard
          if (role) {
            const dashboardPath = getDashboardPath(role)
            router.push(dashboardPath)
          }
        }
      }
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return

    setError("")
    setResendCooldown(60)
    setTimeRemaining(300)

    // Simulate sending OTP
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Countdown timer
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to login
      </Link>

      {error && (
        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="flex gap-2 justify-center">
          {otp.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className="w-12 h-14 text-center text-xl font-semibold bg-[#0f1729] border-gray-600 text-white focus:border-[#4c5fd5]"
              disabled={isLoading || timeRemaining <= 0}
              aria-label={`Digit ${index + 1}`}
            />
          ))}
        </div>

        <div className="flex justify-between items-center">
          <p className={`text-xs font-medium ${timeRemaining <= 60 ? "text-red-600" : "text-gray-300"}`}>
            OTP Expires in {formatTime(timeRemaining)}
          </p>
          <div className="text-sm text-gray-300">
            {resendCooldown > 0 ? (
              <span>Resend code in {resendCooldown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="text-[#4c5fd5] hover:text-[#3d4fb5] font-medium transition-colors"
              >
                Resend OTP
              </button>
            )}
          </div>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-11 text-base font-semibold bg-[#4c5fd5] hover:bg-[#3d4fb5] text-white transition-all shadow-md hover:shadow-lg"
        disabled={isLoading || otp.join("").length !== 6 || timeRemaining <= 0}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Verifying...
          </>
        ) : (
          "Verify Code"
        )}
      </Button>
    </form>
  )
}
