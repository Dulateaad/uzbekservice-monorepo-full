/**
 * Реестр имён коллекций платформы (события, аудит, outbox, домены по ТЗ).
 * Правила Firestore добавляйте по мере реального использования коллекции.
 */
export const PLATFORM_COLLECTIONS = {
  auditLogs: 'platform_audit_logs',
  businessEvents: 'platform_business_events',
  notificationOutbox: 'platform_notification_outbox',
  searchIndex: 'platform_search_index',
  customizationMeta: 'platform_customization',
  kpiTargets: 'platform_kpi_targets',
  subscriptionState: 'platform_subscription_state',
  documentTemplates: 'odo_document_templates',
  fileAttachments: 'odo_file_attachments',
  tasks: 'odo_tasks',
  approvals: 'odo_approvals',
  calendarEvents: 'odo_calendar_events',
  hrEmployees: 'hr_employees',
  hrAttendance: 'hr_attendance',
  salaryRuns: 'hr_salary_runs',
  taxProfile: 'tax_profile',
} as const;

export type PlatformCollectionName =
  (typeof PLATFORM_COLLECTIONS)[keyof typeof PLATFORM_COLLECTIONS];
