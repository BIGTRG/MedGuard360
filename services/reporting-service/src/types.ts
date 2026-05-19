export interface ReportDefinition {
  id: string;
  report_key: string;
  report_name: string;
  description: string | null;
  query_template: string;
  allowed_roles: string[];
  created_at: string;
}

export interface ReportRun {
  id: string;
  report_key: string;
  run_by: string;
  state_code: string | null;
  parameters: Record<string, unknown>;
  status: ReportRunStatus;
  row_count: number | null;
  result_path: string | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export type ReportRunStatus = 'running' | 'completed' | 'failed';

export interface CreateReportRunInput {
  report_key: string;
  run_by: string;
  state_code?: string;
  parameters: Record<string, unknown>;
}

export interface RunReportInput {
  stateCode?: string;
  startDate: string;
  endDate: string;
}

export interface ReportRunFilters {
  reportKey?: string;
  runBy?: string;
  status?: ReportRunStatus;
}

export interface DashboardSummary {
  total_claims: number;
  fraud_cases_open: number;
  pa_pending: number;
  credentialing_pending: number;
  active_patients: number;
}

export interface FraudDashboard {
  by_risk_level: Array<{ risk_level: string; count: number }>;
  by_status: Array<{ status: string; count: number }>;
}
