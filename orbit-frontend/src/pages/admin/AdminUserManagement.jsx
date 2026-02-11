"use client"

import { useState, useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import * as XLSX from "xlsx"
import {
  createUser,
  createAdminUser,
  getAvailableRoles,
  getAvailableOrganizations,
  getAvailableGeos,
  getAllUsers,
  updateUser,
  updateUserStatus,
} from "../../services/userService"
import { useAuth } from "../../context/AuthContext"

export default function UserManagement() {
  const location = useLocation()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("users")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterOU, setFilterOU] = useState("all")
  const [filterRole, setFilterRole] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [addUserTab, setAddUserTab] = useState("individual")
  const [showEditModal, setShowEditModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [confirmAction, setConfirmAction] = useState(null)
  const [isConfirmingAction, setIsConfirmingAction] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [editForm, setEditForm] = useState({
    employeeId: "",
    name: "",
    email: "",
    roleId: "",
    geoId: "",
    ou: "",
    departmentId: "",
  })
  const [editErrors, setEditErrors] = useState({})
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState("")
  const [selectedUsers, setSelectedUsers] = useState([])
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)
  const [passwordConfig, setPasswordConfig] = useState({
    basePassword: "",
    isUnique: false,
    uniqueCount: 3,
    uniqueType: "numeric",
  })
  const [individualForm, setIndividualForm] = useState({
    email: "",
    role: "",
    geoId: "",
    ou: "",
    departmentId: "",
  })
  const [formErrors, setFormErrors] = useState({})
  const [availableRoles, setAvailableRoles] = useState([])
  const [availableOrganizations, setAvailableOrganizations] = useState([])
  const [availableGeos, setAvailableGeos] = useState([])
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false)
  const [isSubmittingUser, setIsSubmittingUser] = useState(false)
  const [fetchedUsers, setFetchedUsers] = useState([])
  const [lockedData, setLockedData] = useState([])
  const [deactivatedData, setDeactivatedData] = useState([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [bulkFileName, setBulkFileName] = useState("")
  const [bulkFileError, setBulkFileError] = useState("")
  const [bulkValidRows, setBulkValidRows] = useState([])
  const [bulkInvalidRows, setBulkInvalidRows] = useState([])
  const [bulkActiveTab, setBulkActiveTab] = useState("valid")
  const [bulkPreviewPage, setBulkPreviewPage] = useState(1)
  const [isProcessingBulk, setIsProcessingBulk] = useState(false)
  const [accountType, setAccountType] = useState("user")
  const [adminRole, setAdminRole] = useState("")
  const bulkFileInputRef = useRef(null)
  const hasBulkReview =
    addUserTab === "bulk" && (bulkValidRows.length > 0 || bulkInvalidRows.length > 0)

  const normalizedAdminRole = (user?.role || "").toLowerCase()
  const isSuperAdmin = normalizedAdminRole.includes("super admin")
  const isCompanyAdmin = normalizedAdminRole.includes("company admin")
  const adminOrgId = user?.org_id || user?.orgId || ""
  const adminRoleOptions = [
    { value: "Super Admin", label: "Super Admin" },
    { value: "Company Admin", label: "Company Admin" },
  ].filter((option) => (isSuperAdmin ? true : option.value !== "Super Admin"))

  const ouOptions = availableOrganizations.filter((org) => !org.parent_org_id)

  const departmentOptions = availableOrganizations.filter(
    (org) => org.parent_org_id && org.parent_org_id === individualForm.ou
  )

  const sanitizeAscii = (value) => value.replace(/[^\t\x20-\x7E]/g, "")

  const normalizeEmail = (value) => sanitizeAscii(value).trim()

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  const normalizeAccountType = (value) => {
    const normalized = (value || "").toString().trim().toLowerCase()
    if (!normalized) return "user"
    if (["user", "standard user", "standard"].includes(normalized)) return "user"
    if (["admin", "admin user", "administrator"].includes(normalized)) return "admin"
    return null
  }

  const normalizeAdminRole = (value) => {
    const normalized = (value || "").toString().trim().toLowerCase()
    if (!normalized) return ""
    if (["super admin", "superadmin"].includes(normalized)) return "Super Admin"
    if (["company admin", "companyadmin"].includes(normalized)) return "Company Admin"
    return null
  }

  const getRoleIdFromName = (roleName) => {
    if (!roleName) return ""
    const match = availableRoles.find((role) => (role.role_name || "").toLowerCase() === roleName.toLowerCase())
    return match?.role_id || ""
  }

  const editDepartmentOptions = availableOrganizations.filter(
    (org) => org.parent_org_id && org.parent_org_id === editForm.ou
  )

  useEffect(() => {
    const loadDropdownData = async () => {
      setIsLoadingDropdowns(true)
      try {
        const token = localStorage.getItem('authToken')

        const [roles, orgs, geos] = await Promise.all([
          getAvailableRoles(token),
          getAvailableOrganizations(token),
          getAvailableGeos(token),
        ])
        setAvailableRoles(roles)
        setAvailableOrganizations(orgs)
        setAvailableGeos(geos)
      } catch (error) {
        console.error('Error loading dropdown data:', error)
        setAvailableRoles([])
        setAvailableOrganizations([])
        setAvailableGeos([])
      } finally {
        setIsLoadingDropdowns(false)
      }
    }

    loadDropdownData()
  }, [])

  const loadUsers = async (status = null) => {
    setIsLoadingUsers(true)
    try {
      const token = localStorage.getItem('authToken')
      const users = await getAllUsers(token, status ? { status } : {})

      if (!status) {
        const normalized = users.filter((item) => {
          const statusValue = (item.status || "").toString().toLowerCase()
          return statusValue === "active" || statusValue === "first-time" || statusValue === "first_time"
        })
        setFetchedUsers(normalized)
      } else if (status === "Locked") {
        setLockedData(users)
      } else if (status === "Deactivated") {
        setDeactivatedData(users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      if (!status) setFetchedUsers([])
      if (status === "Locked") setLockedData([])
      if (status === "Deactivated") setDeactivatedData([])
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const loadUsersForTab = async (tabId) => {
    await loadUsers()
    await loadUsers("Locked")
    await loadUsers("Deactivated")
  }

  useEffect(() => {
    loadUsersForTab(activeTab)
  }, [activeTab])

  useEffect(() => {
    loadUsersForTab(activeTab)
  }, [location.key])

  useEffect(() => {
    setBulkPreviewPage(1)
  }, [bulkActiveTab, bulkValidRows.length, bulkInvalidRows.length])

  const getCurrentData = () => {
    switch (activeTab) {
      case "locked":
        return lockedData
      case "deactivated":
        return deactivatedData
      default:
        return fetchedUsers
    }
  }

  const totalPages = Math.ceil(getCurrentData().length / 10)
  const bulkPageSize = 10
  const bulkRows = bulkActiveTab === "valid" ? bulkValidRows : bulkInvalidRows
  const bulkTotalPages = Math.max(1, Math.ceil(bulkRows.length / bulkPageSize))
  const bulkPage = Math.min(bulkPreviewPage, bulkTotalPages)
  const bulkPageRows = bulkRows.slice((bulkPage - 1) * bulkPageSize, bulkPage * bulkPageSize)

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUsers(getCurrentData().map((item) => item.id))
    } else {
      setSelectedUsers([])
    }
  }

  const handleSelectUser = (id) => {
    setSelectedUsers((prev) => (prev.includes(id) ? prev.filter((userId) => userId !== id) : [...prev, id]))
  }

  const handleBulkAction = (action) => {
    if (action === "reset") {
      setShowPasswordResetModal(true)
    } else {
      setConfirmAction({ type: action, count: selectedUsers.length })
      setShowConfirmModal(true)
    }
  }

  const handleRowStatusAction = (item, action) => {
    if (item.userType === 'admin') {
      setNotificationMessage("✗ Error: Admin accounts cannot be updated here")
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 6000)
      return
    }

    setSelectedUsers([item.id])
    setConfirmAction({ type: action, count: 1 })
    setShowConfirmModal(true)
  }

  const openEditModal = (item) => {
    if (item.userType === 'admin') {
      setNotificationMessage("✗ Error: Admin accounts cannot be edited here")
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 6000)
      return
    }

    setSelectedUser(item)
    setEditErrors({})
    setEditForm({
      employeeId: item.employeeId || "",
      name: item.name || "",
      email: item.email || "",
      roleId: item.roleId || getRoleIdFromName(item.role),
      geoId: item.geoId || "",
      ou: item.orgId || "",
      departmentId: item.departmentId || "",
    })
    setShowEditModal(true)
  }

  const handleEditUser = async () => {
    if (!selectedUser) return

    const errors = {}
    if (!editForm.name) errors.name = "Name is required"
    if (!editForm.email) errors.email = "Email is required"
    if (editForm.email && !isValidEmail(editForm.email)) errors.email = "Invalid email"
    if (!editForm.roleId) errors.roleId = "Role is required"
    if (!editForm.geoId) errors.geoId = "Geo is required"
    if (!editForm.ou) errors.ou = "OU is required"
    if (!editForm.departmentId) errors.departmentId = "Department is required"

    const selectedRole = availableRoles.find((role) => role.role_id === editForm.roleId)
    if (isCompanyAdmin && selectedRole && (selectedRole.role_name || "").toLowerCase().includes("super admin")) {
      errors.roleId = "Company Admin cannot assign Super Admin role"
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors)
      return
    }

    setIsSubmittingEdit(true)
    try {
      const token = localStorage.getItem('authToken')
      const trimmedName = editForm.name.trim()
      const [firstName, ...rest] = trimmedName.split(" ")
      const lastName = rest.join(" ") || firstName

      await updateUser(
        selectedUser.id,
        {
          firstName,
          lastName,
          email: editForm.email.trim(),
          roleId: editForm.roleId,
          organizationId: editForm.ou,
          departmentId: editForm.departmentId,
          geoId: editForm.geoId,
        },
        token,
      )

      setNotificationMessage("✓ User updated successfully")
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 5000)
      setShowEditModal(false)
      setSelectedUser(null)
      await loadUsersForTab(activeTab)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update user"
      setNotificationMessage(`✗ Error: ${errorMessage}`)
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 6000)
    } finally {
      setIsSubmittingEdit(false)
    }
  }

  const handlePasswordReset = () => {
    const selectedUserData = getCurrentData().filter((t) => selectedUsers.includes(t.id))

    // Generate passwords for selected users
    const resetResults = selectedUserData.map((user, index) => {
      let password = passwordConfig.basePassword
      if (passwordConfig.isUnique) {
        const suffix = generateUniqueSuffix(index, passwordConfig.uniqueType, passwordConfig.uniqueCount)
        password = `${password}${suffix}`
      }
      return { ...user, newPassword: password }
    })

    setNotificationMessage(
      `Password reset successful for ${resetResults.length} user${resetResults.length > 1 ? "s" : ""}`,
    )
    setShowNotification(true)
    setShowPasswordResetModal(false)
    setSelectedUsers([])
    setTimeout(() => setShowNotification(false), 5000)
  }

  const generateUniqueSuffix = (index, type, count) => {
    if (type === "numeric") {
      return String(index + 1).padStart(count, "0")
    } else if (type === "alphanumeric") {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
      return Array.from({ length: count }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
    } else {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
      return Array.from({ length: count }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
    }
  }

  const normalizeHeader = (value) => (value || "").toString().trim().toLowerCase()

  const resolveByIdOrName = (value, list, idKey, nameKey, codeKey) => {
    const trimmed = (value || "").toString().trim()
    if (!trimmed) return null

    const lower = trimmed.toLowerCase()
    const byId = list.find((item) => (item[idKey] || "").toString().toLowerCase() === lower)
    if (byId) return byId[idKey]

    const byName = list.find((item) => (item[nameKey] || "").toString().toLowerCase() === lower)
    if (byName) return byName[idKey]

    if (codeKey) {
      const byCode = list.find((item) => (item[codeKey] || "").toString().toLowerCase() === lower)
      if (byCode) return byCode[idKey]
    }

    return null
  }

  const parseBulkRows = (rows) => {
    const headerRow = rows[0] || []
    const headerMap = headerRow.reduce((acc, header, index) => {
      const key = normalizeHeader(header)
      if (key) acc[key] = index
      return acc
    }, {})

    const headerAliases = {
      "account type": "account type",
      "account": "account type",
      "admin role": "admin role",
      "adminrole": "admin role",
      "employee id": "employee id",
      "employeeid": "employee id",
      "name": "name",
      "email": "email",
      "role": "role",
      "geo": "geo",
      "organizational unit": "organizational unit",
      "ou": "organizational unit",
      "department": "department",
    }

    const getIndex = (label) => {
      const direct = headerMap[label]
      if (direct !== undefined) return direct
      const alias = headerAliases[label]
      return alias ? headerMap[alias] : undefined
    }

    const requiredHeaders = [
      "account type",
      "admin role",
      "employee id",
      "name",
      "email",
      "role",
      "geo",
      "organizational unit",
      "department",
    ]
    const missingHeaders = requiredHeaders.filter((header) => getIndex(header) === undefined)
    if (missingHeaders.length > 0) {
      return { error: `Missing required columns: ${missingHeaders.join(", ")}` }
    }

    const dataRows = rows.slice(1).filter((row) => row.some((cell) => `${cell}`.trim() !== ""))
    if (dataRows.length > 100) {
      return { error: "Maximum 100 users per upload" }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const seenEmails = new Set()
    const seenEmployeeIds = new Set()
    const existingEmails = new Set(fetchedUsers.map((u) => (u.email || "").toLowerCase()))
    const existingEmployeeIds = new Set(fetchedUsers.map((u) => (u.employeeId || "").toLowerCase()))

    const valid = []
    const invalid = []

    dataRows.forEach((row, idx) => {
      const rowNumber = idx + 2
      const employeeId = (row[getIndex("employee id")] || "").toString().trim()
      const name = (row[getIndex("name")] || "").toString().trim()
      const email = (row[getIndex("email")] || "").toString().trim()
      const role = (row[getIndex("role")] || "").toString().trim()
      const geo = (row[getIndex("geo")] || "").toString().trim()
      const ou = (row[getIndex("organizational unit")] || "").toString().trim()
      const department = (row[getIndex("department")] || "").toString().trim()
      const accountTypeRaw = (row[getIndex("account type")] || "").toString().trim()
      const adminRoleRaw = (row[getIndex("admin role")] || "").toString().trim()

      const errors = []

      if (!name) errors.push("Missing Name")
      if (!email) errors.push("Missing Email")

      const normalizedAccountType = normalizeAccountType(accountTypeRaw)
      if (!normalizedAccountType) {
        errors.push("Account Type must be User or Admin")
      }

      const normalizedRowAdminRole = normalizeAdminRole(adminRoleRaw)

      if (normalizedAccountType === "admin") {
        if (!normalizedRowAdminRole) {
          errors.push("Admin Role must be Super Admin or Company Admin")
        }
        if (normalizedRowAdminRole === "Super Admin" && !isSuperAdmin) {
          errors.push("Only Super Admins can create Super Admin accounts")
        }
        if (normalizedRowAdminRole === "Company Admin" && !ou) {
          errors.push("Missing Organizational Unit")
        }
      } else if (normalizedAccountType === "user") {
        if (!employeeId) errors.push("Missing Employee ID")
        if (!role) errors.push("Missing Role")
        if (!geo) errors.push("Missing Geo")
        if (!ou) errors.push("Missing Organizational Unit")
        if (!department) errors.push("Missing Department")
      }

      if (email && !emailRegex.test(email)) errors.push("Invalid Email")

      const emailKey = email.toLowerCase()
      const employeeKey = employeeId.toLowerCase()
      if (emailKey && seenEmails.has(emailKey)) errors.push("Duplicate Email in file")
      if (employeeKey && seenEmployeeIds.has(employeeKey)) errors.push("Duplicate Employee ID in file")
      if (emailKey && existingEmails.has(emailKey)) errors.push("Email already exists")
      if (employeeKey && existingEmployeeIds.has(employeeKey)) errors.push("Employee ID already exists")

      if (emailKey) seenEmails.add(emailKey)
      if (employeeKey) seenEmployeeIds.add(employeeKey)

      const roleId = resolveByIdOrName(role, availableRoles, "role_id", "role_name")
      if (role && !roleId) errors.push("Role not found")

      if (normalizedAccountType === "user" && role && role.toLowerCase().includes("admin")) {
        errors.push("Admin roles require Account Type = Admin")
      }

      const geoId = resolveByIdOrName(geo, availableGeos, "geo_id", "geo_name", "geo_code")
      if (geo && !geoId) errors.push("Geo not found")

      const orgId = resolveByIdOrName(ou, availableOrganizations, "organization_id", "org_name")
      if (ou && !orgId) errors.push("Organization not found")

      const departmentId = resolveByIdOrName(department, availableOrganizations, "organization_id", "org_name")
      if (department && !departmentId) errors.push("Department not found")

      if (orgId && departmentId) {
        const departmentOrg = availableOrganizations.find((org) => org.organization_id === departmentId)
        if (departmentOrg?.parent_org_id && departmentOrg.parent_org_id !== orgId) {
          errors.push("Department does not belong to selected OU")
        }
      }

      if (isCompanyAdmin && normalizedAccountType === "user") {
        if (adminOrgId && orgId && orgId !== adminOrgId) {
          errors.push("Company Admin can only add users to their own OU")
        }
      }

      if (isCompanyAdmin && normalizedAccountType === "admin") {
        if (normalizedRowAdminRole === "Super Admin") {
          errors.push("Only Super Admins can create Super Admin accounts")
        }
        if (normalizedRowAdminRole === "Company Admin" && adminOrgId && orgId && orgId !== adminOrgId) {
          errors.push("Company Admin can only create admins in their own OU")
        }
      }

      const entry = {
        rowNumber,
        accountType: normalizedAccountType || accountTypeRaw,
        adminRole: normalizedRowAdminRole || adminRoleRaw,
        employeeId,
        name,
        email,
        role,
        geo,
        ou,
        department,
      }

      if (errors.length > 0) {
        invalid.push({ ...entry, errors })
      } else {
        valid.push({ ...entry, roleId, geoId, orgId, departmentId })
      }
    })

    return { valid, invalid }
  }

  const handleBulkFileSelect = async (file) => {
    setBulkFileError("")
    setBulkValidRows([])
    setBulkInvalidRows([])
    setBulkActiveTab("valid")

    if (!file) return

    const fileName = file.name
    const fileExtension = fileName.split(".").pop()?.toLowerCase()
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "")
    const namePattern = /^user_template_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/

    if (fileExtension !== "csv" && fileExtension !== "xlsx") {
      setBulkFileError("Invalid file type. Only .csv and .xlsx are allowed.")
      return
    }

    if (!namePattern.test(nameWithoutExt)) {
      setBulkFileError("Invalid file name. Use user_template_YYYY-MM-DDTHH-MM-SS.")
      return
    }

    setBulkFileName(fileName)
    setIsProcessingBulk(true)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: "array" })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" })

      const result = parseBulkRows(rows)
      if (result.error) {
        setBulkFileError(result.error)
      } else {
        setBulkValidRows(result.valid)
        setBulkInvalidRows(result.invalid)
      }
    } catch (error) {
      console.error("Error reading bulk file:", error)
      setBulkFileError("Failed to read file. Please check the file format.")
    } finally {
      setIsProcessingBulk(false)
    }
  }

  const handleBulkDrop = (event) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    handleBulkFileSelect(file)
  }

  const handleBulkImport = async () => {
    if (bulkValidRows.length === 0) {
      setNotificationMessage("✗ Error: No valid rows to import")
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 6000)
      return
    }

    setIsProcessingBulk(true)
    const token = localStorage.getItem('authToken')
    let successCount = 0
    const failed = []

    for (const row of bulkValidRows) {
      try {
        if ((row.accountType || "").toString().toLowerCase() === "admin") {
          await createAdminUser(
            {
              fullName: row.name,
              email: row.email,
              adminRole: row.adminRole,
              orgId: row.orgId,
            },
            token
          )
        } else {
          await createUser(
            {
              employeeId: row.employeeId,
              name: row.name,
              email: row.email,
              role: row.roleId,
              geoId: row.geoId,
              ou: row.orgId,
              departmentId: row.departmentId,
            },
            token
          )
        }
        successCount += 1
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to create user"
        failed.push({ ...row, errors: [errorMessage] })
      }
    }

    const remainingInvalid = [...bulkInvalidRows, ...failed]
    setBulkInvalidRows(remainingInvalid)
    setBulkValidRows([])

    if (successCount > 0) {
      setNotificationMessage(`✓ ${successCount} user${successCount > 1 ? "s" : ""} added successfully`)
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 5000)
      await loadUsersForTab(activeTab)
    }

    if (failed.length > 0) {
      setBulkActiveTab("invalid")
      setNotificationMessage(`✗ ${failed.length} user${failed.length > 1 ? "s" : ""} failed to import`)
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 6000)
    }

    setIsProcessingBulk(false)
  }

  const clearBulkUpload = () => {
    setBulkFileName("")
    setBulkFileError("")
    setBulkValidRows([])
    setBulkInvalidRows([])
    setBulkActiveTab("valid")
    if (bulkFileInputRef.current) {
      bulkFileInputRef.current.value = ""
    }
  }

  const handleAddIndividualUser = async () => {
    setFormErrors({})
    
    // Validate all fields are filled
    const newErrors = {}
    const isAdminAccount = accountType === "admin"

    if (!individualForm.name) newErrors.name = "Name is required"
    if (!individualForm.email) newErrors.email = "Email is required"

    if (isAdminAccount) {
      if (!adminRole) newErrors.adminRole = "Admin role is required"
      if (adminRole === "Super Admin" && !isSuperAdmin) {
        newErrors.adminRole = "Only Super Admins can create Super Admin accounts"
      }
      if (adminRole === "Company Admin" && !individualForm.ou) {
        newErrors.ou = "Organization Unit is required"
      }
    } else {
      if (!individualForm.employeeId) newErrors.employeeId = "Employee ID is required"
      if (!individualForm.role) newErrors.role = "Role is required"
      if (!individualForm.geoId) newErrors.geoId = "Geo is required"
      if (!individualForm.ou) newErrors.ou = "Organization Unit is required"
      if (!individualForm.departmentId) newErrors.departmentId = "Department is required"
    }

    if (individualForm.name && individualForm.name.length > 50) newErrors.name = "Name must be 50 characters or less"
    if (individualForm.employeeId && individualForm.employeeId.length > 15) newErrors.employeeId = "Employee ID must be 15 characters or less"
    if (individualForm.email && individualForm.email.length > 50) newErrors.email = "Email must be 50 characters or less"
    if (individualForm.email && !isValidEmail(individualForm.email)) newErrors.email = "Email format is invalid"

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors)
      return
    }

    setIsSubmittingUser(true)
    try {
      const token = localStorage.getItem('authToken')
      if (isAdminAccount) {
        await createAdminUser(
          {
            fullName: individualForm.name,
            email: individualForm.email,
            adminRole,
            orgId: individualForm.ou || null,
          },
          token
        )
      } else {
        await createUser(individualForm, token)
      }
      
      // Show success notification
      const successLabel = isAdminAccount ? "Admin" : "User"
      setNotificationMessage(`✓ ${successLabel} ${individualForm.name} added successfully!`)
      setShowNotification(true)
      
      await loadUsersForTab(activeTab)

      // Close modal and reset form on success
      setShowAddUserModal(false)
      setIndividualForm({
        employeeId: "",
        name: "",
        email: "",
        role: "",
        geoId: "",
        ou: "",
        departmentId: "",
      })
      setAccountType("user")
      setAdminRole("")
      setFormErrors({})
      
      setTimeout(() => setShowNotification(false), 5000)
    } catch (error) {
      console.error('Error creating user:', error)
      
      // Extract error message safely
      let errorMessage = "Failed to create user"
      let fieldErrors = null
      if (error instanceof Error) {
        errorMessage = error.message
        fieldErrors = error.fieldErrors || null
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error && typeof error === 'object') {
        errorMessage = error.message || error.error || JSON.stringify(error)
      }
      
      // Clean up the error message (remove JSON wrapper if present)
      if (errorMessage.includes('"error"')) {
        try {
          const parsed = JSON.parse(errorMessage)
          errorMessage = parsed.error
        } catch (e) {
          // Keep original message if not JSON
        }
      }
      
      const updatedErrors = {}
      if (fieldErrors && typeof fieldErrors === 'object') {
        Object.assign(updatedErrors, fieldErrors)
      } else {
        if (/email/i.test(errorMessage)) updatedErrors.email = errorMessage
        if (/employee id/i.test(errorMessage)) updatedErrors.employeeId = errorMessage
        if (/role/i.test(errorMessage)) updatedErrors.role = errorMessage
        if (/geo/i.test(errorMessage)) updatedErrors.geoId = errorMessage
        if (/organization/i.test(errorMessage)) updatedErrors.ou = errorMessage
        if (/department/i.test(errorMessage)) updatedErrors.departmentId = errorMessage
      }

      if (Object.keys(updatedErrors).length > 0) {
        setFormErrors((prev) => ({ ...prev, ...updatedErrors }))
      } else {
        setNotificationMessage(`✗ Error: ${errorMessage}`)
        setShowNotification(true)
        setTimeout(() => setShowNotification(false), 6000)
      }
    } finally {
      setIsSubmittingUser(false)
    }
  }

  const downloadExcelTemplate = () => {
    const now = new Date()
    const dateTime = now.toISOString().replace(/[:.]/g, "-").slice(0, -5)
    const fileName = `user_template_${dateTime}.csv`

    const headers = [
      "Account Type",
      "Admin Role",
      "Employee ID",
      "Name",
      "Email",
      "Role",
      "Geo",
      "Organizational Unit",
      "Department",
    ]
    const sampleRows = [
      ["User", "", "EMP001", "John Doe", "john@orbit.com", "Admin", "Asia Pacific", "Orbit Corp", "IT Department"],
      ["User", "", "EMP002", "Jane Smith", "jane@orbit.com", "Budget Officer", "Europe", "Orbit Corp", "HR Department"],
      ["Admin", "Company Admin", "", "Alex Admin", "alex.admin@orbit.com", "", "", "Orbit Corp", ""],
    ]

    const csvContent = [headers, ...sampleRows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", fileName)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleConfirmAction = async () => {
    if (confirmText !== "CONFIRM" || isConfirmingAction) return
    setIsConfirmingAction(true)

    const action = confirmAction.type
    const count = confirmAction.count
    let message = ""

    if (action === "edit") {
      setNotificationMessage("✗ Error: Edit is not available yet")
      setShowNotification(true)
      setShowConfirmModal(false)
      setConfirmText("")
      setSelectedUsers([])
      setTimeout(() => setShowNotification(false), 6000)
      setIsConfirmingAction(false)
      return
    }

    switch (action) {
      case "edit":
        message = `Successfully edited ${count} user${count > 1 ? "s" : ""}`
        break
      case "lock":
        message = `Successfully locked ${count} user${count > 1 ? "s" : ""}`
        break
      case "deactivate":
        message = `Successfully deactivated ${count} user${count > 1 ? "s" : ""}`
        break
      case "unlock":
        message = `Successfully unlocked ${count} user${count > 1 ? "s" : ""}`
        break
      case "reactivate":
        message = `Successfully activated ${count} user${count > 1 ? "s" : ""}`
        break
    }

    try {
      const token = localStorage.getItem('authToken')
      const selectedData = getCurrentData().filter((item) => selectedUsers.includes(item.id))
      const userIds = selectedData.filter((item) => item.userType !== 'admin').map((item) => item.id)

      if (userIds.length === 0) {
        setNotificationMessage("✗ Error: No eligible users selected")
        setShowNotification(true)
        setTimeout(() => setShowNotification(false), 6000)
        return
      }

      await updateUserStatus(userIds, action, token)
      setNotificationMessage(message)
      setShowNotification(true)
      setShowConfirmModal(false)
      setConfirmText("")
      setSelectedUsers([])
      await loadUsersForTab(activeTab)
      setTimeout(() => setShowNotification(false), 5000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update users"
      setNotificationMessage(`✗ Error: ${errorMessage}`)
      setShowNotification(true)
      setShowConfirmModal(false)
      setConfirmText("")
      setTimeout(() => setShowNotification(false), 6000)
    } finally {
      setIsConfirmingAction(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      {/* Notification - Fixed at top of viewport */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 w-full max-w-md">
          {notificationMessage.startsWith('✗') ? (
            <div className="bg-red-600/90 text-white rounded-lg p-4 shadow-xl">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-white flex-1">{notificationMessage}</p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-600/90 text-white rounded-lg p-4 shadow-xl">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-white flex-1">{notificationMessage}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 px-6 py-4 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-sm text-white/80">Manage users, roles, and access</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="px-6 py-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-1/3 relative">
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by name, employee ID, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
            />
          </div>
          <select
            value={filterOU}
            onChange={(e) => setFilterOU(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
          >
            <option value="all">Filter by OU</option>
            {ouOptions.map((org) => (
              <option key={org.organization_id} value={org.organization_id}>
                {org.org_name}
              </option>
            ))}
          </select>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
          >
            <option value="all">Filter by Role</option>
            <option value="admin">Admin</option>
            <option value="officer">Budget Officer</option>
            <option value="approver">Approver</option>
            <option value="requestor">Requestor</option>
          </select>
          <div className="flex-1" />
          <button
            onClick={() => setShowAddUserModal(true)}
            className="px-4 py-2 bg-fuchsia-600 text-white rounded-lg font-medium hover:bg-fuchsia-700 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-slate-700">
        <div className="flex gap-1">
          {[
            { id: "users", label: "Users", count: fetchedUsers.length },
            { id: "locked", label: "Locked", count: lockedData.length },
            { id: "deactivated", label: "Deactivated", count: deactivatedData.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setCurrentPage(1)
                setSelectedUsers([])
              }}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id ? "text-fuchsia-400" : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label} ({tab.count})
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-fuchsia-500" />}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-800/80 sticky top-0 z-10">
              <tr className="border-b border-slate-700">
                <th className="text-left p-3 text-xs font-medium text-slate-300">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === getCurrentData().length && getCurrentData().length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500 accent-fuchsia-500"
                  />
                </th>
                <th className="text-left p-3 text-xs font-medium text-slate-300">Employee ID</th>
                <th className="text-left p-3 text-xs font-medium text-slate-300">Name</th>
                <th className="text-left p-3 text-xs font-medium text-slate-300">Email</th>
                <th className="text-left p-3 text-xs font-medium text-slate-300">OU</th>
                <th className="text-left p-3 text-xs font-medium text-slate-300">Department</th>
                <th className="text-left p-3 text-xs font-medium text-slate-300">Geo</th>
                <th className="text-left p-3 text-xs font-medium text-slate-300">Role</th>
                <th className="text-left p-3 text-xs font-medium text-slate-300">Status</th>
                <th className="text-right p-3 text-xs font-medium text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {getCurrentData().length === 0 ? (
                <tr className="border-b border-slate-700/50">
                  <td colSpan={10} className="p-6 text-center text-sm text-slate-400">
                    No users found
                  </td>
                </tr>
              ) : (
                getCurrentData()
                  .slice((currentPage - 1) * 10, currentPage * 10)
                  .map((item) => (
                    <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(item.id)}
                          onChange={() => handleSelectUser(item.id)}
                          className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500 accent-fuchsia-500"
                        />
                      </td>
                      <td className="p-3 text-sm text-slate-300">{item.employeeId}</td>
                      <td className="p-3 text-sm text-white font-medium">{item.name}</td>
                      <td className="p-3 text-sm text-slate-300">{item.email}</td>
                      <td className="p-3 text-sm text-slate-300">{item.ou}</td>
                      <td className="p-3 text-sm text-slate-300">{item.department}</td>
                      <td className="p-3 text-sm text-slate-300">{item.geo}</td>
                      <td className="p-3 text-sm text-slate-300">{item.role}</td>
                      <td className="p-3">
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            item.status === "Active"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : item.status === "First-Time"
                                ? "bg-blue-500/20 text-blue-400"
                                : item.status === "Pending"
                                  ? "bg-amber-500/20 text-amber-400"
                                  : item.status === "Locked"
                                    ? "bg-red-500/20 text-red-400"
                                    : "bg-slate-500/20 text-slate-400"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {activeTab === "users" && (
                            <>
                              <button
                                onClick={() => {
                                  openEditModal(item)
                                }}
                                className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                                title="Edit"
                              >
                                <svg
                                  className="w-4 h-4 text-blue-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  handleRowStatusAction(item, "lock")
                                }}
                                className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                                title="Lock"
                              >
                                <svg
                                  className="w-4 h-4 text-amber-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  handleRowStatusAction(item, "deactivate")
                                }}
                                className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                                title="Deactivate"
                              >
                                <svg
                                  className="w-4 h-4 text-red-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                  />
                                </svg>
                              </button>
                            </>
                          )}
                          {activeTab === "locked" && (
                            <button
                              onClick={() => {
                                handleRowStatusAction(item, "unlock")
                              }}
                              className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                              title="Unlock"
                            >
                              <svg
                                className="w-4 h-4 text-emerald-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </button>
                          )}
                          {activeTab === "deactivated" && (
                            <button
                              onClick={() => {
                                handleRowStatusAction(item, "reactivate")
                              }}
                              className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                              title="Activate"
                            >
                              <svg
                                className="w-4 h-4 text-emerald-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination with Bulk Actions */}
        <div className="border-t border-slate-700 px-6 py-3 flex items-center justify-between bg-slate-800/50">
          <div className="flex items-center gap-2">
            {selectedUsers.length > 0 && (
              <>
                {activeTab === "users" && (
                  <>
                    <button
                      onClick={() => handleBulkAction("edit")}
                      className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded text-sm hover:bg-blue-500/30 transition-colors"
                    >
                      Edit All ({selectedUsers.length})
                    </button>
                    <button
                      onClick={() => handleBulkAction("lock")}
                      className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded text-sm hover:bg-amber-500/30 transition-colors"
                    >
                      Lock All ({selectedUsers.length})
                    </button>
                    <button
                      onClick={() => handleBulkAction("deactivate")}
                      className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded text-sm hover:bg-red-500/30 transition-colors"
                    >
                      Deactivate All ({selectedUsers.length})
                    </button>
                  </>
                )}
                {activeTab === "locked" && (
                  <button
                    onClick={() => handleBulkAction("unlock")}
                    className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded text-sm hover:bg-emerald-500/30 transition-colors"
                  >
                    Unlock All ({selectedUsers.length})
                  </button>
                )}
                {activeTab === "deactivated" && (
                  <button
                    onClick={() => handleBulkAction("reactivate")}
                    className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded text-sm hover:bg-emerald-500/30 transition-colors"
                  >
                    Activate All ({selectedUsers.length})
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showPasswordResetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-md">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Reset Password</h3>
              <p className="text-sm text-slate-400 mt-1">
                Configure new password for {selectedUsers.length} user{selectedUsers.length > 1 ? "s" : ""}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Base Password</label>
                <input
                  type="text"
                  value={passwordConfig.basePassword}
                  onChange={(e) => setPasswordConfig((prev) => ({ ...prev, basePassword: e.target.value }))}
                  placeholder="Enter base password (e.g., Orbit2025)"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="uniquePassword"
                  checked={passwordConfig.isUnique}
                  onChange={(e) => setPasswordConfig((prev) => ({ ...prev, isUnique: e.target.checked }))}
                  className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500 accent-fuchsia-500"
                />
                <label htmlFor="uniquePassword" className="text-sm text-slate-300">
                  Generate unique passwords per user
                </label>
              </div>

              {passwordConfig.isUnique && (
                <div className="space-y-3 pl-6 border-l-2 border-fuchsia-500/30">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Unique Identifier Count</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={passwordConfig.uniqueCount}
                      onChange={(e) =>
                        setPasswordConfig((prev) => ({ ...prev, uniqueCount: Number.parseInt(e.target.value) }))
                      }
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Identifier Type</label>
                    <select
                      value={passwordConfig.uniqueType}
                      onChange={(e) => setPasswordConfig((prev) => ({ ...prev, uniqueType: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    >
                      <option value="numeric">Numeric (e.g., 001, 002)</option>
                      <option value="alphanumeric">Alphanumeric (e.g., A3F, B7K)</option>
                      <option value="alphabet">Alphabet Only (e.g., ABC, DEF)</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-xs text-blue-400">
                  <strong>Preview:</strong> {passwordConfig.basePassword}
                  {passwordConfig.isUnique ? "001" : ""} (users will receive emails with their new passwords)
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPasswordResetModal(false)
                  setSelectedUsers([])
                }}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordReset}
                disabled={!passwordConfig.basePassword}
                className="px-4 py-2 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset Passwords
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Edit User</h3>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedUser(null)
                  setEditErrors({})
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-hidden p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Employee ID</label>
                  <input
                    type="text"
                    value={editForm.employeeId}
                    disabled
                    className="w-full px-3 py-2 bg-slate-700/60 border border-slate-600 rounded-lg text-white text-sm opacity-70 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: sanitizeAscii(e.target.value).slice(0, 50) })}
                    className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 ${
                      editErrors.name ? "border-red-500 focus:ring-red-500" : "border-slate-600 focus:ring-fuchsia-500"
                    }`}
                  />
                  {editErrors.name && <p className="text-xs text-red-400 mt-1">{editErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: normalizeEmail(e.target.value).slice(0, 50) })}
                    className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 ${
                      editErrors.email ? "border-red-500 focus:ring-red-500" : "border-slate-600 focus:ring-fuchsia-500"
                    }`}
                  />
                  {editErrors.email && <p className="text-xs text-red-400 mt-1">{editErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
                  <select
                    value={editForm.roleId}
                    onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })}
                    disabled={isLoadingDropdowns || availableRoles.length === 0}
                    className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 disabled:opacity-50 ${
                      editErrors.roleId ? "border-red-500 focus:ring-red-500" : "border-slate-600 focus:ring-fuchsia-500"
                    }`}
                  >
                    <option value="">Select role</option>
                    {availableRoles.map((role) => {
                      const isSuperAdminRole = (role.role_name || "").toLowerCase().includes("super admin")
                      const isDisabled = isCompanyAdmin && isSuperAdminRole
                      return (
                        <option key={role.role_id} value={role.role_id} disabled={isDisabled}>
                          {role.role_name}
                        </option>
                      )
                    })}
                  </select>
                  {editErrors.roleId && <p className="text-xs text-red-400 mt-1">{editErrors.roleId}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Geo</label>
                  <select
                    value={editForm.geoId}
                    onChange={(e) => setEditForm({ ...editForm, geoId: e.target.value })}
                    disabled={isLoadingDropdowns || availableGeos.length === 0}
                    className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 disabled:opacity-50 ${
                      editErrors.geoId ? "border-red-500 focus:ring-red-500" : "border-slate-600 focus:ring-fuchsia-500"
                    }`}
                  >
                    <option value="">Select geo</option>
                    {availableGeos.map((geo) => (
                      <option key={geo.geo_id} value={geo.geo_id}>
                        {geo.geo_name || geo.geo_code}
                      </option>
                    ))}
                  </select>
                  {editErrors.geoId && <p className="text-xs text-red-400 mt-1">{editErrors.geoId}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Organizational Unit</label>
                  <select
                    value={editForm.ou}
                    onChange={(e) => setEditForm({ ...editForm, ou: e.target.value, departmentId: "" })}
                    disabled={isLoadingDropdowns || ouOptions.length === 0}
                    className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 disabled:opacity-50 ${
                      editErrors.ou ? "border-red-500 focus:ring-red-500" : "border-slate-600 focus:ring-fuchsia-500"
                    }`}
                  >
                    <option value="">Select OU</option>
                    {ouOptions.map((org) => (
                      <option key={org.organization_id} value={org.organization_id}>
                        {org.org_name}
                      </option>
                    ))}
                  </select>
                  {editErrors.ou && <p className="text-xs text-red-400 mt-1">{editErrors.ou}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Department</label>
                  <select
                    value={editForm.departmentId}
                    onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                    disabled={!editForm.ou || editDepartmentOptions.length === 0}
                    className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 disabled:opacity-50 ${
                      editErrors.departmentId ? "border-red-500 focus:ring-red-500" : "border-slate-600 focus:ring-fuchsia-500"
                    }`}
                  >
                    <option value="">{editForm.ou ? "Select Department" : "Select OU first"}</option>
                    {editDepartmentOptions.map((org) => (
                      <option key={org.organization_id} value={org.organization_id}>
                        {org.org_name}
                      </option>
                    ))}
                  </select>
                  {editErrors.departmentId && <p className="text-xs text-red-400 mt-1">{editErrors.departmentId}</p>}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-700 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedUser(null)
                  setEditErrors({})
                }}
                disabled={isSubmittingEdit}
                className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleEditUser}
                disabled={isSubmittingEdit}
                className="px-6 py-2 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmittingEdit && (
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isSubmittingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`flex w-full ${hasBulkReview ? "max-w-[1400px] gap-6 items-stretch" : "max-w-2xl justify-center"}`}>
            <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Add User</h3>
              <button
                onClick={() => {
                  setShowAddUserModal(false)
                  setIndividualForm({
                    employeeId: "",
                    name: "",
                    email: "",
                    role: "",
                    geoId: "",
                    ou: "",
                    departmentId: "",
                  })
                  setAccountType("user")
                  setAdminRole("")
                  setFormErrors({})
                  clearBulkUpload()
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-700 px-6">
              <button
                onClick={() => {
                  clearBulkUpload()
                  setAddUserTab("individual")
                }}
                className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                  addUserTab === "individual" ? "text-fuchsia-400" : "text-slate-400 hover:text-white"
                }`}
              >
                Individual Add
                {addUserTab === "individual" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-fuchsia-500" />}
              </button>
              <button
                onClick={() => {
                  setAddUserTab("bulk")
                  setAccountType("user")
                  setAdminRole("")
                }}
                className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                  addUserTab === "bulk" ? "text-fuchsia-400" : "text-slate-400 hover:text-white"
                }`}
              >
                Bulk Add
                {addUserTab === "bulk" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-fuchsia-500" />}
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-6">
              {addUserTab === "individual" ? (
                // Individual Add Form
                <div className="space-y-4">
                  {formErrors.general && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <p className="text-sm text-red-400">{formErrors.general}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Account Type</label>
                      <select
                        value={accountType}
                        onChange={(e) => {
                          const nextType = e.target.value
                          setAccountType(nextType)
                          if (nextType === "admin") {
                            setIndividualForm({
                              ...individualForm,
                              employeeId: "",
                              role: "",
                              geoId: "",
                              departmentId: "",
                            })
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                      >
                        <option value="user">Standard User</option>
                        <option value="admin">Admin User</option>
                      </select>
                    </div>

                    {accountType !== "admin" && (
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Employee ID</label>
                        <input
                          type="text"
                          value={individualForm.employeeId}
                          onChange={(e) => {
                            const sanitized = sanitizeAscii(e.target.value).slice(0, 15)
                            setIndividualForm({ ...individualForm, employeeId: sanitized })
                          }}
                          placeholder="Enter employee ID"
                          maxLength={15}
                          className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 ${
                            formErrors.employeeId
                              ? "border-red-500 focus:ring-red-500"
                              : "border-slate-600 focus:ring-fuchsia-500"
                          }`}
                        />
                        {formErrors.employeeId && <p className="text-xs text-red-400 mt-1">{formErrors.employeeId}</p>}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                      <input
                        type="text"
                        value={individualForm.name}
                        onChange={(e) => {
                          const sanitized = sanitizeAscii(e.target.value).slice(0, 50)
                          setIndividualForm({ ...individualForm, name: sanitized })
                        }}
                        placeholder="Enter full name"
                        maxLength={50}
                        className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 ${
                          formErrors.name
                            ? "border-red-500 focus:ring-red-500"
                            : "border-slate-600 focus:ring-fuchsia-500"
                        }`}
                      />
                      {formErrors.name && <p className="text-xs text-red-400 mt-1">{formErrors.name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                      <input
                        type="email"
                        value={individualForm.email}
                        onChange={(e) => {
                          const sanitized = normalizeEmail(e.target.value).slice(0, 50)
                          setIndividualForm({ ...individualForm, email: sanitized })
                        }}
                        placeholder="Enter email address"
                        maxLength={50}
                        className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 ${
                          formErrors.email
                            ? "border-red-500 focus:ring-red-500"
                            : "border-slate-600 focus:ring-fuchsia-500"
                        }`}
                      />
                      {formErrors.email && <p className="text-xs text-red-400 mt-1">{formErrors.email}</p>}
                    </div>

                    {accountType === "admin" ? (
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Admin Role</label>
                        <select
                          value={adminRole}
                          onChange={(e) => {
                            const nextRole = e.target.value
                            setAdminRole(nextRole)
                            if (nextRole === "Super Admin") {
                              setIndividualForm({
                                ...individualForm,
                                ou: "",
                                departmentId: "",
                              })
                            }
                          }}
                          className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 ${
                            formErrors.adminRole
                              ? "border-red-500 focus:ring-red-500"
                              : "border-slate-600 focus:ring-fuchsia-500"
                          }`}
                        >
                          <option value="">Select admin role</option>
                          {adminRoleOptions.map((roleOption) => (
                            <option key={roleOption.value} value={roleOption.value}>
                              {roleOption.label}
                            </option>
                          ))}
                        </select>
                        {formErrors.adminRole && <p className="text-xs text-red-400 mt-1">{formErrors.adminRole}</p>}
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
                          <select
                            value={individualForm.role}
                            onChange={(e) => {
                              setIndividualForm({ ...individualForm, role: e.target.value })
                            }}
                            disabled={isLoadingDropdowns || availableRoles.length === 0}
                            className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 disabled:opacity-50 ${
                              formErrors.role
                                ? "border-red-500 focus:ring-red-500"
                                : "border-slate-600 focus:ring-fuchsia-500"
                            }`}
                          >
                            <option value="">{isLoadingDropdowns ? "Loading..." : "Select role"}</option>
                            {availableRoles.map((role) => (
                              <option key={role.role_id} value={role.role_id}>
                                {role.role_name}
                              </option>
                            ))}
                          </select>
                          {formErrors.role && <p className="text-xs text-red-400 mt-1">{formErrors.role}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Geo</label>
                          <select
                            value={individualForm.geoId}
                            onChange={(e) => {
                              setIndividualForm({ ...individualForm, geoId: e.target.value })
                            }}
                            disabled={isLoadingDropdowns || availableGeos.length === 0}
                            className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 disabled:opacity-50 ${
                              formErrors.geoId
                                ? "border-red-500 focus:ring-red-500"
                                : "border-slate-600 focus:ring-fuchsia-500"
                            }`}
                          >
                            <option value="">{isLoadingDropdowns ? "Loading..." : "Select geo"}</option>
                            {availableGeos.map((geo) => (
                              <option key={geo.geo_id} value={geo.geo_id}>
                                {geo.geo_name || geo.geo_code}
                              </option>
                            ))}
                          </select>
                          {formErrors.geoId && <p className="text-xs text-red-400 mt-1">{formErrors.geoId}</p>}
                        </div>
                      </>
                    )}
                  </div>

                  {(accountType !== "admin" || adminRole === "Company Admin") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Organizational Unit</label>
                        <select
                          value={individualForm.ou}
                          onChange={(e) => {
                            setIndividualForm({ ...individualForm, ou: e.target.value, departmentId: "" })
                          }}
                          disabled={isLoadingDropdowns || ouOptions.length === 0}
                          className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 disabled:opacity-50 ${
                            formErrors.ou
                              ? "border-red-500 focus:ring-red-500"
                              : "border-slate-600 focus:ring-fuchsia-500"
                          }`}
                        >
                          <option value="">{isLoadingDropdowns ? "Loading..." : "Select OU"}</option>
                          {ouOptions.map((org) => (
                            <option key={org.organization_id} value={org.organization_id}>
                              {org.org_name}
                            </option>
                          ))}
                        </select>
                        {formErrors.ou && <p className="text-xs text-red-400 mt-1">{formErrors.ou}</p>}
                      </div>

                      {accountType !== "admin" ? (
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Department</label>
                          <select
                            value={individualForm.departmentId}
                            onChange={(e) => {
                              setIndividualForm({ ...individualForm, departmentId: e.target.value })
                            }}
                            disabled={!individualForm.ou || departmentOptions.length === 0}
                            className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 disabled:opacity-50 ${
                              formErrors.departmentId
                                ? "border-red-500 focus:ring-red-500"
                                : "border-slate-600 focus:ring-fuchsia-500"
                            }`}
                          >
                            <option value="">{individualForm.ou ? "Select Department" : "Select OU first"}</option>
                            {departmentOptions.map((org) => (
                              <option key={org.organization_id} value={org.organization_id}>
                                {org.org_name}
                              </option>
                            ))}
                          </select>
                          {formErrors.departmentId && <p className="text-xs text-red-400 mt-1">{formErrors.departmentId}</p>}
                        </div>
                      ) : (
                        <div />
                      )}
                    </div>
                  )}
                </div>
              ) : (
                // Bulk Add Form
                <div className="space-y-4">
                  <button
                    onClick={downloadExcelTemplate}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19v-7m0 0V5m0 7H5m7 0h7" />
                    </svg>
                    Download Template
                  </button>

                  <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-slate-300 mb-2">File Format Requirements</h4>
                    <ul className="text-xs text-slate-400 space-y-1">
                      <li>• File must be in CSV or Excel format (.csv, .xlsx)</li>
                      <li>• File name must match: user_template_YYYY-MM-DDTHH-MM-SS</li>
                      <li>• Required columns: Account Type, Admin Role, Employee ID, Name, Email, Role, Geo, Organizational Unit, Department</li>
                      <li>• Ensure all email addresses are valid and unique</li>
                    </ul>
                  </div>

                  <input
                    ref={bulkFileInputRef}
                    type="file"
                    accept=".csv,.xlsx"
                    className="hidden"
                    onChange={(event) => handleBulkFileSelect(event.target.files?.[0])}
                  />

                  <div
                    className="border-2 border-dashed border-slate-600 rounded-lg p-5 text-center hover:border-fuchsia-500 transition-colors cursor-pointer"
                    onClick={() => bulkFileInputRef.current?.click()}
                    onDrop={handleBulkDrop}
                    onDragOver={(event) => event.preventDefault()}
                  >
                    <svg
                      className="w-10 h-10 text-slate-400 mx-auto mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 16v-8m0 0l-3 3m3-3l3 3M4 12a8 8 0 1116 0 8 8 0 01-16 0z"
                      />
                    </svg>
                    <p className="text-slate-300 text-sm font-medium">Drop your file here or click to browse</p>
                    <p className="text-slate-400 text-xs mt-1">Supported formats: CSV, XLSX</p>
                  </div>

                  {(bulkFileName || bulkFileError) && (
                    <div className="rounded-lg border border-slate-600 bg-slate-800/60 p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        {bulkFileName && <p className="text-slate-200">Selected file: {bulkFileName}</p>}
                        <button
                          type="button"
                          onClick={clearBulkUpload}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          Remove upload
                        </button>
                      </div>
                      {bulkFileError && <p className="text-red-400 mt-1">{bulkFileError}</p>}
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-700 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddUserModal(false)
                  setIndividualForm({
                    employeeId: "",
                    name: "",
                    email: "",
                    role: "",
                    geoId: "",
                    ou: "",
                    departmentId: "",
                  })
                  setAccountType("user")
                  setAdminRole("")
                  setFormErrors({})
                  clearBulkUpload()
                }}
                disabled={isSubmittingUser}
                className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={addUserTab === "individual" ? handleAddIndividualUser : handleBulkImport}
                disabled={
                  isSubmittingUser ||
                  (addUserTab === "individual" && isLoadingDropdowns) ||
                  (addUserTab === "bulk" && (isProcessingBulk || bulkValidRows.length === 0 || !!bulkFileError))
                }
                className="px-6 py-2 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {(isSubmittingUser || (addUserTab === "bulk" && isProcessingBulk)) && (
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {addUserTab === "individual"
                  ? isSubmittingUser
                    ? "Adding..."
                    : "Add User"
                  : isProcessingBulk
                    ? "Uploading..."
                    : "Upload Users"}
              </button>
            </div>
            </div>

            {hasBulkReview && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-xl flex flex-col w-full max-w-3xl max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                  <h4 className="text-sm font-semibold text-white">Bulk Upload Review</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setBulkActiveTab("valid")}
                      className={`px-3 py-1.5 text-xs font-medium rounded ${
                        bulkActiveTab === "valid"
                          ? "text-emerald-400 bg-emerald-500/10"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Valid ({bulkValidRows.length})
                    </button>
                    <button
                      onClick={() => setBulkActiveTab("invalid")}
                      className={`px-3 py-1.5 text-xs font-medium rounded ${
                        bulkActiveTab === "invalid"
                          ? "text-red-400 bg-red-500/10"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Invalid ({bulkInvalidRows.length})
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-800/80 sticky top-0">
                      <tr className="border-b border-slate-700">
                        <th className="text-left px-3 py-3 text-slate-300">Row</th>
                        <th className="text-left px-3 py-3 text-slate-300">Account Type</th>
                        <th className="text-left px-3 py-3 text-slate-300">Admin Role</th>
                        <th className="text-left px-3 py-3 text-slate-300">Employee ID</th>
                        <th className="text-left px-3 py-3 text-slate-300">Name</th>
                        <th className="text-left px-3 py-3 text-slate-300">Email</th>
                        <th className="text-left px-3 py-3 text-slate-300">Role</th>
                        <th className="text-left px-3 py-3 text-slate-300">Geo</th>
                        <th className="text-left px-3 py-3 text-slate-300">OU</th>
                        <th className="text-left px-3 py-3 text-slate-300">Department</th>
                        {bulkActiveTab === "invalid" && (
                          <th className="text-left px-3 py-3 text-slate-300">Issues</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPageRows.map((row) => (
                        <tr key={`${bulkActiveTab}-${row.rowNumber}-${row.email}`} className="border-b border-slate-700/50">
                          <td className="px-3 py-3 text-slate-300">{row.rowNumber}</td>
                          <td className="px-3 py-3 text-slate-300">{row.accountType || ""}</td>
                          <td className="px-3 py-3 text-slate-300">{row.adminRole || ""}</td>
                          <td className="px-3 py-3 text-slate-300">{row.employeeId}</td>
                          <td className="px-3 py-3 text-slate-200">{row.name}</td>
                          <td className="px-3 py-3 text-slate-300">{row.email}</td>
                          <td className="px-3 py-3 text-slate-300">{row.role}</td>
                          <td className="px-3 py-3 text-slate-300">{row.geo}</td>
                          <td className="px-3 py-3 text-slate-300">{row.ou}</td>
                          <td className="px-3 py-3 text-slate-300">{row.department}</td>
                          {bulkActiveTab === "invalid" && (
                            <td
                              className="px-3 py-3 text-red-400 max-w-[260px] truncate align-top"
                              title={row.errors?.join(", ")}
                            >
                              {row.errors?.join(", ")}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-slate-700 px-4 py-3 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Page {bulkPage} of {bulkTotalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setBulkPreviewPage((page) => Math.max(1, page - 1))}
                      disabled={bulkPage <= 1}
                      className="px-2 py-1 rounded bg-slate-700/60 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setBulkPreviewPage((page) => Math.min(bulkTotalPages, page + 1))}
                      disabled={bulkPage >= bulkTotalPages}
                      className="px-2 py-1 rounded bg-slate-700/60 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-sm">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Confirm Action</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-300 mb-4">
                Are you sure you want to {confirmAction?.type} {confirmAction?.count} user{confirmAction?.count > 1 ? "s" : ""}?
              </p>
              <p className="text-sm text-slate-400 mb-4">Type "CONFIRM" to proceed:</p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type CONFIRM"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 mb-4"
              />
            </div>
            <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  setConfirmText("")
                }}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={confirmText !== "CONFIRM" || isConfirmingAction}
                className="px-4 py-2 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isConfirmingAction && (
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isConfirmingAction ? "Confirming..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
