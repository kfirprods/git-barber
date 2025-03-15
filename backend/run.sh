#!/bin/bash

# Activate the virtual environment
source venv/bin/activate

# Run the FastAPI server using git_api.py on port 17380
fastapi run git_api.py --port 17380 