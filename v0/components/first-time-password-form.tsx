"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSession, updateUserPassword, getDashboardPath } from "@/lib/auth"
import { Eye, EyeOff, Lock, AlertCircle, Loader2, Check, X } from "lucide-react"

interface FirstTimePasswordFormProps {
  email: string
  role: string
}

export function FirstTimePasswordForm({ email, role }: FirstTimePasswordFormProps) {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const hasMinLength = newPassword.length >= 8
  const hasUpperCase = /[A-Z]/.test(newPassword)
  const hasLowerCase = /[a-z]/.test(newPassword)
  const hasNumber = /[0-9]/.test(newPassword)
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0

  const isPasswordValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSymbol && passwordsMatch

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (currentPassword !== "demo123") {
      setError("Current password is incorrect")
      return
    }

    if (!isPasswordValid) {
      setError("Please ensure all password requirements are met")
      return
    }

    setIsLoading(true)

    try {
      const session = getSession()
      if (!session) {
        router.push("/")
        return
      }

      updateUserPassword(session.userId, newPassword)
      router.push(getDashboardPath(role))
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="current-password" className="text-sm font-medium text-white">
          Current Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
          <Input
            id="current-password"
            type={showCurrentPassword ? "text" : "password"}
            placeholder="Enter current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="pl-10 pr-10 h-11 bg-[#0f1729] border-gray-600 text-white placeholder:text-gray-400 focus:border-[#4c5fd5]"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white transition-colors"
            disabled={isLoading}
          >
            {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-password" className="text-sm font-medium text-white">
          New Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
          <Input
            id="new-password"
            type={showNewPassword ? "text" : "password"}
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="pl-10 pr-10 h-11 bg-[#0f1729] border-gray-600 text-white placeholder:text-gray-400 focus:border-[#4c5fd5]"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white transition-colors"
            disabled={isLoading}
          >
            {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password" className="text-sm font-medium text-white">
          Confirm New Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
          <Input
            id="confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="pl-10 pr-10 h-11 bg-[#0f1729] border-gray-600 text-white placeholder:text-gray-400 focus:border-[#4c5fd5]"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white transition-colors"
            disabled={isLoading}
          >
            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="p-4 bg-[#0f1729] border border-gray-600 rounded-lg space-y-2">
        <p className="text-sm font-medium text-gray-300 mb-3">Password Requirements:</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            {hasMinLength ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-gray-400" />}
            <span className={hasMinLength ? "text-green-400" : "text-gray-400"}>At least 8 characters</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {hasUpperCase ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-gray-400" />}
            <span className={hasUpperCase ? "text-green-400" : "text-gray-400"}>One uppercase letter</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {hasLowerCase ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-gray-400" />}
            <span className={hasLowerCase ? "text-green-400" : "text-gray-400"}>One lowercase letter</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {hasNumber ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-gray-400" />}
            <span className={hasNumber ? "text-green-400" : "text-gray-400"}>One number</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {hasSymbol ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-gray-400" />}
            <span className={hasSymbol ? "text-green-400" : "text-gray-400"}>One special character</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {passwordsMatch ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-gray-400" />}
            <span className={passwordsMatch ? "text-green-400" : "text-gray-400"}>Passwords match</span>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-11 text-base font-semibold bg-[#4c5fd5] hover:bg-[#3d4fb5] text-white transition-all shadow-md hover:shadow-lg"
        disabled={isLoading || !isPasswordValid}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Creating Password...
          </>
        ) : (
          "Complete Setup"
        )}
      </Button>
    </form>
  )
}
