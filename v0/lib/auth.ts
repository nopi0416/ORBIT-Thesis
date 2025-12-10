"use client"

// Mock user database with hashed passwords (in production, use bcrypt)
export interface User {
  id: string
  email: string
  password: string // In production, this would be hashed
  role: "requester" | "l1-approver" | "l2-approver" | "l3-approver" | "payroll" | "admin"
  name: string
  employeeId?: string
  isFirstLogin: boolean
  hasAcceptedAgreement: boolean
  hasSetupSecurityQuestions: boolean
  hasChangedPassword: boolean
  securityQuestions?: Array<{ question: string; answer: string }>
}

// Demo users for each role (password for all: "demo123")
export const MOCK_USERS: User[] = [
  {
    id: "1",
    email: "requester@orbit.com",
    password: "demo123",
    role: "requester",
    name: "John Requester",
    employeeId: "EMP001",
    isFirstLogin: true,
    hasAcceptedAgreement: false,
    hasSetupSecurityQuestions: false,
    hasChangedPassword: false,
  },
  {
    id: "2",
    email: "l1@orbit.com",
    password: "demo123",
    role: "l1-approver",
    name: "Sarah L1 Approver",
    employeeId: "EMP002",
    isFirstLogin: true,
    hasAcceptedAgreement: false,
    hasSetupSecurityQuestions: false,
    hasChangedPassword: false,
  },
  {
    id: "3",
    email: "l2@orbit.com",
    password: "demo123",
    role: "l2-approver",
    name: "Mike L2 Approver",
    employeeId: "EMP003",
    isFirstLogin: true,
    hasAcceptedAgreement: false,
    hasSetupSecurityQuestions: false,
    hasChangedPassword: false,
  },
  {
    id: "4",
    email: "l3@orbit.com",
    password: "demo123",
    role: "l3-approver",
    name: "Lisa L3 Approver",
    employeeId: "EMP004",
    isFirstLogin: true,
    hasAcceptedAgreement: false,
    hasSetupSecurityQuestions: false,
    hasChangedPassword: false,
  },
  {
    id: "5",
    email: "payroll@orbit.com",
    password: "demo123",
    role: "payroll",
    name: "David Payroll",
    employeeId: "EMP005",
    isFirstLogin: true,
    hasAcceptedAgreement: false,
    hasSetupSecurityQuestions: false,
    hasChangedPassword: false,
  },
  {
    id: "6",
    email: "admin@orbit.com",
    password: "demo123",
    role: "admin",
    name: "Emma Administrator",
    employeeId: "EMP006",
    isFirstLogin: true,
    hasAcceptedAgreement: false,
    hasSetupSecurityQuestions: false,
    hasChangedPassword: false,
  },
]

export interface LoginAttempt {
  email: string
  timestamp: number
  success: boolean
}

export interface AuditLog {
  id: string
  userId: string
  email: string
  action: "login" | "logout" | "failed_login"
  timestamp: number
  ipAddress: string
  userAgent: string
}

// Rate limiting: Track login attempts
const LOGIN_ATTEMPTS_KEY = "orbit_login_attempts"
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes

export function getLoginAttempts(email: string): LoginAttempt[] {
  if (typeof window === "undefined") return []
  const attempts = localStorage.getItem(`${LOGIN_ATTEMPTS_KEY}_${email}`)
  return attempts ? JSON.parse(attempts) : []
}

export function addLoginAttempt(email: string, success: boolean) {
  if (typeof window === "undefined") return
  const attempts = getLoginAttempts(email)
  const now = Date.now()

  // Remove attempts older than lockout duration
  const recentAttempts = attempts.filter((attempt) => now - attempt.timestamp < LOCKOUT_DURATION)

  recentAttempts.push({ email, timestamp: now, success })
  localStorage.setItem(`${LOGIN_ATTEMPTS_KEY}_${email}`, JSON.stringify(recentAttempts))
}

export function isAccountLocked(email: string): boolean {
  const attempts = getLoginAttempts(email)
  const now = Date.now()

  const recentFailedAttempts = attempts.filter(
    (attempt) => !attempt.success && now - attempt.timestamp < LOCKOUT_DURATION,
  )

  return recentFailedAttempts.length >= MAX_ATTEMPTS
}

export function getRemainingLockoutTime(email: string): number {
  const attempts = getLoginAttempts(email)
  const now = Date.now()

  const recentFailedAttempts = attempts.filter(
    (attempt) => !attempt.success && now - attempt.timestamp < LOCKOUT_DURATION,
  )

  if (recentFailedAttempts.length < MAX_ATTEMPTS) return 0

  const oldestAttempt = recentFailedAttempts[0]
  const lockoutEnd = oldestAttempt.timestamp + LOCKOUT_DURATION
  return Math.max(0, lockoutEnd - now)
}

// Session management
export interface Session {
  userId: string
  email: string
  role: string
  name: string
  token: string
  expiresAt: number
}

const SESSION_KEY = "orbit_session"
const SESSION_DURATION = 30 * 60 * 1000 // 30 minutes

export function createSession(user: User): Session {
  const session: Session = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    token: generateToken(),
    expiresAt: Date.now() + SESSION_DURATION,
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }

  return session
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null

  const sessionData = localStorage.getItem(SESSION_KEY)
  if (!sessionData) return null

  const session: Session = JSON.parse(sessionData)

  // Check if session is expired
  if (Date.now() > session.expiresAt) {
    clearSession()
    return null
  }

  return session
}

export function clearSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY)
  }
}

export function refreshSession() {
  const session = getSession()
  if (session) {
    session.expiresAt = Date.now() + SESSION_DURATION
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }
}

// Audit logging
const AUDIT_LOG_KEY = "orbit_audit_logs"

export function addAuditLog(log: Omit<AuditLog, "id" | "timestamp" | "ipAddress" | "userAgent">) {
  if (typeof window === "undefined") return

  const logs = getAuditLogs()
  const newLog: AuditLog = {
    ...log,
    id: generateToken(),
    timestamp: Date.now(),
    ipAddress: "client-side", // In production, get from server
    userAgent: navigator.userAgent,
  }

  logs.push(newLog)

  // Keep only last 100 logs
  const recentLogs = logs.slice(-100)
  localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(recentLogs))
}

export function getAuditLogs(): AuditLog[] {
  if (typeof window === "undefined") return []
  const logs = localStorage.getItem(AUDIT_LOG_KEY)
  return logs ? JSON.parse(logs) : []
}

// Authentication
export async function login(
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string; session?: Session }> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Check if account is locked
  if (isAccountLocked(email)) {
    const remainingTime = getRemainingLockoutTime(email)
    const minutes = Math.ceil(remainingTime / 60000)
    return {
      success: false,
      error: `Account temporarily locked. Please try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`,
    }
  }

  // Find user
  const user = getUsersFromStorage().find((u) => u.email.toLowerCase() === email.toLowerCase())

  if (!user || user.password !== password) {
    addLoginAttempt(email, false)
    addAuditLog({
      userId: user?.id || "unknown",
      email,
      action: "failed_login",
    })

    // Generic error message for security
    return {
      success: false,
      error: "Invalid credentials. Please check your email and password.",
    }
  }

  // Successful login
  addLoginAttempt(email, true)
  const session = createSession(user)

  addAuditLog({
    userId: user.id,
    email: user.email,
    action: "login",
  })

  return {
    success: true,
    session,
  }
}

export function logout() {
  const session = getSession()
  if (session) {
    addAuditLog({
      userId: session.userId,
      email: session.email,
      action: "logout",
    })
  }
  clearSession()
}

// Utility functions
function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function getDashboardPath(role: string): string {
  return `/dashboard/${role}`
}

// First-time login flow
export function updateUserAgreement(userId: string) {
  if (typeof window === "undefined") return
  const users = getUsersFromStorage()
  const user = users.find((u) => u.id === userId)
  if (user) {
    user.hasAcceptedAgreement = true
    saveUsersToStorage(users)
  }
}

export function updateUserSecurityQuestions(userId: string, questions: Array<{ question: string; answer: string }>) {
  if (typeof window === "undefined") return
  const users = getUsersFromStorage()
  const user = users.find((u) => u.id === userId)
  if (user) {
    user.hasSetupSecurityQuestions = true
    user.securityQuestions = questions
    saveUsersToStorage(users)
  }
}

export function updateUserPassword(userId: string, newPassword: string) {
  if (typeof window === "undefined") return
  const users = getUsersFromStorage()
  const user = users.find((u) => u.id === userId)
  if (user) {
    user.hasChangedPassword = true
    user.isFirstLogin = false
    user.password = newPassword
    saveUsersToStorage(users)
  }
}

export function getUserById(userId: string): User | null {
  const users = getUsersFromStorage()
  return users.find((u) => u.id === userId) || null
}

export function getUsersFromStorage(): User[] {
  if (typeof window === "undefined") return MOCK_USERS
  const stored = localStorage.getItem("orbit_users")
  if (!stored) {
    localStorage.setItem("orbit_users", JSON.stringify(MOCK_USERS))
    return MOCK_USERS
  }
  return JSON.parse(stored)
}

function saveUsersToStorage(users: User[]) {
  if (typeof window === "undefined") return
  localStorage.setItem("orbit_users", JSON.stringify(users))
}
