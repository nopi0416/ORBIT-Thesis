"use client"

import type React from "react"
import Link from "next/link"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"
import { getSession, updateUserSecurityQuestions } from "@/lib/auth"

interface SecurityQuestionsFormProps {
  email: string
  role: string
}

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your elementary school?",
  "What is your favorite book?",
  "What was your childhood nickname?",
  "What is the name of the street you grew up on?",
  "What was your first car model?",
]

export function SecurityQuestionsForm({ email, role }: SecurityQuestionsFormProps) {
  const router = useRouter()
  const [question1, setQuestion1] = useState("")
  const [answer1, setAnswer1] = useState("")
  const [question2, setQuestion2] = useState("")
  const [answer2, setAnswer2] = useState("")
  const [question3, setQuestion3] = useState("")
  const [answer3, setAnswer3] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!question1 || !answer1 || !question2 || !answer2 || !question3 || !answer3) {
      setError("Please answer all three security questions")
      return
    }

    if (question1 === question2 || question1 === question3 || question2 === question3) {
      setError("Please select different questions for each security question")
      return
    }

    if (answer1.trim().length < 2 || answer2.trim().length < 2 || answer3.trim().length < 2) {
      setError("Answers must be at least 2 characters long")
      return
    }

    setIsLoading(true)

    try {
      const session = getSession()
      if (!session) {
        router.push("/")
        return
      }

      const questions = [
        { question: question1, answer: answer1.toLowerCase().trim() },
        { question: question2, answer: answer2.toLowerCase().trim() },
        { question: question3, answer: answer3.toLowerCase().trim() },
      ]

      updateUserSecurityQuestions(session.userId, questions)
      router.push(`/first-time-password?email=${encodeURIComponent(email)}&role=${role}`)
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
          <Label htmlFor="question1" className="text-sm font-medium text-white">
            Security Question 1
          </Label>
          <Select value={question1} onValueChange={setQuestion1}>
            <SelectTrigger className="h-11 bg-[#0f1729] border-gray-600 text-white">
              <SelectValue placeholder="Select a question" />
            </SelectTrigger>
            <SelectContent>
              {SECURITY_QUESTIONS.map((q) => (
                <SelectItem key={q} value={q}>
                  {q}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            id="answer1"
            type="text"
            placeholder="Your answer"
            value={answer1}
            onChange={(e) => setAnswer1(e.target.value)}
            className="h-11 bg-[#0f1729] border-gray-600 text-white placeholder:text-gray-400 focus:border-[#4c5fd5]"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="question2" className="text-sm font-medium text-white">
            Security Question 2
          </Label>
          <Select value={question2} onValueChange={setQuestion2}>
            <SelectTrigger className="h-11 bg-[#0f1729] border-gray-600 text-white">
              <SelectValue placeholder="Select a question" />
            </SelectTrigger>
            <SelectContent>
              {SECURITY_QUESTIONS.map((q) => (
                <SelectItem key={q} value={q} disabled={q === question1}>
                  {q}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            id="answer2"
            type="text"
            placeholder="Your answer"
            value={answer2}
            onChange={(e) => setAnswer2(e.target.value)}
            className="h-11 bg-[#0f1729] border-gray-600 text-white placeholder:text-gray-400 focus:border-[#4c5fd5]"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="question3" className="text-sm font-medium text-white">
            Security Question 3
          </Label>
          <Select value={question3} onValueChange={setQuestion3}>
            <SelectTrigger className="h-11 bg-[#0f1729] border-gray-600 text-white">
              <SelectValue placeholder="Select a question" />
            </SelectTrigger>
            <SelectContent>
              {SECURITY_QUESTIONS.map((q) => (
                <SelectItem key={q} value={q} disabled={q === question1 || q === question2}>
                  {q}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            id="answer3"
            type="text"
            placeholder="Your answer"
            value={answer3}
            onChange={(e) => setAnswer3(e.target.value)}
            className="h-11 bg-[#0f1729] border-gray-600 text-white placeholder:text-gray-400 focus:border-[#4c5fd5]"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="p-4 bg-[#0f1729] border border-gray-600 rounded-lg">
        <p className="text-sm text-gray-300">
          These security questions will be used to verify your identity if you need to recover your account. Please
          choose questions you can easily remember.
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
            Saving...
          </>
        ) : (
          "Continue"
        )}
      </Button>

      <div className="text-center">
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
          Can't answer these questions? Get help
        </Link>
      </div>
    </form>
  )
}
