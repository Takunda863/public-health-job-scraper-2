#!/usr/bin/env python3
"""
Environment validation script
"""
import os
import sys

def check_environment():
    print("🔍 Checking environment...")
    
    # Check required directories
    required_dirs = ['templates', 'static']
    for dir_name in required_dirs:
        if not os.path.exists(dir_name):
            print(f"❌ Missing directory: {dir_name}")
            return False
        print(f"✅ Directory exists: {dir_name}")
    
    # Check required files
    required_files = [
        'templates/index.html',
        'static/script.js', 
        'static/style.css',
        'main.py',
        'scraper.py',
        'requirements.txt'
    ]
    
    for file_path in required_files:
        if not os.path.exists(file_path):
            print(f"❌ Missing file: {file_path}")
            return False
        print(f"✅ File exists: {file_path}")
    
    # Check file sizes (basic content check)
    for file_path in ['templates/index.html', 'static/script.js', 'static/style.css']:
        size = os.path.getsize(file_path)
        if size < 100:  # Arbitrary minimum size
            print(f"⚠️  File seems small: {file_path} ({size} bytes)")
        else:
            print(f"✅ File has content: {file_path} ({size} bytes)")
    
    print("🎉 Environment check completed!")
    return True

if __name__ == "__main__":
    if check_environment():
        print("\n🚀 Ready to start server: uvicorn main:app --reload --host 0.0.0.0 --port 9000")
        sys.exit(0)
    else:
        print("\n❌ Environment issues detected")
        sys.exit(1)
