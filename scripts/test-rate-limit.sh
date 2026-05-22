#!/usr/bin/env bash
# Test rate limiting
# Usage:
#   ./test-rate-limit.sh              # 10 parallel requests to /api/auth/login
#   ./test-rate-limit.sh 20           # 20 parallel requests
#   ./test-rate-limit.sh 20 seq       # 20 sequential requests
#   ./test-rate-limit.sh 30 par /api/tasks  # 30 parallel to a different endpoint

TOTAL=${1:-10}
MODE=${2:-par}           # par = parallel, seq = sequential
ENDPOINT=${3:-/api/auth/login}
HOST=${HOST:-http://localhost:3001}

if [[ "$ENDPOINT" == *"auth"* || "$ENDPOINT" == *"batch"* ]]; then
  METHOD="POST"
  BODY='{"username":"test","password":"wrong"}'
else
  METHOD="GET"
  BODY=""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Rate limit test"
echo " Endpoint : $METHOD $HOST$ENDPOINT"
echo " Requests : $TOTAL ($MODE)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

run_request() {
  local i=$1
  local args=(-s -o /dev/null -w "%{http_code}" -X "$METHOD" "$HOST$ENDPOINT" -H "Content-Type: application/json")
  [[ -n "$BODY" ]] && args+=(-d "$BODY")
  local status
  status=$(curl "${args[@]}")
  echo "Req $i: $status"
}

if [[ "$MODE" == "seq" ]]; then
  for i in $(seq 1 "$TOTAL"); do
    run_request "$i"
  done
else
  for i in $(seq 1 "$TOTAL"); do
    run_request "$i" &
  done
  wait
fi | sort -t: -k1,1V | tee /tmp/rl_results.txt

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

grep -o '[0-9][0-9][0-9]$' /tmp/rl_results.txt | sort | uniq -c | while read count code; do
  case "$code" in
    2*) label="OK" ;;
    401) label="Unauthorized  — passed rate limit" ;;
    403) label="Forbidden     — passed rate limit" ;;
    429) label="TOO MANY REQ  — blocked by rate limit" ;;
    000) label="No connection — backend offline?" ;;
    *)   label="Other" ;;
  esac
  printf "  HTTP %s  %3d req  %s\n" "$code" "$count" "$label"
done
echo ""
