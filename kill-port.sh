#!/bin/bash

# Kill process on a specific port
# Usage: ./kill-port.sh <port>

PORT=$1

if [ -z "$PORT" ]; then
  echo "Usage: $0 <port>"
  echo "Example: $0 3001"
  exit 1
fi

echo "🔍 Checking port $PORT..."

if command -v lsof > /dev/null 2>&1; then
  PID=$(lsof -ti :$PORT 2>/dev/null)
  if [ -n "$PID" ]; then
    echo "🛑 Found process $PID on port $PORT"
    kill -9 $PID 2>/dev/null
    sleep 1
    if lsof -ti :$PORT > /dev/null 2>&1; then
      echo "❌ Failed to kill process"
      exit 1
    else
      echo "✅ Port $PORT is now free"
    fi
  else
    echo "✅ Port $PORT is already free"
  fi
else
  echo "❌ lsof not found. Please install it or kill the process manually."
  exit 1
fi

