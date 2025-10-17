#!/bin/bash

# Script to check if the Render deployment is complete
# Usage: ./check_deployment.sh

echo "Checking Render deployment status..."
echo "Waiting for chunks to update from 67 to 225..."
echo ""

for i in {1..30}; do
    echo -n "Attempt $i/30: "
    
    response=$(curl -s https://alf-chatbot.onrender.com/health 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        chunks=$(echo $response | grep -o '"chunks_loaded":[0-9]*' | grep -o '[0-9]*')
        status=$(echo $response | grep -o '"status":"[^"]*"' | grep -o '"[^"]*"' | tr -d '"')
        
        echo "Status: $status | Chunks: $chunks"
        
        if [ "$chunks" == "225" ]; then
            echo ""
            echo "✅ DEPLOYMENT COMPLETE!"
            echo "✅ Knowledge base updated successfully!"
            echo "✅ All 225 chunks are now available"
            echo ""
            echo "Testing with a sample query..."
            echo ""
            
            # Test with a sample query
            curl -s -X POST https://alf-chatbot.onrender.com/query \
              -H "Content-Type: application/json" \
              -d '{"question": "What are the food safety requirements?", "top_k": 3}' \
              | python3 -m json.tool | head -20
            
            exit 0
        fi
    else
        echo "Service not responding yet..."
    fi
    
    if [ $i -lt 30 ]; then
        echo "Waiting 10 seconds before next check..."
        sleep 10
    fi
done

echo ""
echo "⚠️  Deployment check timed out after 5 minutes"
echo "Please check Render dashboard for deployment status"
echo "https://dashboard.render.com"

