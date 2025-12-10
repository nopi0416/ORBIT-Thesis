"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff, Check, X } from "lucide-react"
import Link from "next/link"

interface ResetPasswordFormProps {
  email: string
}

export function ResetPasswordForm({ email }: ResetPasswordFormProps) {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long"
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter"
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter"
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number"
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return "Password must contain at least one symbol"
    }
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required")
      return
    }

    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      setError(passwordError)
      return
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match")
      return
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from current password")
      return
    }

    setIsLoading(true)

    // Simulate password reset
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Redirect to login page with success message
    router.push("/?reset=success")
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
        {/* Current Password */}
        <div className="space-y-2">
          <Label htmlFor="current-password" className="text-sm font-medium text-white">
            Current Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
            <Input
              id="current-password"
              type={showCurrentPassword ? "text" : "password"}
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="pl-10 pr-10 h-11 bg-[#0f1729] border-gray-600 text-white placeholder:text-gray-400 focus:border-[#4c5fd5]"
              disabled={isLoading}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
            >
              {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div className="space-y-2">
          <Label htmlFor="new-password" className="text-sm font-medium text-white">
            New Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
            <Input
              id="new-password"
              type={showNewPassword ? "text" : "password"}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-10 pr-10 h-11 bg-[#0f1729] border-gray-600 text-white placeholder:text-gray-400 focus:border-[#4c5fd5]"
              disabled={isLoading}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
            >
              {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirm-password" className="text-sm font-medium text-white">
            Confirm New Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 pr-10 h-11 bg-[#0f1729] border-gray-600 text-white placeholder:text-gray-400 focus:border-[#4c5fd5]"
              disabled={isLoading}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Password Requirements */}
        <div className="bg-[#0f1729] border border-gray-600 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium text-gray-300 mb-3">Password Requirements:</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {newPassword.length >= 8 ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-gray-400" />
              )}
              <span className={newPassword.length >= 8 ? "text-green-400" : "text-gray-400"}>
                At least 8 characters
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {/[A-Z]/.test(newPassword) ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-gray-400" />
              )}
              <span className={/[A-Z]/.test(newPassword) ? "text-green-400" : "text-gray-400"}>
                One uppercase letter
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {/[a-z]/.test(newPassword) ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-gray-400" />
              )}
              <span className={/[a-z]/.test(newPassword) ? "text-green-400" : "text-gray-400"}>
                One lowercase letter
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {/[0-9]/.test(newPassword) ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-gray-400" />
              )}
              <span className={/[0-9]/.test(newPassword) ? "text-green-400" : "text-gray-400"}>One number</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword) ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-gray-400" />
              )}
              <span
                className={/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword) ? "text-green-400" : "text-gray-400"}
              >
                One special character
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {newPassword === confirmPassword && confirmPassword.length > 0 ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-gray-400" />
              )}
              <span
                className={
                  newPassword === confirmPassword && confirmPassword.length > 0 ? "text-green-400" : "text-gray-400"
                }
              >
                Passwords match
              </span>
            </div>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-11 text-base font-semibold bg-[#4c5fd5] hover:bg-[#3d4fb5] text-white transition-all shadow-md hover:shadow-lg"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Resetting Password...
          </>
        ) : (
          "Reset Password"
        )}
      </Button>
    </form>
  )
}
