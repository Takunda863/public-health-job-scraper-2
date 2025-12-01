from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, Response
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import logging
import os

from scraper import JobScraper

# Configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Public Health Job Scraper", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

templates = Jinja2Templates(directory="templates")

# Serve JavaScript via route instead of StaticFiles
@app.get("/static/script.js")
async def get_script():
    try:
        with open("static/script.js", "r") as f:
            content = f.read()
        return Response(content=content, media_type="application/javascript")
    except Exception as e:
        logger.error(f"Failed to load script.js: {e}")
        # Return a basic script that will at least show errors
        basic_script = """
        console.error('Failed to load main script');
        document.addEventListener('DOMContentLoaded', function() {
            const container = document.getElementById('jobs-container');
            if (container) {
                container.innerHTML = '<div style="text-align: center; padding: 40px; color: #e74c3c;"><h3>JavaScript Load Error</h3><p>Please refresh the page</p></div>';
            }
        });
        """
        return Response(content=basic_script, media_type="application/javascript")

# Serve CSS via route
@app.get("/static/style.css")  
async def get_style():
    try:
        with open("static/style.css", "r") as f:
            content = f.read()
        return Response(content=content, media_type="text/css")
    except Exception as e:
        logger.error(f"Failed to load style.css: {e}")
        return Response(content="body { font-family: Arial, sans-serif; }", media_type="text/css")

# ========== ROUTES ==========
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/jobs/json")
async def get_jobs_json():
    try:
        scraper = JobScraper()
        jobs = scraper.search_jobs(["public health", "epidemiology", "health policy"], 15)
        logger.info(f"✅ Returning {len(jobs)} jobs to frontend")
        return jobs
    except Exception as e:
        logger.error(f"❌ Error in jobs endpoint: {e}")
        return {"error": "Failed to fetch jobs", "details": str(e)}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(), "service": "Public Health Job Scraper"}

@app.get("/test")
async def test_endpoint():
    """Test endpoint to verify the server is working"""
    return {
        "message": "Server is running",
        "timestamp": datetime.now(),
        "endpoints": {
            "health": "/health",
            "jobs": "/jobs/json", 
            "home": "/"
        }
    }
