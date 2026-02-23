import supabase, { supabaseSecondary } from '../config/database.js';
import { getUserDetailsFromUUID } from '../utils/userMapping.js';
import { sendApprovalNotificationEmail } from '../config/email.js';

/**
 * Approval Request Service
 * Handles all database operations for budget approval requests
 * Manages the multi-level approval workflow system
 */

export class ApprovalRequestService {
  static defaultCompanyId = 'caaa0000-0000-0000-0000-000000000001';

  static async getUserNameMap(userIds = []) {
    const uniqueIds = Array.from(new Set((userIds || []).filter(Boolean)));
    if (!uniqueIds.length) return new Map();

    const { data, error } = await supabase
      .from('tblusers')
      .select('user_id, first_name, last_name')
      .in('user_id', uniqueIds);

    if (error) throw error;

    return new Map(
      (data || []).map((user) => [
        user.user_id,
        `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      ])
    );
  }

  static async getUserEmailMap(userIds = []) {
    const uniqueIds = Array.from(new Set((userIds || []).filter(Boolean)));
    if (!uniqueIds.length) return new Map();

    const { data, error } = await supabase
      .from('tblusers')
      .select('user_id, first_name, last_name, email')
      .in('user_id', uniqueIds);

    if (error) throw error;

    return new Map(
      (data || []).map((user) => [
        user.user_id,
        {
          email: user.email,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        },
      ])
    );
  }

  static formatCurrency(value) {
    return `₱${Number(value || 0).toLocaleString()}`;
  }

  static async sendApprovalNotification({ recipients = [], subject, html, text }) {
    if (!recipients.length) return;

    const uniqueRecipients = Array.from(new Set((recipients || []).filter(Boolean)));
    if (!uniqueRecipients.length) return;

    const results = await Promise.allSettled(
      uniqueRecipients.map((recipient) =>
        sendApprovalNotificationEmail({
          to: recipient,
          subject,
          html,
          text,
        })
      )
    );

    const failedCount = results.filter((result) => result.status === 'rejected').length;
    if (failedCount > 0) {
      console.warn(`[email] ${failedCount} notification email(s) failed to send.`);
    }
  }

  static formatRoleLabel(roleName) {
    const value = String(roleName || '').trim();
    if (!value) return 'User';
    return value
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  static resolveOrgRoot(orgId, orgMap) {
    if (!orgId || !orgMap?.size) return null;

    let current = orgId;
    const visited = new Set();
    while (current && !visited.has(current)) {
      visited.add(current);
      const row = orgMap.get(current);
      if (!row?.parent_org_id) return current;
      current = row.parent_org_id;
    }

    return current || null;
  }

  static async getOrganizationMap() {
    const { data, error } = await supabase
      .from('tblorganization')
      .select('org_id, parent_org_id');

    if (error) throw error;

    return new Map((data || []).map((row) => [row.org_id, row]));
  }

  static async getUserProfileMap(userIds = []) {
    const uniqueIds = Array.from(new Set((userIds || []).filter(Boolean)));
    if (!uniqueIds.length) return new Map();

    const { data: users, error: usersError } = await supabase
      .from('tblusers')
      .select('user_id, first_name, last_name, email, org_id')
      .in('user_id', uniqueIds);

    if (usersError) throw usersError;

    const { data: userRoles, error: roleError } = await supabase
      .from('tbluserroles')
      .select(`
        user_id,
        is_active,
        tblroles:role_id ( role_name )
      `)
      .in('user_id', uniqueIds)
      .eq('is_active', true);

    if (roleError) throw roleError;

    const rolesByUser = new Map();
    (userRoles || []).forEach((row) => {
      const roleName = row?.tblroles?.role_name;
      if (!roleName) return;
      const existing = rolesByUser.get(row.user_id) || [];
      existing.push(roleName);
      rolesByUser.set(row.user_id, existing);
    });

    return new Map(
      (users || []).map((user) => {
        const roles = rolesByUser.get(user.user_id) || [];
        const primaryRole = roles[0] || null;
        return [
          user.user_id,
          {
            user_id: user.user_id,
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || user.user_id,
            email: user.email || null,
            org_id: user.org_id || null,
            role_name: primaryRole,
            roles,
          },
        ];
      })
    );
  }

  static async getPayrollUsersByParentOrg(parentOrgId, orgMap) {
    if (!parentOrgId) return [];

    const { data, error } = await supabase
      .from('tbluserroles')
      .select(`
        user_id,
        is_active,
        tblroles!inner ( role_name ),
        tblusers!inner ( user_id, first_name, last_name, email, org_id )
      `)
      .eq('is_active', true)
      .ilike('tblroles.role_name', '%payroll%');

    if (error) throw error;

    const result = [];
    (data || []).forEach((entry) => {
      const userObj = Array.isArray(entry.tblusers) ? entry.tblusers[0] : entry.tblusers;
      const roleObj = Array.isArray(entry.tblroles) ? entry.tblroles[0] : entry.tblroles;
      if (!userObj?.user_id) return;

      const userParent = this.resolveOrgRoot(userObj.org_id, orgMap);
      if (userParent !== parentOrgId) return;

      result.push({
        user_id: userObj.user_id,
        name: `${userObj.first_name || ''} ${userObj.last_name || ''}`.trim() || userObj.email || userObj.user_id,
        email: userObj.email || null,
        org_id: userObj.org_id || null,
        role_name: roleObj?.role_name || 'PAYROLL',
      });
    });

    return result;
  }

  static async insertNotificationRows({
    requestId,
    notificationType,
    title,
    message,
    recipientIds = [],
    profileMap,
    relatedApprovalLevel = null,
  }) {
    const uniqueRecipientIds = Array.from(new Set((recipientIds || []).filter(Boolean)));
    if (!uniqueRecipientIds.length) return;

    const now = new Date().toISOString();
    const rows = uniqueRecipientIds.map((recipientId) => ({
      request_id: requestId,
      notification_type: notificationType,
      title,
      message,
      recipient_id: recipientId,
      recipient_email: profileMap?.get(recipientId)?.email || null,
      is_sent: true,
      sent_date: now,
      is_read: false,
      related_approval_level: relatedApprovalLevel,
      created_at: now,
    }));

    if (rows.length) {
      const { error } = await supabase
        .from('tblbudgetapprovalrequests_notifications')
        .insert(rows);

      if (error) throw error;
    }
  }

  static async getNotificationContext(requestId) {
    const { data: request, error: requestError } = await supabase
      .from('tblbudgetapprovalrequests')
      .select('request_id, request_number, budget_id, submitted_by, created_by, total_request_amount, description')
      .eq('request_id', requestId)
      .single();

    if (requestError) throw requestError;

    const { data: budget, error: budgetError } = await supabase
      .from('tblbudgetconfiguration')
      .select('budget_id, budget_name, created_by')
      .eq('budget_id', request.budget_id)
      .maybeSingle();

    if (budgetError) throw budgetError;

    const { data: approvers, error: approverError } = await supabase
      .from('tblbudgetconfig_approvers')
      .select('approval_level, primary_approver, backup_approver')
      .eq('budget_id', request.budget_id);

    if (approverError) throw approverError;

    const recipientIds = new Set([
      request.submitted_by,
      request.created_by,
      budget?.created_by,
      ...(approvers || []).flatMap((row) => [row.primary_approver, row.backup_approver]),
    ].filter(Boolean));

    const profileMap = await this.getUserProfileMap(Array.from(recipientIds));
    const orgMap = await this.getOrganizationMap();

    const ownerProfile =
      profileMap.get(request.submitted_by) ||
      profileMap.get(request.created_by) ||
      null;
    const parentOrgId = this.resolveOrgRoot(ownerProfile?.org_id || null, orgMap);

    const scopedRecipients = Array.from(recipientIds).filter((recipientId) => {
      if (!parentOrgId) return true;
      const profile = profileMap.get(recipientId);
      const recipientParent = this.resolveOrgRoot(profile?.org_id || null, orgMap);
      return recipientParent === parentOrgId;
    });

    return {
      request,
      budget,
      approvers: approvers || [],
      profileMap,
      parentOrgId,
      orgMap,
      scopedRecipients,
    };
  }

  static async sendSubmissionNotifications(requestId) {
    try {
      const context = await this.getNotificationContext(requestId);
      const submittedBy = context.request?.submitted_by || context.request?.created_by;
      const actor = context.profileMap.get(submittedBy);
      const actorName = actor?.name || 'A user';
      const actorRole = this.formatRoleLabel(actor?.role_name);
      const budgetName = context.budget?.budget_name || 'Unknown Budget';

      const message = `${actorName} (${actorRole}) has submitted an approval request for budget configuration ${budgetName}.`;

      await this.insertNotificationRows({
        requestId,
        notificationType: 'submitted',
        title: 'Approval Request Submitted',
        message,
        recipientIds: context.scopedRecipients,
        profileMap: context.profileMap,
        relatedApprovalLevel: 1,
      });

      const recipients = context.scopedRecipients
        .map((id) => context.profileMap.get(id)?.email)
        .filter(Boolean);

      if (!recipients.length) return;

      const subject = `ORBIT Approval Submitted: ${context.request?.request_number || requestId}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #111827;">Approval Request Submitted</h2>
          <p>${message}</p>
          <p><strong>Request #:</strong> ${context.request?.request_number || '—'}</p>
          <p><strong>Amount:</strong> ${this.formatCurrency(context.request?.total_request_amount)}</p>
          <p><strong>Description:</strong> ${context.request?.description || '—'}</p>
        </div>
      `;

      await this.sendApprovalNotification({ recipients, subject, html });
    } catch (error) {
      console.warn('[email] Failed to send submission notifications:', error?.message || error);
    }
  }

  static async includeActorRecipient(context, actorId) {
    const recipientIds = new Set([...(context?.scopedRecipients || [])]);
    const profileMap = new Map(context?.profileMap || []);
    let actorProfile = actorId ? profileMap.get(actorId) : null;

    if (actorId && !actorProfile) {
      try {
        const actorMap = await this.getUserProfileMap([actorId]);
        const fetchedProfile = actorMap.get(actorId);
        if (fetchedProfile) {
          profileMap.set(actorId, fetchedProfile);
          actorProfile = fetchedProfile;
        }
      } catch (error) {
        console.warn('[email] Failed to resolve actor profile for notification:', error?.message || error);
      }
    }

    if (actorId) {
      recipientIds.add(actorId);
    }

    return {
      recipientIds: Array.from(recipientIds),
      profileMap,
      actorProfile,
    };
  }

  static async sendApprovalStepNotifications({ requestId, approvalLevel, payrollCycle, payrollCycleDate, approvedBy = null }) {
    try {
      const context = await this.getNotificationContext(requestId);
      const {
        recipientIds,
        profileMap,
        actorProfile,
      } = await this.includeActorRecipient(context, approvedBy);

      const actor = actorProfile || (approvedBy ? profileMap.get(approvedBy) : null);
      const actorName = actor?.name || 'An approver';
      const actorRole = this.formatRoleLabel(actor?.role_name);
      const budgetName = context.budget?.budget_name || 'Unknown Budget';

      const message = `${actorName} (${actorRole}) has approved this approval request for budget configuration ${budgetName}.`;

      await this.insertNotificationRows({
        requestId,
        notificationType: 'approved',
        title: 'Approval Request Updated',
        message,
        recipientIds,
        profileMap,
        relatedApprovalLevel: Number(approvalLevel),
      });

      const subject = `ORBIT Approval Update: ${context.request?.request_number || requestId}`;
      const payrollLine = payrollCycle
        ? `<p><strong>Payroll Cycle:</strong> ${payrollCycle} (${payrollCycleDate || '—'})</p>`
        : '';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #111827;">Approval Update</h2>
          <p>${message}</p>
          <p><strong>Request #:</strong> ${context.request?.request_number || '—'}</p>
          <p><strong>Amount:</strong> ${this.formatCurrency(context.request?.total_request_amount)}</p>
          ${payrollLine}
          <p><strong>Description:</strong> ${context.request?.description || '—'}</p>
        </div>
      `;

      const recipients = recipientIds
        .map((id) => profileMap.get(id)?.email)
        .filter(Boolean);

      if (recipients.length) {
        await this.sendApprovalNotification({ recipients, subject, html });
      }

      const normalizedLevel = Number(approvalLevel);
      if (normalizedLevel === 3 && context.parentOrgId) {
        const { data: l1ToL3, error: approvalsError } = await supabase
          .from('tblbudgetapprovalrequests_approvals')
          .select('approval_level, status')
          .eq('request_id', requestId)
          .in('approval_level', [1, 2, 3]);

        if (approvalsError) throw approvalsError;

        const allApproved = Array.isArray(l1ToL3)
          && l1ToL3.length > 0
          && l1ToL3.every((row) => String(row.status || '').toLowerCase() === 'approved');

        if (allApproved) {
          const payrollUsers = await this.getPayrollUsersByParentOrg(context.parentOrgId, context.orgMap);
          const payrollIds = payrollUsers.map((user) => user.user_id).filter(Boolean);

          if (payrollIds.length) {
            const payrollProfileMap = new Map(payrollUsers.map((user) => [user.user_id, user]));
            const payrollMessage = `All approvers have approved this approval request for budget configuration ${budgetName}. Payroll action is now required.`;

            await this.insertNotificationRows({
              requestId,
              notificationType: 'payroll_action_required',
              title: 'Payroll Action Required',
              message: payrollMessage,
              recipientIds: payrollIds,
              profileMap: payrollProfileMap,
              relatedApprovalLevel: 4,
            });

            const payrollRecipients = payrollUsers.map((row) => row.email).filter(Boolean);
            if (payrollRecipients.length) {
              await this.sendApprovalNotification({
                recipients: payrollRecipients,
                subject: `ORBIT Payroll Action Required: ${context.request?.request_number || requestId}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #111827;">Payroll Action Required</h2>
                    <p>${payrollMessage}</p>
                    <p><strong>Request #:</strong> ${context.request?.request_number || '—'}</p>
                    <p><strong>Amount:</strong> ${this.formatCurrency(context.request?.total_request_amount)}</p>
                  </div>
                `,
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn('[email] Failed to send approval step notifications:', error?.message || error);
    }
  }

  static async sendCompletionNotifications({ requestId, completedBy = null, completionNotes = '' }) {
    try {
      const context = await this.getNotificationContext(requestId);
      const {
        recipientIds,
        profileMap,
        actorProfile,
      } = await this.includeActorRecipient(context, completedBy);

      const actor = actorProfile || (completedBy ? profileMap.get(completedBy) : null);
      const actorName = actor?.name || 'Payroll';
      const actorRole = this.formatRoleLabel(actor?.role_name || 'payroll');
      const budgetName = context.budget?.budget_name || 'Unknown Budget';

      const message = `${actorName} (${actorRole}) has marked this approval request as payment completed for budget configuration ${budgetName}.`;

      await this.insertNotificationRows({
        requestId,
        notificationType: 'completed',
        title: 'Payment Completed',
        message,
        recipientIds,
        profileMap,
        relatedApprovalLevel: 4,
      });

      const recipients = recipientIds
        .map((id) => profileMap.get(id)?.email)
        .filter(Boolean);

      if (!recipients.length) return;

      const subject = `ORBIT Payment Completed: ${context.request?.request_number || requestId}`;
      const notesLine = completionNotes
        ? `<p><strong>Completion Notes:</strong> ${completionNotes}</p>`
        : '';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #111827;">Payment Completed</h2>
          <p>${message}</p>
          <p><strong>Request #:</strong> ${context.request?.request_number || '—'}</p>
          <p><strong>Amount:</strong> ${this.formatCurrency(context.request?.total_request_amount)}</p>
          ${notesLine}
          <p><strong>Description:</strong> ${context.request?.description || '—'}</p>
        </div>
      `;

      await this.sendApprovalNotification({ recipients, subject, html });
    } catch (error) {
      console.warn('[email] Failed to send completion notifications:', error?.message || error);
    }
  }

  static computeLineItemCounts(lineItems = []) {
    const lineItemsCount = Array.isArray(lineItems) ? lineItems.length : 0;
    const deductionCount = Array.isArray(lineItems)
      ? lineItems.filter((item) => Boolean(item?.is_deduction)).length
      : 0;
    const toBePaidCount = Math.max(0, lineItemsCount - deductionCount);

    return { lineItemsCount, deductionCount, toBePaidCount };
  }

  static computeApprovalStageStatus(approvals = [], overallStatus = '') {
    const normalizedOverall = String(overallStatus || '').toLowerCase();

    if (normalizedOverall === 'rejected' || normalizedOverall === 'completed') {
      return normalizedOverall;
    }

    const rejected = (approvals || []).find(
      (approval) => String(approval?.status || '').toLowerCase() === 'rejected'
    );
    if (rejected) return 'rejected';

    const statusByLevel = new Map(
      (approvals || []).map((approval) => [
        Number(approval?.approval_level),
        String(approval?.status || '').toLowerCase(),
      ])
    );

    const l1Approved = statusByLevel.get(1) === 'approved';
    const l2Approved = statusByLevel.get(2) === 'approved';
    const l3Approved = statusByLevel.get(3) === 'approved';
    const payrollStatus = statusByLevel.get(4);
    const payrollApproved = payrollStatus === 'approved' || payrollStatus === 'completed';

    if (payrollStatus === 'completed') return 'completed';

    if (payrollApproved) return 'pending_payment_completion';
    if (l1Approved && l2Approved && l3Approved) return 'pending_payroll_approval';
    if (normalizedOverall === 'draft') return 'draft';

    return 'ongoing_approval';
  }

  static parseStoredList(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
      }
    }
    return [value];
  }

  static normalizeScopeText(value = '') {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  static normalizeTenureGroup(value = '') {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/_/g, '')
      .replace(/\+/g, 'plus')
      .replace(/[^a-z0-9\-]/g, '');

    if (!normalized) return '';
    if (normalized.includes('0-6')) return '0-6months';
    if (normalized.includes('6-12')) return '6-12months';
    if (normalized.includes('1-2')) return '1-2years';
    if (normalized.includes('2-5')) return '2-5years';
    if (normalized.includes('5plus') || normalized.includes('5-plus')) return '5plus-years';
    return normalized;
  }

  static getTenureGroupFromHireDate(hireDateValue) {
    if (!hireDateValue) return null;
    const hireDate = new Date(hireDateValue);
    if (Number.isNaN(hireDate.getTime())) return null;

    const now = new Date();
    const months = (now.getFullYear() - hireDate.getFullYear()) * 12 + (now.getMonth() - hireDate.getMonth());

    if (months < 6) return '0-6months';
    if (months < 12) return '6-12months';
    if (months < 24) return '1-2years';
    if (months < 60) return '2-5years';
    return '5plus-years';
  }

  static async validateRequestTenureScope(requestId) {
    const { data: requestData, error: requestError } = await supabase
      .from('tblbudgetapprovalrequests')
      .select('request_id, budget_id')
      .eq('request_id', requestId)
      .maybeSingle();

    if (requestError) throw requestError;
    if (!requestData?.budget_id) {
      return { success: false, error: 'Budget configuration is missing for this request.' };
    }

    const { data: configData, error: configError } = await supabase
      .from('tblbudgetconfiguration')
      .select('tenure_group')
      .eq('budget_id', requestData.budget_id)
      .maybeSingle();

    if (configError) throw configError;

    const allowedTenureGroups = Array.from(
      new Set(
        this.parseStoredList(configData?.tenure_group)
          .map((item) => this.normalizeTenureGroup(item))
          .filter(Boolean)
      )
    );

    if (!allowedTenureGroups.length) {
      return { success: true, valid: true };
    }

    const { data: lineItems, error: lineItemsError } = await supabase
      .from('tblbudgetapprovalrequests_line_items')
      .select('item_number, employee_id, hire_date')
      .eq('request_id', requestId)
      .order('item_number', { ascending: true });

    if (lineItemsError) throw lineItemsError;

    const invalidItems = (lineItems || [])
      .map((item) => {
        const resolvedGroup = this.getTenureGroupFromHireDate(item?.hire_date);
        const valid = Boolean(resolvedGroup && allowedTenureGroups.includes(resolvedGroup));
        return {
          employeeId: item?.employee_id || `Item ${item?.item_number || 'N/A'}`,
          resolvedGroup,
          valid,
          hireDate: item?.hire_date || null,
        };
      })
      .filter((item) => !item.valid);

    if (!invalidItems.length) {
      return { success: true, valid: true };
    }

    const preview = invalidItems
      .slice(0, 5)
      .map((item) => `${item.employeeId} (${item.resolvedGroup || 'invalid/missing hire date'})`)
      .join(', ');

    return {
      success: true,
      valid: false,
      error: `Tenure group validation failed. Employees out of scope: ${preview}${invalidItems.length > 5 ? '...' : ''}`,
    };
  }

  static async validateRequestLocationScope(requestId) {
    const { data: requestData, error: requestError } = await supabase
      .from('tblbudgetapprovalrequests')
      .select('request_id, budget_id')
      .eq('request_id', requestId)
      .maybeSingle();

    if (requestError) throw requestError;
    if (!requestData?.budget_id) {
      return { success: false, error: 'Budget configuration is missing for this request.' };
    }

    const { data: configData, error: configError } = await supabase
      .from('tblbudgetconfiguration')
      .select('location')
      .eq('budget_id', requestData.budget_id)
      .maybeSingle();

    if (configError) throw configError;

    const allowedLocations = Array.from(
      new Set(
        this.parseStoredList(configData?.location)
          .map((item) => this.normalizeScopeText(item))
          .filter(Boolean)
      )
    );

    if (!allowedLocations.length || allowedLocations.includes('all')) {
      return { success: true, valid: true };
    }

    const allowedLocationSet = new Set(allowedLocations);

    const { data: lineItems, error: lineItemsError } = await supabase
      .from('tblbudgetapprovalrequests_line_items')
      .select('item_number, employee_id, Location')
      .eq('request_id', requestId)
      .order('item_number', { ascending: true });

    if (lineItemsError) throw lineItemsError;

    const invalidItems = (lineItems || [])
      .map((item) => {
        const resolvedLocation = this.normalizeScopeText(item?.Location || '');
        const valid = Boolean(resolvedLocation && allowedLocationSet.has(resolvedLocation));

        return {
          employeeId: item?.employee_id || `Item ${item?.item_number || 'N/A'}`,
          resolvedLocation,
          valid,
        };
      })
      .filter((item) => !item.valid);

    if (!invalidItems.length) {
      return { success: true, valid: true };
    }

    const preview = invalidItems
      .slice(0, 5)
      .map((item) => `${item.employeeId} (${item.resolvedLocation || 'missing location'})`)
      .join(', ');

    return {
      success: true,
      valid: false,
      error: `Location scope validation failed. Employees out of scope: ${preview}${invalidItems.length > 5 ? '...' : ''}`,
    };
  }

  /**
   * Get employee details by EID and company ID
   */
  static async getEmployeeByEid(eid, companyId) {
    try {
      if (!supabaseSecondary) {
        return {
          success: false,
          error: 'Employee warehouse connection is not configured (SUPABASE_URL2/KEY2).',
        };
      }
      const company = companyId || this.defaultCompanyId;

      // Fetch employee data
      const { data: employeeData, error: employeeError } = await supabaseSecondary
        .from('tblemployee')
        .select('*')
        .eq('company_id', company)
        .eq('eid', eid)
        .maybeSingle();

      if (employeeError) throw employeeError;
      if (!employeeData) {
        return {
          success: false,
          error: 'Employee not found',
        };
      }

      // Fetch company data separately
      const { data: companyData, error: companyError } = await supabaseSecondary
        .from('tblcompany')
        .select('company_name, company_code')
        .eq('company_id', employeeData.company_id)
        .maybeSingle();

      if (companyError) {
        console.warn('Error fetching company data:', companyError);
      }

      // Merge company data into employee object
      const enrichedData = {
        ...employeeData,
        company_name: companyData?.company_name || '',
        company_code: companyData?.company_code || '',
      };

      return {
        success: true,
        data: enrichedData,
      };
    } catch (error) {
      console.error('Error fetching employee by EID:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get multiple employees by EIDs in batch (optimized for bulk uploads)
   * @param {Array<string>} eids - Array of employee IDs
   * @param {string} companyId - Company UUID
   * @returns {Object} { success: true, data: { found: [...], notFound: [...] } }
   */
  static async getEmployeesBatch(eids, companyId) {
    try {
      if (!supabaseSecondary) {
        return {
          success: false,
          error: 'Employee warehouse connection is not configured (SUPABASE_URL2/KEY2).',
        };
      }

      if (!eids || !Array.isArray(eids) || eids.length === 0) {
        return {
          success: false,
          error: 'Employee IDs array is required',
        };
      }

      const company = companyId || this.defaultCompanyId;

      // Fetch all employees in one query
      const { data: employeesData, error: employeesError } = await supabaseSecondary
        .from('tblemployee')
        .select('*')
        .eq('company_id', company)
        .in('eid', eids);

      if (employeesError) throw employeesError;

      // Get unique company IDs from found employees
      const companyIds = [...new Set(employeesData?.map(emp => emp.company_id).filter(Boolean) || [])];

      // Fetch company data for all found companies
      let companyDataMap = {};
      if (companyIds.length > 0) {
        const { data: companiesData, error: companiesError } = await supabaseSecondary
          .from('tblcompany')
          .select('company_id, company_name, company_code')
          .in('company_id', companyIds);

        if (companiesError) {
          console.warn('Error fetching company data:', companiesError);
        } else if (companiesData) {
          companyDataMap = companiesData.reduce((acc, company) => {
            acc[company.company_id] = company;
            return acc;
          }, {});
        }
      }

      // Enrich employees with company data
      const foundEmployees = (employeesData || []).map(emp => {
        const companyInfo = companyDataMap[emp.company_id] || {};
        return {
          ...emp,
          company_name: companyInfo.company_name || '',
          company_code: companyInfo.company_code || '',
        };
      });

      // Identify not found employee IDs
      const foundEids = foundEmployees.map(emp => emp.eid);
      const notFoundEids = eids.filter(eid => !foundEids.includes(eid));

      return {
        success: true,
        data: {
          found: foundEmployees,
          notFound: notFoundEids,
        },
      };
    } catch (error) {
      console.error('Error fetching employees in batch:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
  static normalizeItemType(rawType) {
    if (!rawType) return 'bonus';
    const value = String(rawType).trim().toLowerCase();
    const mapping = {
      bonus: 'bonus',
      incentive: 'incentive',
      performance_bonus: 'bonus',
      'performance bonus': 'bonus',
      spot_award: 'bonus',
      'spot award': 'bonus',
      innovation_reward: 'bonus',
      'innovation reward': 'bonus',
      recognition: 'bonus',
    };

    return mapping[value] || 'bonus';
  }

  /**
   * Create a new approval request (DRAFT status)
   */
  static async createApprovalRequest(requestData) {
    try {
      console.log('[createApprovalRequest] Creating new request:', requestData);
      
      const {
        budget_id,
        description,
        total_request_amount,
        submitted_by,
        created_by,
        client_sponsored,
        is_client_sponsored,
      } = requestData;

      // Generate request number
      const requestNumber = await this.generateRequestNumber();
      console.log('[createApprovalRequest] Generated request number:', requestNumber);

      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests')
        .insert([
          {
            budget_id,
            request_number: requestNumber,
            description,
            total_request_amount: parseFloat(total_request_amount),
            submitted_by,
            created_by,
            is_client_sponsored: is_client_sponsored ?? client_sponsored ?? false,
            overall_status: 'draft',
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) {
        console.error('[createApprovalRequest] Database error:', error);
        throw error;
      }

      console.log('[createApprovalRequest] Request created successfully:', data[0]?.request_id);

      return {
        success: true,
        data: data[0],
        message: 'Approval request created successfully',
      };
    } catch (error) {
      console.error('[createApprovalRequest] Error creating approval request:', error);
      console.error('[createApprovalRequest] Error stack:', error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate unique request number
   */
  static async generateRequestNumber() {
    try {
      const year = new Date().getFullYear();
      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests')
        .select('request_number', { count: 'exact' })
        .like('request_number', `REQ-${year}-%`);

      if (error) throw error;

      const count = data?.length || 0;
      const nextNumber = String(count + 1).padStart(6, '0');
      return `REQ-${year}-${nextNumber}`;
    } catch (error) {
      console.error('Error generating request number:', error);
      // Fallback to timestamp-based number
      return `REQ-${Date.now()}`;
    }
  }

  /**
   * Get approval request by ID with all related data
   */
  static async getApprovalRequestById(requestId) {
    try {
      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests')
        .select('*')
        .eq('request_id', requestId)
        .single();

      if (error) throw error;

      // Fetch related data in parallel
      const [lineItems, approvals, attachments, activityLog, budgetConfig] = await Promise.all([
        this.getLineItemsByRequestId(requestId),
        this.getApprovalsByRequestId(requestId),
        this.getAttachmentsByRequestId(requestId),
        this.getActivityLogByRequestId(requestId),
        data?.budget_id
          ? supabase
              .from('tblbudgetconfiguration')
              .select('budget_id, budget_name, budget_description')
              .eq('budget_id', data.budget_id)
              .single()
          : Promise.resolve({ data: null }),
      ]);

      const lineItemsData = lineItems.data || [];
      const approvalsData = approvals.data || [];
      const { lineItemsCount, deductionCount, toBePaidCount } = this.computeLineItemCounts(lineItemsData);
      const approvalStageStatus = this.computeApprovalStageStatus(approvalsData, data?.overall_status);

      let submitterName = null;
      try {
        const userMap = await this.getUserNameMap([data?.submitted_by || data?.created_by]);
        submitterName = userMap.get(data?.submitted_by || data?.created_by) || null;
      } catch (lookupError) {
        console.warn('[getApprovalRequestById] User lookup failed:', lookupError?.message || lookupError);
      }
      const submitterDetails = submitterName
        ? { name: submitterName }
        : getUserDetailsFromUUID(data?.submitted_by || data?.created_by);

      return {
        success: true,
        data: {
          ...data,
          budget_name: budgetConfig?.data?.budget_name || data?.budget_name || null,
          budget_description: budgetConfig?.data?.budget_description || data?.budget_description || null,
          line_items: lineItemsData,
          approvals: approvalsData,
          attachments: attachments.data || [],
          activity_log: activityLog.data || [],
          line_items_count: lineItemsCount,
          deduction_count: deductionCount,
          to_be_paid_count: toBePaidCount,
          approval_stage_status: approvalStageStatus,
          submitted_by_name: submitterDetails?.name || data?.submitted_by,
        },
      };
    } catch (error) {
      console.error('Error fetching approval request:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all approval requests with optional filters
   */
  static async getAllApprovalRequests(filters = {}) {
    try {
      const page = Math.max(parseInt(filters.page, 10) || 1, 1);
      const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 10, 1), 100);
      let query = supabase
        .from('tblbudgetapprovalrequests')
        .select('*');

      // Apply filters
      if (filters.budget_id) {
        query = query.eq('budget_id', filters.budget_id);
      }

      if (filters.budget_ids && Array.isArray(filters.budget_ids)) {
        query = query.in('budget_id', filters.budget_ids);
      }

      if (filters.status) {
        query = query.eq('overall_status', filters.status);
      }

      if (filters.submitted_by) {
        query = query.eq('submitted_by', filters.submitted_by);
      }

      if (filters.search) {
        query = query.or(
          `request_number.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query.order('created_at', {
        ascending: false,
      });

      if (error) throw error;

      // Get unique budget IDs from the requests
      const budgetIds = [...new Set((data || []).map(req => req.budget_id).filter(Boolean))];
      
      // Fetch budget configurations separately
      let budgetConfigMap = {};
      if (budgetIds.length > 0) {
        const { data: budgetConfigs, error: budgetError } = await supabase
          .from('tblbudgetconfiguration')
          .select('budget_id, budget_name, budget_description')
          .in('budget_id', budgetIds);
        
        if (!budgetError && budgetConfigs) {
          budgetConfigMap = budgetConfigs.reduce((acc, config) => {
            acc[config.budget_id] = config;
            return acc;
          }, {});
        }
      }

      const requestIds = (data || []).map((request) => request.request_id).filter(Boolean);
      const countsMap = new Map();
      const approvalsMap = new Map();

      if (requestIds.length > 0) {
        const countPairs = await Promise.all(
          requestIds.map(async (requestId) => {
            const [{ count: lineItemsCount, error: lineItemsCountError }, { count: deductionCount, error: deductionCountError }] =
              await Promise.all([
                supabase
                  .from('tblbudgetapprovalrequests_line_items')
                  .select('*', { count: 'exact', head: true })
                  .eq('request_id', requestId),
                supabase
                  .from('tblbudgetapprovalrequests_line_items')
                  .select('*', { count: 'exact', head: true })
                  .eq('request_id', requestId)
                  .eq('is_deduction', true),
              ]);

            if (lineItemsCountError) throw lineItemsCountError;
            if (deductionCountError) throw deductionCountError;

            return [
              requestId,
              {
                line_items_count: Number(lineItemsCount || 0),
                deduction_count: Number(deductionCount || 0),
              },
            ];
          })
        );

        countPairs.forEach(([requestId, counts]) => {
          countsMap.set(requestId, counts);
        });

        const { data: approvalRows, error: approvalError } = await supabase
          .from('tblbudgetapprovalrequests_approvals')
          .select('request_id, approval_level, status, is_self_request, assigned_to_primary, assigned_to_backup, approved_by, approver_name')
          .in('request_id', requestIds);

        if (approvalError) throw approvalError;

        (approvalRows || []).forEach((row) => {
          const existing = approvalsMap.get(row.request_id) || [];
          existing.push(row);
          approvalsMap.set(row.request_id, existing);
        });
      }

      // Merge budget config data with requests
      const userIds = (data || []).flatMap((request) => [request?.submitted_by, request?.created_by]).filter(Boolean);
      let userNameMap = new Map();
      try {
        userNameMap = await this.getUserNameMap(userIds);
      } catch (lookupError) {
        console.warn('[getAllApprovalRequests] User lookup failed:', lookupError?.message || lookupError);
      }

      const normalizedData = (data || []).map((request) => {
        const storedLineItemsCount = Number(request?.line_items_count ?? request?.employee_count);
        const storedDeductionCount = Number(request?.deduction_count);
        const storedToBePaidCount = Number(request?.to_be_paid_count);
        const hasStoredCounts = Number.isFinite(storedLineItemsCount) && storedLineItemsCount >= 0;

        const computedCounts = countsMap.get(request.request_id) || { line_items_count: 0, deduction_count: 0 };
        const counts = {
          line_items_count: hasStoredCounts ? Math.floor(storedLineItemsCount) : computedCounts.line_items_count,
          deduction_count:
            Number.isFinite(storedDeductionCount) && storedDeductionCount >= 0
              ? Math.floor(storedDeductionCount)
              : computedCounts.deduction_count,
        };

        const toBePaidCount = Math.max(0, counts.line_items_count - counts.deduction_count);
        const resolvedToBePaidCount =
          Number.isFinite(storedToBePaidCount) && storedToBePaidCount >= 0
            ? Math.floor(storedToBePaidCount)
            : toBePaidCount;
        const approvalsForRequest = approvalsMap.get(request.request_id) || [];
        const approvalStageStatus = this.computeApprovalStageStatus(approvalsForRequest, request?.overall_status);
        const submitterId = request?.submitted_by || request?.created_by;
        const submitterName = userNameMap.get(submitterId) || null;
        const submitterDetails = submitterName ? { name: submitterName } : getUserDetailsFromUUID(submitterId);

        return {
          ...request,
          budget_name: budgetConfigMap[request.budget_id]?.budget_name || null,
          budget_description: budgetConfigMap[request.budget_id]?.budget_description || null,
          line_items_count: counts.line_items_count,
          deduction_count: counts.deduction_count,
          to_be_paid_count: resolvedToBePaidCount,
          approval_stage_status: approvalStageStatus,
          approvals: approvalsForRequest,
          submitted_by_name: submitterDetails?.name || request?.submitted_by,
        };
      });

      const stageFilterRaw = String(filters.approval_stage_status || '').toLowerCase();
      const stageFilterList = stageFilterRaw
        ? stageFilterRaw.split(',').map((value) => value.trim()).filter(Boolean)
        : [];
      const filteredByStage = stageFilterList.length && !stageFilterList.includes('all')
        ? normalizedData.filter((request) =>
            stageFilterList.includes(String(request.approval_stage_status || '').toLowerCase())
          )
        : normalizedData;

      const totalItems = filteredByStage.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));
      const safePage = Math.min(page, totalPages);
      const offset = (safePage - 1) * limit;
      const pagedItems = filteredByStage.slice(offset, offset + limit);

      return {
        success: true,
        data: {
          items: pagedItems,
          pagination: {
            page: safePage,
            limit,
            totalItems,
            totalPages,
            hasPrev: safePage > 1,
            hasNext: safePage < totalPages,
          },
        },
      };
    } catch (error) {
      console.error('Error fetching approval requests:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get notifications for requestor/approver dashboards
   */
  static async getUserNotifications({ userId, role = 'requestor', allowedBudgetIds = null }) {
    try {
      const { data: notificationRows, error: notificationError } = await supabase
        .from('tblbudgetapprovalrequests_notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });

      if (notificationError) throw notificationError;

      const requestIds = Array.from(new Set((notificationRows || []).map((row) => row.request_id).filter(Boolean)));
      if (!requestIds.length) {
        return { success: true, data: [] };
      }

      const { data: requests, error: requestsError } = await supabase
        .from('tblbudgetapprovalrequests')
        .select('request_id, request_number, budget_id, submitted_by, created_by, total_request_amount, overall_status, created_at, updated_at, is_client_sponsored, payroll_cycle, payroll_cycle_Date')
        .in('request_id', requestIds);

      if (requestsError) throw requestsError;

      let scopedRequests = requests || [];
      if (Array.isArray(allowedBudgetIds)) {
        if (!allowedBudgetIds.length) return { success: true, data: [] };
        scopedRequests = scopedRequests.filter((request) => allowedBudgetIds.includes(request.budget_id));
      }

      const requestMap = new Map((scopedRequests || []).map((request) => [request.request_id, request]));

      const budgetIds = [...new Set(scopedRequests.map((request) => request.budget_id).filter(Boolean))];
      let budgetConfigMap = {};
      if (budgetIds.length > 0) {
        const { data: budgetConfigs, error: budgetError } = await supabase
          .from('tblbudgetconfiguration')
          .select('budget_id, budget_name, budget_description')
          .in('budget_id', budgetIds);

        if (budgetError) throw budgetError;

        budgetConfigMap = (budgetConfigs || []).reduce((acc, config) => {
          acc[config.budget_id] = config;
          return acc;
        }, {});
      }

      const userIds = scopedRequests.flatMap((request) => [request?.submitted_by, request?.created_by]).filter(Boolean);
      let userNameMap = new Map();
      try {
        userNameMap = await this.getUserNameMap(userIds);
      } catch (lookupError) {
        console.warn('[getUserNotifications] User lookup failed:', lookupError?.message || lookupError);
      }

      const normalized = (notificationRows || [])
        .map((row) => {
          const request = requestMap.get(row.request_id);
          if (!request) return null;

          const submitterId = request?.submitted_by || request?.created_by;
          const submitterName = userNameMap.get(submitterId) || null;
          const submitterDetails = submitterName ? { name: submitterName } : getUserDetailsFromUUID(submitterId);

          return {
            notification_id: row.notification_id,
            request_id: request.request_id,
            request_number: request.request_number,
            budget_id: request.budget_id,
            budget_name: budgetConfigMap[request.budget_id]?.budget_name || null,
            budget_description: budgetConfigMap[request.budget_id]?.budget_description || null,
            submitted_by: request.submitted_by,
            submitted_by_name: submitterDetails?.name || request?.submitted_by,
            total_request_amount: request.total_request_amount || 0,
            overall_status: request.overall_status,
            created_at: row.created_at || request.created_at,
            updated_at: request.updated_at,
            is_client_sponsored: request.is_client_sponsored ?? null,
            payroll_cycle: request.payroll_cycle || null,
            payroll_cycle_Date: request.payroll_cycle_Date || null,
            context_tags: [String(row.notification_type || 'notification').replace(/_/g, ' ')],
            notification_type: row.notification_type,
            title: row.title,
            message: row.message,
            is_read: row.is_read ?? false,
            read_date: row.read_date || null,
            sent_date: row.sent_date || null,
            related_approval_level: row.related_approval_level ?? null,
          };
        })
        .filter(Boolean);

      normalized.sort((a, b) => {
        const aTime = new Date(a.created_at || a.updated_at || 0).getTime();
        const bTime = new Date(b.created_at || b.updated_at || 0).getTime();
        return bTime - aTime;
      });

      return {
        success: true,
        data: normalized,
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  static async markNotificationAsRead(notificationId, userId) {
    try {
      if (!notificationId || !userId) {
        return { success: false, error: 'notificationId and userId are required' };
      }

      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_notifications')
        .update({
          is_read: true,
          read_date: new Date().toISOString(),
        })
        .eq('notification_id', notificationId)
        .eq('recipient_id', userId)
        .select()
        .maybeSingle();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }
  }

  static async markAllNotificationsAsRead(userId) {
    try {
      if (!userId) {
        return { success: false, error: 'userId is required' };
      }

      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_notifications')
        .update({
          is_read: true,
          read_date: new Date().toISOString(),
        })
        .eq('recipient_id', userId)
        .eq('is_read', false)
        .select('notification_id');

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Update approval request main fields
   */
  static async updateApprovalRequest(requestId, updateData) {
    try {
      const {
        description,
        total_request_amount,
        overall_status,
        submission_status,
        attachment_count,
        employee_count,
        line_items_count,
        deduction_count,
        to_be_paid_count,
        current_budget_used,
        remaining_budget,
        will_exceed_budget,
        excess_amount,
        payroll_cycle,
        payroll_cycle_date,
        payroll_cycle_Date,
        updated_by,
      } = updateData;
      const resolvedPayrollCycleDate = payroll_cycle_Date || payroll_cycle_date;

      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests')
        .update({
          ...(description && { description }),
          ...(total_request_amount !== undefined && {
            total_request_amount: parseFloat(total_request_amount),
          }),
          ...(overall_status && { overall_status }),
          ...(submission_status && { submission_status }),
          ...(attachment_count !== undefined && { attachment_count }),
          ...(employee_count !== undefined && { employee_count }),
          ...(line_items_count !== undefined && { line_items_count }),
          ...(deduction_count !== undefined && { deduction_count }),
          ...(to_be_paid_count !== undefined && { to_be_paid_count }),
          ...(current_budget_used !== undefined && {
            current_budget_used: parseFloat(current_budget_used),
          }),
          ...(remaining_budget !== undefined && {
            remaining_budget: parseFloat(remaining_budget),
          }),
          ...(will_exceed_budget !== undefined && { will_exceed_budget }),
          ...(excess_amount !== undefined && {
            excess_amount: excess_amount ? parseFloat(excess_amount) : null,
          }),
          ...(payroll_cycle !== undefined && { payroll_cycle }),
          ...(resolvedPayrollCycleDate !== undefined && {
            payroll_cycle_Date: resolvedPayrollCycleDate || null,
          }),
          updated_by,
          updated_at: new Date().toISOString(),
        })
        .eq('request_id', requestId)
        .select();

      if (error) throw error;

      return {
        success: true,
        data: data[0],
        message: 'Approval request updated successfully',
      };
    } catch (error) {
      console.error('Error updating approval request:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Submit approval request (change from DRAFT to SUBMITTED)
   */
  static async submitApprovalRequest(requestId, submittedBy) {
    try {
      console.log('[submitApprovalRequest] Starting submission for request:', requestId, 'by:', submittedBy);

      const lineItemsResult = await this.getLineItemsByRequestId(requestId);
      if (!lineItemsResult.success) {
        return {
          success: false,
          error: lineItemsResult.error || 'Failed to load line items for submission.',
        };
      }

      const lineItems = Array.isArray(lineItemsResult.data) ? lineItemsResult.data : [];
      const netRequestAmount = lineItems.reduce((sum, item) => {
        const amount = Number(item?.amount || 0);
        return sum + (item?.is_deduction ? -amount : amount);
      }, 0);

      const locationValidation = await this.validateRequestLocationScope(requestId);
      if (!locationValidation.success) {
        return {
          success: false,
          error: locationValidation.error || 'Failed location scope validation.',
        };
      }
      if (!locationValidation.valid) {
        return {
          success: false,
          error: locationValidation.error || 'Location scope validation failed.',
        };
      }

      const tenureValidation = await this.validateRequestTenureScope(requestId);
      if (!tenureValidation.success) {
        return {
          success: false,
          error: tenureValidation.error || 'Failed tenure group validation.',
        };
      }
      if (!tenureValidation.valid) {
        return {
          success: false,
          error: tenureValidation.error || 'Tenure group validation failed.',
        };
      }
      
      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests')
        .update({
          overall_status: 'submitted',
          submission_status: 'completed',
          total_request_amount: netRequestAmount,
          submitted_date: new Date().toISOString(),
          updated_by: submittedBy,
          updated_at: new Date().toISOString(),
        })
        .eq('request_id', requestId)
        .select();

      if (error) {
        console.error('[submitApprovalRequest] Database error updating request:', error);
        throw error;
      }
      
      console.log('[submitApprovalRequest] Request updated to submitted status');

      console.log('[submitApprovalRequest] Request updated to submitted status');

      // Run non-dependent tasks in parallel, then run dependent auto-approval after workflow is initialized
      console.log('[submitApprovalRequest] Running parallel operations: activity log, submission notifications');
      const [activityResult, notificationResult] = await Promise.allSettled([
        this.addActivityLog(requestId, 'submitted', submittedBy),
        this.sendSubmissionNotifications(requestId),
      ]);

      const workflowResult = await this.initializeApprovalWorkflow(requestId);
      if (!workflowResult?.success) {
        console.warn('[submitApprovalRequest] Workflow initialization failed:', workflowResult?.error || 'Unknown error');
      }

      const autoApprovalResult = await this.checkAndAutoApproveL1(requestId, submittedBy);
      console.log('[submitApprovalRequest] Submission operations completed');
      
      // Log any errors but don't fail the submission
      if (activityResult.status === 'rejected') {
        console.warn('Activity log failed:', activityResult.reason);
      }
      if (notificationResult.status === 'rejected') {
        console.warn('Submission notification failed:', notificationResult.reason);
      }

      const autoApproved = Boolean(autoApprovalResult?.autoApproved);
      
      console.log('[submitApprovalRequest] Submission complete. Auto-approved:', autoApproved);

      return {
        success: true,
        data: data[0],
        autoApproved: autoApproved || false,
        message: autoApproved 
          ? 'Approval request submitted and L1 auto-approved (Self-Request)' 
          : 'Approval request submitted successfully',
      };
    } catch (error) {
      console.error('[submitApprovalRequest] Error submitting approval request:', error);
      console.error('[submitApprovalRequest] Error stack:', error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Initialize approval workflow for levels
   */
  static async initializeApprovalWorkflow(requestId) {
    try {
      // Get budget configuration first
      const { data: request, error: reqError } = await supabase
        .from('tblbudgetapprovalrequests')
        .select('budget_id')
        .eq('request_id', requestId)
        .single();

      if (reqError) throw reqError;

      // Get approvers for the budget configuration
      const { data: approvers, error: approverError } = await supabase
        .from('tblbudgetconfig_approvers')
        .select('approval_level, primary_approver, backup_approver')
        .eq('budget_id', request?.budget_id);

      if (approverError) throw approverError;

      // Create approval records for each level
      const approvalRecords = approvers.map((approver) => ({
        request_id: requestId,
        approval_level: approver.approval_level,
        approval_level_name: `L${approver.approval_level}`,
        assigned_to_primary: approver.primary_approver,
        assigned_to_backup: approver.backup_approver,
        status: 'pending',
        order_index: approver.approval_level,
        created_at: new Date().toISOString(),
      }));

      // Add payroll level if not exists
      if (!approvers.find((a) => a.approval_level === 4)) {
        approvalRecords.push({
          request_id: requestId,
          approval_level: 4,
          approval_level_name: 'Payroll',
          status: 'pending',
          order_index: 4,
          created_at: new Date().toISOString(),
        });
      }

      const { error: insertError } = await supabase
        .from('tblbudgetapprovalrequests_approvals')
        .insert(approvalRecords);

      if (insertError && insertError.code !== '23505') {
        // 23505 = unique violation (already exists)
        throw insertError;
      }

      return {
        success: true,
        message: 'Approval workflow initialized',
      };
    } catch (error) {
      console.error('Error initializing approval workflow:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if submitter is L1 approver and auto-approve (Self-Request)
   */
  static async checkAndAutoApproveL1(requestId, submittedBy) {
    try {
      // Get request budget id
      const { data: request, error: reqError } = await supabase
        .from('tblbudgetapprovalrequests')
        .select('budget_id, submitted_by, created_by')
        .eq('request_id', requestId)
        .single();

      if (reqError) throw reqError;

      const effectiveSubmittedBy = String(submittedBy || request?.submitted_by || request?.created_by || '').trim();
      const normalizedSubmittedBy = effectiveSubmittedBy.toLowerCase();
      if (!effectiveSubmittedBy) {
        return { autoApproved: false };
      }

      // Get L1 approvers for the budget configuration
      const { data: l1Approvers, error: approverError } = await supabase
        .from('tblbudgetconfig_approvers')
        .select('primary_approver, backup_approver')
        .eq('budget_id', request?.budget_id)
        .eq('approval_level', 1);

      if (approverError) throw approverError;

      // Check if submittedBy matches any L1 approver UUID
      const isL1Approver = (l1Approvers || []).some((approver) => {
        const primary = String(approver.primary_approver || '').trim().toLowerCase();
        const backup = String(approver.backup_approver || '').trim().toLowerCase();
        return primary === normalizedSubmittedBy || backup === normalizedSubmittedBy;
      });

      if (!isL1Approver) {
        return { autoApproved: false };
      }

      // Auto-approve L1 level and update request status in parallel
      const [approvalUpdate, requestUpdate, activityLog] = await Promise.all([
        supabase
          .from('tblbudgetapprovalrequests_approvals')
          .update({
            status: 'approved',
            approved_by: effectiveSubmittedBy,
            approver_name: 'Self',
            approver_title: 'L1 Approver (Self-Request)',
            approval_notes: 'Auto-approved: Self-request by L1 approver',
            approval_date: new Date().toISOString(),
            is_self_request: true,
            updated_at: new Date().toISOString(),
          })
          .eq('request_id', requestId)
          .eq('approval_level', 1),
        supabase
          .from('tblbudgetapprovalrequests')
          .update({
            overall_status: 'in_progress',
            updated_at: new Date().toISOString(),
          })
          .eq('request_id', requestId),
        this.addActivityLog(requestId, 'approved', effectiveSubmittedBy, 'Auto-approved: Self-request by L1 approver')
      ]);

      if (approvalUpdate.error) throw approvalUpdate.error;

      console.log(`[Auto-Approve] L1 auto-approved for request ${requestId} (Self-Request)`);

      return { autoApproved: true };
    } catch (error) {
      console.error('Error in L1 auto-approval check:', error);
      // Don't fail the entire submission if auto-approval fails
      return { autoApproved: false };
    }
  }

  /**
   * Add line item to request
   */
  static async addLineItem(requestId, lineItemData) {
    try {
      const {
        item_number,
        employee_id,
        employee_name,
        email,
        employee_status,
        geo,
        location,
        department,
        position,
        hire_date,
        termination_date,
        item_type,
        item_description,
        amount,
        is_deduction,
        notes,
        created_by,
      } = lineItemData;

      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_line_items')
        .insert([
          {
            request_id: requestId,
            item_number,
            employee_id,
            employee_name,
            department,
            position,
            item_type: this.normalizeItemType(item_type),
            item_description,
            amount: parseFloat(amount),
            is_deduction: is_deduction || false,
            email: email || null,
            employee_status: employee_status || null,
            geo: geo || null,
            Location: location || null,
            hire_date: hire_date || null,
            termination_date: termination_date || null,
            notes,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      // Log activity
      await this.addActivityLog(requestId, 'line_item_added', created_by);

      return {
        success: true,
        data: data[0],
        message: 'Line item added successfully',
      };
    } catch (error) {
      console.error('Error adding line item:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Add multiple line items (bulk import)
   */
  static async addLineItemsBulk(requestId, lineItems, createdBy) {
    try {
      console.log('[addLineItemsBulk] Starting bulk insert');
      console.log('[addLineItemsBulk] Request ID:', requestId);
      console.log('[addLineItemsBulk] Created by:', createdBy);
      console.log('[addLineItemsBulk] Line items received:', Array.isArray(lineItems) ? lineItems.length : 'NOT AN ARRAY');
      
      if (!Array.isArray(lineItems)) {
        console.error('[addLineItemsBulk] lineItems is not an array:', typeof lineItems, lineItems);
        throw new Error('lineItems must be an array');
      }
      
      if (lineItems.length === 0) {
        console.error('[addLineItemsBulk] lineItems array is empty');
        throw new Error('lineItems array cannot be empty');
      }

      if (lineItems.length > 500) {
        throw new Error('Maximum 500 line items per bulk request');
      }

      const { data: existingLastItem, error: existingLastItemError } = await supabase
        .from('tblbudgetapprovalrequests_line_items')
        .select('item_number')
        .eq('request_id', requestId)
        .order('item_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingLastItemError) {
        throw existingLastItemError;
      }

      const itemNumberOffset = Number(existingLastItem?.item_number || 0);
      
      console.log('[addLineItemsBulk] First item structure:', JSON.stringify(lineItems[0], null, 2));
      
      const records = lineItems.map((item, index) => ({
        request_id: requestId,
        item_number: itemNumberOffset + index + 1,
        employee_id: item.employee_id || '',
        employee_name: item.employee_name || '',
        department: item.department || '',
        position: item.position || '',
        item_type: this.normalizeItemType(item.item_type || 'bonus'),
        item_description: item.item_description || item.notes || null,
        amount: parseFloat(item.amount) || 0,
        is_deduction: item.is_deduction || item.amount < 0,
        has_warning: item.has_warning || false,
        warning_reason: item.warning_reason || '',
        notes: item.notes || null,
        // New fields from updated schema
        email: item.email || null,
        employee_status: item.employee_status || item.employeeStatus || null,
        geo: item.geo || null,
        Location: item.location || item.Location || null,
        hire_date: item.hire_date || item.hireDate || null,
        termination_date: item.termination_date || item.terminationDate || null,
        created_at: new Date().toISOString(),
      }));

      console.log('[addLineItemsBulk] Mapped records count:', records.length);
      console.log('[addLineItemsBulk] First mapped record:', JSON.stringify(records[0], null, 2));
      console.log('[addLineItemsBulk] Inserting records into database...');
      
      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_line_items')
        .insert(records)
        .select();

      if (error) {
        console.error('[addLineItemsBulk] Database error:', error);
        console.error('[addLineItemsBulk] Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('[addLineItemsBulk] Line items inserted successfully:', data?.length || 0);
      console.log('[addLineItemsBulk] Updating employee count...');

      const { count: totalLineItemsCount, error: countError } = await supabase
        .from('tblbudgetapprovalrequests_line_items')
        .select('*', { count: 'exact', head: true })
        .eq('request_id', requestId);

      if (countError) {
        throw countError;
      }

      const { count: totalDeductionCount, error: deductionCountError } = await supabase
        .from('tblbudgetapprovalrequests_line_items')
        .select('*', { count: 'exact', head: true })
        .eq('request_id', requestId)
        .eq('is_deduction', true);

      if (deductionCountError) {
        throw deductionCountError;
      }

      const resolvedLineItemsCount = Number(totalLineItemsCount || 0);
      const resolvedDeductionCount = Number(totalDeductionCount || 0);
      const resolvedToBePaidCount = Math.max(0, resolvedLineItemsCount - resolvedDeductionCount);
      
      // Update request with employee count
      await this.updateApprovalRequest(requestId, {
        employee_count: resolvedLineItemsCount,
        line_items_count: resolvedLineItemsCount,
        deduction_count: resolvedDeductionCount,
        to_be_paid_count: resolvedToBePaidCount,
        updated_by: createdBy,
      });

      // Log activity
      await this.addActivityLog(requestId, 'line_item_added', createdBy);

      console.log('[addLineItemsBulk] Bulk insert complete:', data.length, 'items added');

      return {
        success: true,
        data,
        message: `${data.length} line items added successfully`,
      };
    } catch (error) {
      console.error('[addLineItemsBulk] ❌ ERROR IN BULK INSERT ❌');
      console.error('[addLineItemsBulk] Error type:', error.constructor.name);
      console.error('[addLineItemsBulk] Error message:', error.message);
      console.error('[addLineItemsBulk] Error stack:', error.stack);
      console.error('[addLineItemsBulk] Full error:', JSON.stringify(error, null, 2));
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get line items for request
   */
  static async getLineItemsByRequestId(requestId) {
    try {
      const allRows = [];
      const pageSize = 1000;
      let from = 0;

      while (true) {
        const to = from + pageSize - 1;
        const { data, error } = await supabase
          .from('tblbudgetapprovalrequests_line_items')
          .select('*')
          .eq('request_id', requestId)
          .order('item_number', { ascending: true })
          .range(from, to);

        if (error) throw error;

        const rows = data || [];
        allRows.push(...rows);

        if (rows.length < pageSize) break;
        from += pageSize;
      }

      return {
        success: true,
        data: allRows,
      };
    } catch (error) {
      console.error('Error fetching line items:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Approve request at a specific level
   */
  static async approveRequestAtLevel(requestId, approvalLevel, approvalData) {
    try {
      const {
        approved_by,
        approver_name,
        approver_title,
        approval_notes,
        conditions_applied,
        payroll_cycle,
        payroll_cycle_date,
      } = approvalData;

      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_approvals')
        .update({
          status: 'approved',
          approved_by,
          approver_name,
          approver_title,
          approval_decision: 'approved',
          approval_notes,
          conditions_applied,
          approval_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('request_id', requestId)
        .eq('approval_level', approvalLevel)
        .select();

      if (error) throw error;

      const allApprovalsComplete = await this.checkAllApprovalsComplete(requestId);
      const approvalsSnapshot = await this.getApprovalsByRequestId(requestId);
      const approvalStageStatus = this.computeApprovalStageStatus(
        approvalsSnapshot.data || [],
        allApprovalsComplete ? 'approved' : 'in_progress'
      );
      const overallStatus = allApprovalsComplete ? 'approved' : 'in_progress';

      const normalizedLevel = Number(approvalLevel);
      await this.updateApprovalRequest(requestId, {
        overall_status: overallStatus,
        ...(allApprovalsComplete && { approved_date: new Date().toISOString() }),
        ...(normalizedLevel === 4 && payroll_cycle ? { payroll_cycle } : {}),
        ...(normalizedLevel === 4 && payroll_cycle_date ? { payroll_cycle_date: payroll_cycle_date } : {}),
        updated_by: approved_by,
      });

      // Log activity
      await this.addActivityLog(
        requestId,
        'approved',
        approved_by,
        `Approved at level ${approvalLevel}`
      );

      await this.sendApprovalStepNotifications({
        requestId,
        approvalLevel,
        payrollCycle: payroll_cycle,
        payrollCycleDate: payroll_cycle_date,
        approvedBy: approved_by,
      });

      return {
        success: true,
        data: data[0],
        message: `Request approved at level ${approvalLevel}`,
      };
    } catch (error) {
      console.error('Error approving request:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Reject request at a specific level
   */
  static async rejectRequestAtLevel(requestId, approvalLevel, rejectionData) {
    try {
      const { rejected_by, approver_name, rejection_reason } = rejectionData;

      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_approvals')
        .update({
          status: 'rejected',
          approved_by: rejected_by,
          approver_name,
          approval_decision: 'rejected',
          approval_notes: rejection_reason,
          approval_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('request_id', requestId)
        .eq('approval_level', approvalLevel)
        .select();

      if (error) throw error;

      // Update main request status to rejected
      await this.updateApprovalRequest(requestId, {
        overall_status: 'rejected',
        updated_by: rejected_by,
      });

      // Log activity
      await this.addActivityLog(
        requestId,
        'rejected',
        rejected_by,
        `Rejected at level ${approvalLevel}: ${rejection_reason}`
      );

      return {
        success: true,
        data: data[0],
        message: `Request rejected at level ${approvalLevel}`,
      };
    } catch (error) {
      console.error('Error rejecting request:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Complete payroll payment for a request (Payroll step 2)
   */
  static async completePayrollPayment(requestId, completionData) {
    try {
      const { completed_by, approver_name, approval_notes } = completionData;

      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_approvals')
        .update({
          status: 'approved',
          approved_by: completed_by,
          approver_name,
          approval_decision: 'approved',
          approval_notes: approval_notes || 'Payment completed',
          approval_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('request_id', requestId)
        .eq('approval_level', 4)
        .select();

      if (error) throw error;

      await this.updateApprovalRequest(requestId, {
        overall_status: 'completed',
        submission_status: 'completed',
        updated_by: completed_by,
      });

      await this.addActivityLog(
        requestId,
        'completed',
        completed_by,
        'Payroll payment completed'
      );

      await this.sendCompletionNotifications({
        requestId,
        completedBy: completed_by,
        completionNotes: approval_notes || '',
      });

      return {
        success: true,
        data: data[0],
        message: 'Payroll payment completed',
      };
    } catch (error) {
      console.error('Error completing payroll payment:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get approvals for request
   */
  static async getApprovalsByRequestId(requestId) {
    try {
      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_approvals')
        .select('*')
        .eq('request_id', requestId)
        .order('approval_level', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error fetching approvals:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Check if all required approvals are complete
   */
  static async checkAllApprovalsComplete(requestId) {
    try {
      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_approvals')
        .select('status')
        .eq('request_id', requestId)
        .neq('status', 'approved');

      if (error) throw error;

      return data.length === 0; // No pending/rejected/escalated
    } catch (error) {
      console.error('Error checking approvals:', error);
      return false;
    }
  }

  /**
   * Add attachment
   */
  static async addAttachment(requestId, attachmentData) {
    try {
      const {
        file_name,
        file_type,
        file_size_bytes,
        storage_path,
        storage_provider,
        file_purpose,
        uploaded_by,
      } = attachmentData;

      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_attachments')
        .insert([
          {
            request_id: requestId,
            file_name,
            file_type,
            file_size_bytes,
            storage_path,
            storage_provider,
            file_purpose,
            uploaded_by,
            uploaded_date: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      // Update attachment count
      const { data: requestData } = await supabase
        .from('tblbudgetapprovalrequests')
        .select('attachment_count')
        .eq('request_id', requestId)
        .single();

      await this.updateApprovalRequest(requestId, {
        attachment_count: (requestData?.attachment_count || 0) + 1,
        updated_by: uploaded_by,
      });

      // Log activity
      await this.addActivityLog(requestId, 'attachment_added', uploaded_by);

      return {
        success: true,
        data: data[0],
        message: 'Attachment added successfully',
      };
    } catch (error) {
      console.error('Error adding attachment:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get attachments for request
   */
  static async getAttachmentsByRequestId(requestId) {
    try {
      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_attachments_logs')
        .select('*')
        .eq('request_id', requestId);

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error fetching attachments:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Add activity log entry
   */
  static async addActivityLog(requestId, actionType, performedBy, description = '') {
    try {
      const { error } = await supabase
        .from('tblbudgetapprovalrequests_activity_log')
        .insert([
          {
            request_id: requestId,
            action_type: actionType,
            description,
            performed_by: performedBy,
            performed_at: new Date().toISOString(),
          },
        ]);

      if (error) throw error;

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error adding activity log:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get activity log for request
   */
  static async getActivityLogByRequestId(requestId) {
    try {
      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_activity_log')
        .select('*')
        .eq('request_id', requestId)
        .order('performed_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error fetching activity log:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Get approvals pending for a user
   */
  static async getPendingApprovalsForUser(userId, budgetIds = null) {
    try {
      const { data, error } = await supabase
        .from('tblbudgetapprovalrequests_approvals')
        .select('*')
        .or(`assigned_to_primary.eq.${userId},assigned_to_backup.eq.${userId}`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      let filtered = data || [];
      if (Array.isArray(budgetIds)) {
        if (!budgetIds.length) {
          return { success: true, data: [] };
        }

        const requestIds = filtered.map((row) => row.request_id).filter(Boolean);
        if (!requestIds.length) {
          return { success: true, data: [] };
        }

        const { data: requestRows, error: requestError } = await supabase
          .from('tblbudgetapprovalrequests')
          .select('request_id, budget_id')
          .in('request_id', requestIds);

        if (requestError) throw requestError;

        const budgetMap = new Map((requestRows || []).map((row) => [row.request_id, row.budget_id]));
        filtered = filtered.filter((row) => budgetIds.includes(budgetMap.get(row.request_id)));
      }

      return {
        success: true,
        data: filtered,
      };
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Delete approval request
   */
  static async deleteApprovalRequest(requestId) {
    try {
      const { error } = await supabase
        .from('tblbudgetapprovalrequests')
        .delete()
        .eq('request_id', requestId);

      if (error) throw error;

      return {
        success: true,
        message: 'Approval request deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting approval request:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default ApprovalRequestService;
