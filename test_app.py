#!/usr/bin/env python3
"""
Quick test to verify all components are working
"""
from scraper import JobScraper
import json

def test_scraper():
    print("🧪 Testing Job Scraper...")
    scraper = JobScraper()
    
    # Test with small number of jobs
    jobs = scraper.search_jobs(["public health"], 3)
    
    print(f"✅ Found {len(jobs)} jobs")
    for i, job in enumerate(jobs, 1):
        print(f"{i}. {job['title']} at {job['organization']}")
        print(f"   📍 {job.get('location', 'N/A')}")
        print(f"   💼 {job.get('work_type', 'N/A')}")
        print(f"   📝 {job.get('description', 'N/A')[:80]}...")
        print()

def test_api():
    print("🌐 Testing API endpoint...")
    import requests
    try:
        response = requests.get('http://localhost:9000/jobs/json', timeout=10)
        if response.status_code == 200:
            jobs = response.json()
            print(f"✅ API returned {len(jobs)} jobs")
        else:
            print(f"❌ API returned status {response.status_code}")
    except Exception as e:
        print(f"❌ API test failed: {e}")

if __name__ == "__main__":
    test_scraper()
    test_api()
