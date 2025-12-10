"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { login } from "@/lib/auth"
import { Eye, EyeOff, Lock, User, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {}

    // Email validation
    if (!email) {
      errors.email = "Username is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid username"
    }

    // Password validation
    if (!password) {
      errors.password = "Password is required"
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters"
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setFieldErrors({})

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const result = await login(email, password)

      if (result.success && result.session) {
        router.push(`/verify-otp?email=${encodeURIComponent(email)}&role=${result.session.role}`)
      } else {
        setError(result.error || "Login failed. Please try again.")
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-white">
          Username
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
          <Input
            id="email"
            type="email"
            placeholder="Enter your username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`pl-10 h-11 bg-[#0f1729] border-gray-700 text-white placeholder:text-gray-400 focus:bg-[#1a2332] focus:border-[#4c5fd5] ${fieldErrors.email ? "border-destructive" : ""}`}
            disabled={isLoading}
            autoComplete="email"
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
          />
        </div>
        {fieldErrors.email && (
          <p id="email-error" className="text-sm text-destructive animate-in fade-in slide-in-from-top-1">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-white">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`pl-10 pr-10 h-11 bg-[#0f1729] border-gray-700 text-white placeholder:text-gray-400 focus:bg-[#1a2332] focus:border-[#4c5fd5] ${fieldErrors.password ? "border-destructive" : ""}`}
            disabled={isLoading}
            autoComplete="current-password"
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white transition-colors"
            disabled={isLoading}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {fieldErrors.password && (
          <p id="password-error" className="text-sm text-destructive animate-in fade-in slide-in-from-top-1">
            {fieldErrors.password}
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-[#4c5fd5] hover:text-[#3d4fb5] transition-colors">
          Forgot Password?
        </Link>
      </div>

      <Button
        type="submit"
        className="w-full h-11 text-base font-semibold bg-[#4c5fd5] hover:bg-[#3d4fb5] text-white transition-all shadow-md hover:shadow-lg"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </Button>

      <div className="text-center pt-2">
        <Link
          href="/support-ticket"
          className="text-sm text-gray-300 hover:text-white transition-colors inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          Need help? Submit a support ticket
        </Link>
      </div>
    </form>
  )
}
