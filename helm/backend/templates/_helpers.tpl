{{/*
Expand the name of the chart.
*/}}
{{- define "backend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to that
(by the DNS naming spec). The `app.kubernetes.io/instance` label uses
.Release.Name directly (must be <= 63 chars).
*/}}
{{- define "backend.fullname" -}}
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
{{- define "backend.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels — appended to every resource.
*/}}
{{- define "backend.labels" -}}
helm.sh/chart: {{ include "backend.chart" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- with .Values.podLabels }}
{{- toYaml . | nindent 0 }}
{{- end }}
{{- end }}

{{/*
Selector labels — IMMUTABLE after a Deployment is created.
These identify the application instance and serve as the Deployment's
matchLabels. Changing these causes an orphaned ReplicaSet.

We intentionally put app.kubernetes.io/component in the selector so that
different components (backend vs migration) don't share selectors.
*/}}
{{- define "backend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "backend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
ServiceAccount name — uses the fullname when serviceAccount.create is true,
otherwise falls back to the explicitly provided name or "default".
*/}}
{{- define "backend.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- include "backend.fullname" . }}
{{- else }}
{{- .Values.serviceAccount.name | default "default" }}
{{- end }}
{{- end }}

{{/*
Full image reference — validates that either tag or digest is set.
Supports digest-pinned images (digest wins over tag).
*/}}
{{- define "backend.imageRef" -}}
{{- $repo := required "image.repository is required" .Values.image.repository -}}
{{- if .Values.image.digest }}
{{- printf "%s@%s" $repo .Values.image.digest }}
{{- else }}
{{- $tag := required "image.tag is required — set via --set image.tag=<sha> or in values-prod.yaml" .Values.image.tag }}
{{- printf "%s:%s" $repo $tag }}
{{- end }}
{{- end }}

{{/*
Migration image reference — defaults to the same image as the app.
*/}}
{{- define "backend.migrationImageRef" -}}
{{- $mig := .Values.migration -}}
{{- if and $mig.image.repository (or $mig.image.tag $mig.image.digest) }}
{{- if $mig.image.digest }}
{{- printf "%s@%s" $mig.image.repository $mig.image.digest }}
{{- else }}
{{- printf "%s:%s" $mig.image.repository $mig.image.tag }}
{{- end }}
{{- else }}
{{- include "backend.imageRef" . }}
{{- end }}
{{- end }}

{{/*
Migration image pull policy — defaults to the app's pullPolicy.
*/}}
{{- define "backend.migrationImagePullPolicy" -}}
{{- if .Values.migration.image.pullPolicy }}
{{- .Values.migration.image.pullPolicy }}
{{- else }}
{{- .Values.image.pullPolicy }}
{{- end }}
{{- end }}

{{/*
Secret name — either user-supplied existingSecret or the chart-created one.
*/}}
{{- define "backend.secretName" -}}
{{- if .Values.secrets.create }}
{{- include "backend.fullname" . }}
{{- else }}
{{- required "secrets.existingSecret is required when secrets.create is false" .Values.secrets.existingSecret }}
{{- end }}
{{- end }}

{{/*
ConfigMap name
*/}}
{{- define "backend.configMapName" -}}
{{- include "backend.fullname" . }}-config
{{- end }}

{{/*
Pod labels — selector labels + extra podLabels.
*/}}
{{- define "backend.podLabels" -}}
{{- include "backend.selectorLabels" . | nindent 0 }}
{{- with .Values.podLabels }}
{{- toYaml . | nindent 0 }}
{{- end }}
{{- end }}

