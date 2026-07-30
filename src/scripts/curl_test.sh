#!/bin/bash
# Load env
export $(grep -v '^#' backend/.env | xargs)
API_KEY=${GEMINI_API_KEY:-$Gemini_API_Key}

if [ -z "$API_KEY" ]; then
    echo "❌ No API Key found"
    exit 1
fi

echo "📡 Testing v1/models with curl..."
curl -s "https://generativelanguage.googleapis.com/v1/models?key=$API_KEY" | grep "name" | head -n 10

echo -e "\n📡 Testing v1beta/models with curl..."
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$API_KEY" | grep "name" | head -n 10

echo -e "\n📡 Testing gemini-1.5-flash on v1..."
curl -X POST "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=$API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{
      "contents": [{
        "parts":[{"text": "Write a short poem about science."}]
      }]
    }' | grep -A 5 "error"
