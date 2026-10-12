{{/*
Expand the name of the chart.
*/}}
{{- define "ecommerce.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "ecommerce.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "ecommerce.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "ecommerce.labels" -}}
helm.sh/chart: {{ include "ecommerce.chart" . }}
{{ include "ecommerce.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "ecommerce.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ecommerce.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Validate that backend image tag is set (fail early if empty).
*/}}
{{- define "ecommerce.backendTag" -}}
{{- required "backend.image.tag is required — set it via --set backend.image.tag=<sha>" .Values.backend.image.tag }}
{{- end }}

{{/*
Validate that frontend image tag is set (fail early if empty).
*/}}
{{- define "ecommerce.frontendTag" -}}
{{- required "frontend.image.tag is required — set it via --set frontend.image.tag=<sha>" .Values.frontend.image.tag }}
{{- end }}

{{/*
Backend full image reference (forces tag validation).
*/}}
{{- define "ecommerce.backendImage" -}}
{{- printf "%s:%s" .Values.backend.image.repository (include "ecommerce.backendTag" .) }}
{{- end }}

{{/*
Frontend full image reference (forces tag validation).
*/}}
{{- define "ecommerce.frontendImage" -}}
{{- printf "%s:%s" .Values.frontend.image.repository (include "ecommerce.frontendTag" .) }}
{{- end }}

{{/*
Postgres full name.
*/}}
{{- define "ecommerce.postgres.fullname" -}}
{{- printf "%s-postgres" (include "ecommerce.fullname" .) }}
{{- end }}

{{/*
Backend full name.
*/}}
{{- define "ecommerce.backend.fullname" -}}
{{- printf "%s-backend" (include "ecommerce.fullname" .) }}
{{- end }}

{{/*
Frontend full name.
*/}}
{{- define "ecommerce.frontend.fullname" -}}
{{- printf "%s-frontend" (include "ecommerce.fullname" .) }}
{{- end }}

{{/*
Migration job full name.
*/}}
{{- define "ecommerce.migration.fullname" -}}
{{- printf "%s-migration" (include "ecommerce.fullname" .) }}
{{- end }}
