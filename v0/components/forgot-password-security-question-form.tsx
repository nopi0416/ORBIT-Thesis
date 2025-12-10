"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"
import { getUsersFromStorage } from "@/lib/auth"
import React from "react"

interface ForgotPasswordSecurityQuestionFormProps {
  email: string
}

export function ForgotPasswordSecurityQuestionForm({ email }: ForgotPasswordSecurityQuestionFormProps) {
  const router = useRouter()
  const [answer, setAnswer] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [question, setQuestion] = useState("")

  // Get a random security question from the user's saved questions
  React.useEffect(() => {
    const users = getUsersFromStorage()
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase())

    if (user && user.securityQuestions && user.securityQuestions.length > 0) {
      // Pick a random question from the user's security questions
      const randomIndex = Math.floor(Math.random() * user.securityQuestions.length)
      setQuestion(user.securityQuestions[randomIndex].question)
    }
  }, [email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!answer.trim()) {
      setError("Please enter your answer")
      return
    }

    setIsLoading(true)

    try {
      const users = getUsersFromStorage()
      const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase())

      if (!user || !user.securityQuestions) {
        setError("Unable to verify your identity")
        return
      }

      // Find the matching security question and verify the answer
      const matchingQuestion = user.securityQuestions.find((q) => q.question === question)

      if (!matchingQuestion) {
        setError("Security question not found")
        return
      }

      // Check if the answer matches (case-insensitive)
      if (matchingQuestion.answer.toLowerCase() === answer.toLowerCase().trim()) {
        // Answer is correct, redirect to reset password
        router.push(`/reset-password?email=${encodeURIComponent(email)}`)
      } else {
        setError("Incorrect answer. Please try again.")
      }
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

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-white">Security Question</Label>
          <div className="p-4 bg-[#0f1729] border border-gray-600 rounded-lg">
            <p className="text-white font-medium">{question || "Loading..."}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="answer" className="text-sm font-medium text-white">
            Your Answer
          </Label>
          <Input
            id="answer"
            type="text"
            placeholder="Enter your answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="h-11 bg-[#0f1729] border-gray-600 text-white placeholder:text-gray-400 focus:border-[#4c5fd5]"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="p-4 bg-[#0f1729] border border-gray-600 rounded-lg">
        <p className="text-sm text-gray-300">
          Please answer the security question to verify your identity and proceed with resetting your password.
        </p>
      </div>

      <Button
        type="submit"
        className="w-full h-11 text-base font-semibold bg-[#4c5fd5] hover:bg-[#3d4fb5] text-white transition-all shadow-md hover:shadow-lg"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Verifying...
          </>
        ) : (
          "Verify Answer"
        )}
      </Button>
    </form>
  )
}
