{{/*
Common labels applied to every resource.
*/}}
{{- define "medguard360.labels" -}}
app.kubernetes.io/name: {{ .name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: medguard360
medguard360/kind: {{ .kind | default "service" }}
{{- end -}}

{{/*
Standard env vars every Node service expects.
Used as `envFrom` indirection: secrets come from ExternalSecret-managed Secrets,
non-secret config comes from the platform ConfigMap.
*/}}
{{- define "medguard360.serviceEnv" -}}
- name: NODE_ENV
  value: production
- name: SERVICE_NAME
  value: {{ .name }}
- name: PORT
  value: "{{ .port }}"
- name: PG_HOST
  value: {{ .Values.global.pgbouncer.host }}
- name: PG_PORT
  value: "{{ .Values.global.pgbouncer.port }}"
- name: PG_DATABASE
  value: {{ .Values.global.pgbouncer.database }}
- name: PG_USER
  value: {{ .Values.global.pgbouncer.user }}
- name: PG_POOL_MAX
  value: "20"
- name: PG_SSL
  value: "true"
- name: REDIS_HOST
  value: {{ .Values.global.redis.host }}
- name: REDIS_PORT
  value: "{{ .Values.global.redis.port }}"
- name: KAFKA_BROKERS
  value: {{ .Values.global.kafka.brokers }}
- name: MINIO_ENDPOINT
  value: {{ .Values.global.minio.endpoint }}
- name: MINIO_SSL
  value: "{{ .Values.global.minio.useSSL }}"
envFrom:
  - secretRef:
      name: medguard360-runtime-secrets   # populated by ExternalSecret
{{- end -}}
