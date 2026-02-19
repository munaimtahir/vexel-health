#!/usr/bin/env bash
set -euo pipefail

API_BASE="http://127.0.0.1:3000"
HOST_HEADER="vexel.alshifalab.pk"
HTTP_LOG="_audit_evidence/workflow_audit/e2e_http_requests.jsonl"
SNAPSHOT_LOG="_audit_evidence/workflow_audit/e2e_status_snapshots.jsonl"
PDF_FILE="_audit_evidence/workflow_audit/e2e_report.pdf"

TOKEN=""
PATIENT_ID=""
ENCOUNTER_ID=""
DOCUMENT_ID=""
DOCUMENT_STATUS=""
DOCUMENT_PDF_HASH=""

LAST_BODY=""
LAST_STATUS=""
LAST_RESP_REQUEST_ID=""
LAST_CORRELATION_ID=""

json_compact() {
  jq -c . <<<"$1"
}

api_call() {
  local method="$1"
  local path="$2"
  local req_id="$3"
  local body="${4-}"

  local headers_file
  local body_file
  headers_file="$(mktemp)"
  body_file="$(mktemp)"

  local -a cmd
  cmd=(curl -sS -D "$headers_file" -o "$body_file" -X "$method" "$API_BASE$path" \
    -H "Host: $HOST_HEADER" \
    -H "Accept: application/json" \
    -H "x-request-id: $req_id")

  if [[ -n "$TOKEN" ]]; then
    cmd+=( -H "Authorization: Bearer $TOKEN" )
  fi

  if [[ -n "$body" ]]; then
    cmd+=( -H "Content-Type: application/json" --data "$body" )
  fi

  "${cmd[@]}"

  LAST_STATUS="$(awk 'NR==1 {print $2}' "$headers_file")"
  LAST_RESP_REQUEST_ID="$(awk 'tolower($1)=="x-request-id:" {print $2}' "$headers_file" | tr -d '\r' | head -n1)"
  LAST_CORRELATION_ID="$(awk 'tolower($1)=="x-correlation-id:" {print $2}' "$headers_file" | tr -d '\r' | head -n1)"
  LAST_BODY="$(cat "$body_file")"

  jq -nc \
    --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg method "$method" \
    --arg path "$path" \
    --arg requestId "$req_id" \
    --arg responseRequestId "$LAST_RESP_REQUEST_ID" \
    --arg correlationId "$LAST_CORRELATION_ID" \
    --arg status "$LAST_STATUS" \
    --arg requestBody "$body" \
    --arg responseBody "$LAST_BODY" \
    '{ts:$ts,method:$method,path:$path,requestId:$requestId,responseRequestId:$responseRequestId,correlationId:$correlationId,status:($status|tonumber),requestBody:(if $requestBody=="" then null else ($requestBody|fromjson) end),responseBody:(if ($responseBody|startswith("{")) or ($responseBody|startswith("[")) then ($responseBody|fromjson) else $responseBody end)}' \
    >> "$HTTP_LOG"

  rm -f "$headers_file" "$body_file"
}

snapshot() {
  local step="$1"
  local prefix="$2"

  api_call GET "/encounters/$ENCOUNTER_ID" "${prefix}-encounter"
  local encounter_json
  encounter_json="$(json_compact "$LAST_BODY")"

  api_call GET "/encounters/$ENCOUNTER_ID/prep" "${prefix}-prep"
  local prep_json
  prep_json="$(json_compact "$LAST_BODY")"

  api_call GET "/encounters/$ENCOUNTER_ID/main" "${prefix}-main"
  local main_json
  main_json="$(json_compact "$LAST_BODY")"

  local document_json="null"
  if [[ -n "$DOCUMENT_ID" ]]; then
    api_call GET "/documents/$DOCUMENT_ID" "${prefix}-document"
    document_json="$(json_compact "$LAST_BODY")"
  fi

  jq -nc \
    --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg step "$step" \
    --argjson encounter "$encounter_json" \
    --argjson prep "$prep_json" \
    --argjson main "$main_json" \
    --argjson document "$document_json" \
    '{ts:$ts,step:$step,encounter:$encounter,prep:$prep,main:$main,document:$document}' \
    >> "$SNAPSHOT_LOG"
}

# 1) Login
api_call POST "/auth/login" "e2e-01-login" '{"email":"admin@vexel.dev","password":"Admin@123!"}'
TOKEN="$(jq -r '.accessToken' <<<"$LAST_BODY")"

# 2) Register patient
api_call POST "/patients" "e2e-02-register-patient" '{"name":"Workflow Audit Patient","dob":"1990-01-01","gender":"male","phone":"5551230000"}'
PATIENT_ID="$(jq -r '.id' <<<"$LAST_BODY")"

# 3) Create LAB encounter (closest current implementation to order)
api_call POST "/encounters" "e2e-03-create-encounter" "$(jq -nc --arg patientId "$PATIENT_ID" '{patientId:$patientId,type:"LAB"}')"
ENCOUNTER_ID="$(jq -r '.id' <<<"$LAST_BODY")"
snapshot "after_create_encounter" "e2e-s01"

# 4) Start prep
api_call POST "/encounters/$ENCOUNTER_ID:start-prep" "e2e-04-start-prep"
snapshot "after_start_prep" "e2e-s02"

# 5) Save prep (collect + receive sample)
api_call POST "/encounters/$ENCOUNTER_ID:save-prep" "e2e-05-save-prep" '{"specimenType":"Blood","collectedAt":"2026-02-19T01:45:00.000Z","collectorName":"Nurse A","receivedAt":"2026-02-19T01:47:00.000Z"}'
snapshot "after_collect_receive_sample" "e2e-s03"

# 6) Start main/result phase
api_call POST "/encounters/$ENCOUNTER_ID:start-main" "e2e-06-start-main"
snapshot "after_start_main" "e2e-s04"

# 7) Enter result (Albumin 4.5)
api_call POST "/encounters/$ENCOUNTER_ID:save-main" "e2e-07-save-main" '{"resultSummary":"Albumin: 4.5 g/dL","verifiedBy":"Dr Workflow","verifiedAt":"2026-02-19T01:48:00.000Z"}'
snapshot "after_enter_result" "e2e-s05"

# 8) Finalize (closest current implementation to verify)
api_call POST "/encounters/$ENCOUNTER_ID:finalize" "e2e-08-finalize"
snapshot "after_finalize_verify" "e2e-s06"

# 9) Publish document
api_call POST "/encounters/$ENCOUNTER_ID:document" "e2e-09-publish-document" '{"documentType":"LAB_REPORT_V1"}'
DOCUMENT_ID="$(jq -r '.id' <<<"$LAST_BODY")"
DOCUMENT_STATUS="$(jq -r '.status' <<<"$LAST_BODY")"

# 10) Poll until rendered
for i in {1..20}; do
  api_call GET "/documents/$DOCUMENT_ID" "e2e-10-doc-poll-$i"
  DOCUMENT_STATUS="$(jq -r '.status' <<<"$LAST_BODY")"
  if [[ "$DOCUMENT_STATUS" == "RENDERED" ]]; then
    DOCUMENT_PDF_HASH="$(jq -r '.pdfHash // empty' <<<"$LAST_BODY")"
    break
  fi
  sleep 1
done

# 11) Download PDF bytes
headers_file="$(mktemp)"
curl -sS -D "$headers_file" -o "$PDF_FILE" \
  -H "Host: $HOST_HEADER" \
  -H "x-request-id: e2e-11-download-pdf" \
  -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/documents/$DOCUMENT_ID/file"

pdf_status="$(awk 'NR==1 {print $2}' "$headers_file")"
pdf_resp_req_id="$(awk 'tolower($1)=="x-request-id:" {print $2}' "$headers_file" | tr -d '\r' | head -n1)"
pdf_corr_id="$(awk 'tolower($1)=="x-correlation-id:" {print $2}' "$headers_file" | tr -d '\r' | head -n1)"
pdf_bytes="$(wc -c < "$PDF_FILE" | tr -d ' ')"
pdf_sha256="$(sha256sum "$PDF_FILE" | awk '{print $1}')"

jq -nc \
  --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg method "GET" \
  --arg path "/documents/$DOCUMENT_ID/file" \
  --arg requestId "e2e-11-download-pdf" \
  --arg responseRequestId "$pdf_resp_req_id" \
  --arg correlationId "$pdf_corr_id" \
  --arg status "$pdf_status" \
  --argjson bytes "$pdf_bytes" \
  --arg sha256 "$pdf_sha256" \
  '{ts:$ts,method:$method,path:$path,requestId:$requestId,responseRequestId:$responseRequestId,correlationId:$correlationId,status:($status|tonumber),responseBody:{contentType:"application/pdf",bytes:$bytes,sha256:$sha256}}' \
  >> "$HTTP_LOG"
rm -f "$headers_file"

snapshot "after_publish_render_download" "e2e-s07"

jq -nc \
  --arg tenantId "11111111-1111-4111-8111-111111111111" \
  --arg patientId "$PATIENT_ID" \
  --arg encounterId "$ENCOUNTER_ID" \
  --arg documentId "$DOCUMENT_ID" \
  --arg documentStatus "$DOCUMENT_STATUS" \
  --arg pdfHash "$DOCUMENT_PDF_HASH" \
  --arg downloadedPdfSha256 "$pdf_sha256" \
  --arg downloadedPdfBytes "$pdf_bytes" \
  '{tenantId:$tenantId,patientId:$patientId,encounterId:$encounterId,documentId:$documentId,documentStatus:$documentStatus,pdfHash:$pdfHash,downloadedPdfSha256:$downloadedPdfSha256,downloadedPdfBytes:($downloadedPdfBytes|tonumber)}' \
  > _audit_evidence/workflow_audit/e2e_summary.json

echo "golden_path_completed encounter=$ENCOUNTER_ID document=$DOCUMENT_ID status=$DOCUMENT_STATUS"
