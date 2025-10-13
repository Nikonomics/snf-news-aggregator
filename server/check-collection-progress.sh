#!/bin/bash

echo "📊 Federal Register Collection Progress"
echo "========================================"
echo ""

# Check if process is running
PID=$(ps aux | grep "collect-federal-register.js 90" | grep -v grep | awk '{print $2}')

if [ -z "$PID" ]; then
    echo "❌ Collection process not running"
    echo ""
    echo "Last 10 lines of log:"
    tail -10 /tmp/federal-register-collection.log 2>/dev/null || echo "No log file found"
else
    echo "✅ Collection process running (PID: $PID)"
    echo ""

    # Count analyzed documents
    ANALYZED=$(grep -c "Analyzing:" /tmp/federal-register-collection.log 2>/dev/null || echo "0")
    INCLUDED=$(grep -c "INCLUDED" /tmp/federal-register-collection.log 2>/dev/null || echo "0")
    FILTERED=$(grep -c "FILTERED OUT" /tmp/federal-register-collection.log 2>/dev/null || echo "0")

    echo "Documents analyzed: $ANALYZED / 49"
    echo "Bills included (≥50 score): $INCLUDED"
    echo "Bills filtered out: $FILTERED"
    echo ""

    # Show last few lines
    echo "Recent activity:"
    echo "----------------"
    tail -5 /tmp/federal-register-collection.log
fi

echo ""
echo "To view full log: tail -f /tmp/federal-register-collection.log"
echo "To check database: curl -s http://localhost:3001/api/bills | jq '.bills | length'"
