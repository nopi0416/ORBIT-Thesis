/**
 * Application constants for ORBIT
 */

export const APP_NAME = "ORBIT"
export const APP_FULL_NAME = "Organizational Request and Budget Intelligence Tool"

export const REQUEST_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const

export const USER_ROLES = {
  ADMIN: "Administrator",
  MANAGER: "Manager",
  REQUESTOR: "Requestor",
} as const

export const DEPARTMENTS = ["IT Department", "HR Department", "Marketing", "Operations", "Finance", "Sales"] as const
