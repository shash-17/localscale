#!/bin/bash
# ═══════════════════════════════════════════════════════
# LocalScale Demo — Load Generator
# Hammers the /compute endpoint to create visible CPU load
# Usage: bash demo-app/load.sh [duration_seconds] [concurrency]
# ═══════════════════════════════════════════════════════

DURATION=${1:-60}
CONCURRENCY=${2:-10}
ENDPOINT="http://localhost:9090/compute"

echo "══════════════════════════════════════════"
echo "  LocalScale Load Generator"
echo "  Target:      $ENDPOINT"
echo "  Duration:    ${DURATION}s"
echo "  Concurrency: $CONCURRENCY workers"
echo "══════════════════════════════════════════"
echo ""
echo "Starting load... (Ctrl+C to stop)"
echo ""

END=$((SECONDS + DURATION))

for i in $(seq 1 $CONCURRENCY); do
  (
    while [ $SECONDS -lt $END ]; do
      curl -s "$ENDPOINT" > /dev/null 2>&1
    done
  ) &
done

# Wait and show progress
while [ $SECONDS -lt $END ]; do
  REMAINING=$((END - SECONDS))
  echo -ne "\r  ⏱  ${REMAINING}s remaining | ${CONCURRENCY} concurrent workers"
  sleep 1
done

echo -e "\n\n✅ Load test complete. Check the dashboard for results."
wait
