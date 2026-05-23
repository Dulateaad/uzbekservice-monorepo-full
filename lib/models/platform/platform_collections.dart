/// Имена коллекций платформы — см. `functions/src/platform/collections.ts`.
abstract final class PlatformCollections {
  static const auditLogs = 'platform_audit_logs';
  static const businessEvents = 'platform_business_events';
  static const notificationOutbox = 'platform_notification_outbox';
  static const searchIndex = 'platform_search_index';
  static const customizationMeta = 'platform_customization';
  static const kpiTargets = 'platform_kpi_targets';
  static const subscriptionState = 'platform_subscription_state';
  static const documentTemplates = 'odo_document_templates';
  static const fileAttachments = 'odo_file_attachments';
  static const tasks = 'odo_tasks';
  static const approvals = 'odo_approvals';
  static const calendarEvents = 'odo_calendar_events';
  static const hrEmployees = 'hr_employees';
  static const hrAttendance = 'hr_attendance';
  static const salaryRuns = 'hr_salary_runs';
  static const taxProfile = 'tax_profile';
}
