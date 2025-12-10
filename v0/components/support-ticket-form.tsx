"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, User, AlertCircle, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export function SupportTicketForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [issueType, setIssueType] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name || !email || !issueType || !description) {
      setError("Please fill in all fields")
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address")
      return
    }

    if (description.length < 10) {
      setError("Please provide more details about your issue (at least 10 characters)")
      return
    }

    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setIsSubmitted(true)
    setIsLoading(false)
  }

  if (isSubmitted) {
    return (
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-white">Ticket Submitted Successfully!</h3>
          <p className="text-gray-300">
            We've received your support request. Our team will review it and contact you at{" "}
            <span className="font-medium text-white">{email}</span> within 24-48 hours.
          </p>
          <p className="text-sm text-gray-400 pt-2">
            Ticket ID: #{Math.random().toString(36).substr(2, 9).toUpperCase()}
          </p>
        </div>
        <Button
          onClick={() => router.push("/")}
          className="w-full h-11 text-base font-semibold bg-[#4c5fd5] hover:bg-[#3d4fb5] text-white transition-all shadow-md hover:shadow-lg"
        >
          Return to Login
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!isSubmitted && (
        <p className="text-gray-300 text-sm text-center mb-6">
          We're here to help. Submit a ticket and our team will assist you shortly.
        </p>
      )}

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

      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium text-white">
          Full Name
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="pl-10 h-11 bg-[#0f1729] border-gray-600 text-white placeholder:text-gray-400 focus:border-[#4c5fd5]"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-white">
          Email Address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
          <Input
            id="email"
            type="email"
            placeholder="your.email@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10 h-11 bg-[#0f1729] border-gray-600 text-white placeholder:text-gray-400 focus:border-[#4c5fd5]"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="issueType" className="text-sm font-medium text-white">
          Issue Type
        </Label>
        <Select value={issueType} onValueChange={setIssueType} disabled={isLoading}>
          <SelectTrigger className="h-11 bg-[#0f1729] border-gray-600 text-white">
            <SelectValue placeholder="Select issue type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="forgot-password">Forgot Password</SelectItem>
            <SelectItem value="forgot-security-questions">Forgot Security Questions/Answers</SelectItem>
            <SelectItem value="login-trouble">Trouble Logging In</SelectItem>
            <SelectItem value="account-locked">Account Locked</SelectItem>
            <SelectItem value="other">Other Issue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium text-white">
          Description
        </Label>
        <Textarea
          id="description"
          placeholder="Please describe your issue in detail..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[120px] bg-[#0f1729] border-gray-600 text-white placeholder:text-gray-400 focus:border-[#4c5fd5] resize-none"
          disabled={isLoading}
        />
        <p className="text-xs text-gray-400">{description.length} characters</p>
      </div>

      <Button
        type="submit"
        className="w-full h-11 text-base font-semibold bg-[#4c5fd5] hover:bg-[#3d4fb5] text-white transition-all shadow-md hover:shadow-lg"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Ticket"
        )}
      </Button>
    </form>
  )
}
