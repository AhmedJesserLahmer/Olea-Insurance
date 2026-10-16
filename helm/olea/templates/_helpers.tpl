{{/* Image reference for a service: <registry>/<image>:<tag> */}}
{{- define "olea.image" -}}
{{- printf "%s/%s:%s" .root.Values.imageRegistry .svc.image (toString .root.Values.imageTag) -}}
{{- end -}}

{{/* Labels shared by every resource */}}
{{- define "olea.labels" -}}
app.kubernetes.io/part-of: olea
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}

{{/* Fully qualified DNS name of a Kafka broker pod */}}
{{- define "olea.kafkaBroker" -}}
{{- printf "kafka-%d.kafka-headless.%s.svc.cluster.local" (int .index) .root.Release.Namespace -}}
{{- end -}}
