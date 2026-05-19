BEGIN;
CREATE TABLE report_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_key TEXT NOT NULL UNIQUE,
  report_name TEXT NOT NULL,
  description TEXT,
  query_template TEXT NOT NULL,
  allowed_roles TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE report_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_key TEXT NOT NULL,
  run_by UUID NOT NULL REFERENCES users(id),
  state_code CHAR(2),
  parameters JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'running', -- running | completed | failed
  row_count INTEGER,
  result_path TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Seed report definitions
INSERT INTO report_definitions (report_key, report_name, description, query_template, allowed_roles) VALUES
  ('perm_eligibility', 'PERM Eligibility Sample', 'CMS PERM eligibility error measurement', 'SELECT p.medicaid_id, p.state_code, e.enrollment_status, e.source, e.created_at FROM patients p JOIN eligibility_checks e ON e.patient_id = p.id WHERE p.state_code = $1 AND e.check_date BETWEEN $2 AND $3', ARRAY['compliance_officer','state_medicaid_agency','federal_cms']),
  ('fraud_summary', 'Fraud Case Summary', 'Monthly fraud detection summary by state', 'SELECT state_code, COUNT(*) as total_cases, AVG(risk_score) as avg_score, COUNT(*) FILTER (WHERE status = ''confirmed_fraud'') as confirmed FROM fraud_cases WHERE created_at BETWEEN $1 AND $2 GROUP BY state_code ORDER BY total_cases DESC', ARRAY['fraud_investigator','compliance_officer','state_medicaid_agency','federal_cms']),
  ('pa_decision_rate', 'PA Decision Rate', 'Prior auth approval/denial rates by procedure', 'SELECT procedure_code, state_code, COUNT(*) as total, COUNT(*) FILTER (WHERE status = ''approved'') as approved, COUNT(*) FILTER (WHERE status = ''denied'') as denied FROM pa_requests WHERE created_at BETWEEN $1 AND $2 GROUP BY procedure_code, state_code', ARRAY['compliance_officer','state_medicaid_agency','mco_admin','federal_cms','prior_auth_specialist']);
COMMIT;
