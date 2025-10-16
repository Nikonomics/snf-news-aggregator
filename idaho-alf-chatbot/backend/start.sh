#!/bin/bash
# Startup script for Idaho ALF RegNavigator

# Load environment variables if .env exists
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

# Start the application
python main.py