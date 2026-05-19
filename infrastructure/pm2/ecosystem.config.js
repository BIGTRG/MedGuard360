/**
 * PM2 ecosystem for MedGuard360.
 *
 * 20 Node.js microservices (ports 3001–3020) + 10 Python AI engines (ports 8001–8010).
 *
 * Usage:
 *   pm2 start infrastructure/pm2/ecosystem.config.js
 *   pm2 start infrastructure/pm2/ecosystem.config.js --only auth-service
 *   pm2 reload infrastructure/pm2/ecosystem.config.js
 *
 * Per CLAUDE.md: every service runs through PM2, every service gets restarted
 * on crash with exponential backoff. Logs go to PM2 → forwarded to ELK via Logstash.
 */

const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

const nodeService = (name, port) => ({
  name,
  cwd: path.join(ROOT, 'services', name),
  script: 'dist/index.js',
  instances: 'max',           // one process per CPU core
  exec_mode: 'cluster',
  max_memory_restart: '1G',
  restart_delay: 4000,
  exp_backoff_restart_delay: 100,
  env: {
    NODE_ENV: 'production',
    PORT: String(port),
    SERVICE_NAME: name,
  },
  // PM2 forwards stdout/stderr to its own log files; Logstash reads them.
  out_file: `/var/log/medguard360/${name}.out.log`,
  error_file: `/var/log/medguard360/${name}.err.log`,
  merge_logs: true,
  time: true,
});

const pythonEngine = (name, port) => ({
  name,
  cwd: path.join(ROOT, 'ai-engines', name),
  script: '.venv/bin/uvicorn',
  args: `app.main:app --host 0.0.0.0 --port ${port} --workers 2 --proxy-headers --forwarded-allow-ips=*`,
  interpreter: 'none',
  max_memory_restart: '2G',     // ML models can be large
  restart_delay: 5000,
  env: {
    PYTHONUNBUFFERED: '1',
    PORT: String(port),
    SERVICE_NAME: name,
  },
  out_file: `/var/log/medguard360/${name}.out.log`,
  error_file: `/var/log/medguard360/${name}.err.log`,
  merge_logs: true,
  time: true,
});

module.exports = {
  apps: [
    // Node.js microservices
    nodeService('auth-service', 3001),
    nodeService('provider-service', 3002),
    nodeService('credentialing-service', 3003),
    nodeService('patient-service', 3004),
    nodeService('eligibility-service', 3005),
    nodeService('prior-auth-service', 3006),
    nodeService('clinical-doc-service', 3007),
    nodeService('claims-service', 3008),
    nodeService('fraud-engine-service', 3009),
    nodeService('denial-service', 3010),
    nodeService('pharmacy-service', 3011),
    nodeService('dme-service', 3012),
    nodeService('nemt-service', 3013),
    nodeService('crisis-service', 3014),
    nodeService('hub-service', 3015),
    nodeService('reporting-service', 3016),
    nodeService('notification-service', 3017),
    nodeService('state-config-service', 3018),
    nodeService('audit-log-service', 3019),
    nodeService('hie-service', 3020),

    // Python AI engines
    pythonEngine('speech-to-text', 8001),
    pythonEngine('clinical-nlp', 8002),
    pythonEngine('ocr-engine', 8003),
    pythonEngine('fraud-detection', 8004),
    pythonEngine('fraud-ring-gnn', 8005),
    pythonEngine('pa-nlp-matcher', 8006),
    pythonEngine('denial-predictor', 8007),
    pythonEngine('provider-monitor', 8008),
    pythonEngine('crisis-detector', 8009),
    pythonEngine('eligibility-intel', 8010),
  ],
};
