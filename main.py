# Import required libraries - each serves a specific purpose
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import json
from datetime import datetime
from typing import List, Optional
import asyncio
import logging

# Import our custom scraper module
from scraper import JobScraper

# Configure logging to track application behavior and debug issues
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI application instance with metadata
app = FastAPI(
    title="Public Health Job Scraper API",
    description="An intelligent job scraping service for public health monitoring and evaluation positions",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Enable Cross-Origin Resource Sharing (CORS)
# This allows our frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific domains
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Serve static files (CSS, JavaScript, images)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup Jinja2 templates for HTML rendering
templates = Jinja2Templates(directory="templates")
@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring application status
    Deployment platforms use this to verify the app is running
    """
    return {
        "status": "healthy", 
        "timestamp": datetime.now().isoformat(),
        "service": "Public Health Job Scraper",
        "version": "1.0.0"
    }

@app.get("/", response_class=HTMLResponse)
async def read_root():
    """
    Root endpoint that serves the main frontend interface
    Returns the HTML page that users see first
    """
    try:
        with open("templates/index.html", "r", encoding="utf-8") as f:
            html_content = f.read()
        return HTMLResponse(content=html_content)
    except Exception as e:
        logger.error(f"Failed to load frontend: {e}")
        return HTMLResponse(content="<h1>Application Error</h1><p>Failed to load frontend</p>", status_code=500)@app.get("/api/jobs")
async def search_jobs(
    search_terms: str = Query(..., description="Comma-separated search terms like 'monitoring,evaluation,public health'"),
    max_jobs: int = Query(20, ge=5, le=50, description="Maximum number of jobs to return per search term"),
    min_relevance: float = Query(0.3, ge=0.0, le=1.0, description="Minimum relevance score (0.0 to 1.0)"),
    show_only_recent: bool = Query(False, description="Filter to show only jobs from last 24 hours")
):
    """
    Main job search endpoint that coordinates the entire scraping process
    
    This endpoint:
    1. Validates input parameters
    2. Coordinates scraping across multiple search terms
    3. Filters and processes results
    4. Returns structured JSON data
    
    Example usage:
    /api/jobs?search_terms=monitoring,evaluation&max_jobs=15&min_relevance=0.5
    """
    try:
        # Parse and validate search terms
        terms = [term.strip() for term in search_terms.split(",") if term.strip()]
        
        if not terms:
            raise HTTPException(
                status_code=400, 
                detail="Please provide at least one search term. Example: 'monitoring,evaluation,public health'"
            )
        
        logger.info(f"Starting job search for terms: {terms}")
        
        all_jobs = []
        scraper = JobScraper()
        
        # Process each search term asynchronously
        for search_term in terms:
            # Run scraping in thread pool to avoid blocking the main thread
            jobs = await asyncio.to_thread(scraper.scrape_development_sites, search_term, ['reliefweb'])
            filtered_jobs = scraper.filter_public_health_jobs(jobs)
            all_jobs.extend(filtered_jobs)
            
            # Respectful delay between API calls to avoid overwhelming sources
            await asyncio.sleep(2)
        
        # Remove duplicate jobs based on URL
        unique_jobs = []
        seen_urls = set()
        for job in all_jobs:
            if job['url'] not in seen_urls:
                seen_urls.add(job['url'])
                unique_jobs.append(job)
        
        # Apply relevance threshold filter
        unique_jobs = [job for job in unique_jobs if job.get('relevance_score', 0) >= min_relevance]
        
        # Apply recent jobs filter if requested
        if show_only_recent:
            unique_jobs = [job for job in unique_jobs if job.get('is_recent', False)]
        
        logger.info(f"Search completed. Found {len(unique_jobs)} jobs after filtering")
        
        return {
            "search_terms": terms,
            "total_jobs": len(unique_jobs),
            "jobs": unique_jobs,
            "filters_applied": {
                "min_relevance": min_relevance,
                "show_only_recent": show_only_recent
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions (like validation errors)
        raise
    except Exception as e:
        logger.error(f"Search failed with error: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Search failed due to an internal error. Please try again later. Error: {str(e)}"
        )
        @app.get("/api/jobs/download/csv")
async def download_jobs_csv(
    search_terms: str = Query(..., description="Comma-separated search terms"),
    max_jobs: int = Query(20, ge=5, le=50)
):
    """
    Endpoint to download job results as CSV file
    
    CSV format is ideal for spreadsheet applications and data analysis
    """
    try:
        terms = [term.strip() for term in search_terms.split(",") if term.strip()]
        
        if not terms:
            raise HTTPException(status_code=400, detail="No search terms provided")
        
        all_jobs = []
        scraper = JobScraper()
        
        for search_term in terms:
            jobs = await asyncio.to_thread(scraper.scrape_development_sites, search_term, ['reliefweb'])
            filtered_jobs = scraper.filter_public_health_jobs(jobs)
            all_jobs.extend(filtered_jobs)
            await asyncio.sleep(2)  # Be respectful to the API
        
        # Remove duplicates
        unique_jobs = []
        seen_urls = set()
        for job in all_jobs:
            if job['url'] not in seen_urls:
                seen_urls.add(job['url'])
                unique_jobs.append(job)
        
        # Create pandas DataFrame for easy CSV conversion
        df = pd.DataFrame(unique_jobs)
        
        # Generate CSV content
        csv_content = df.to_csv(index=False)
        
        # Create filename with timestamp
        filename = f"public_health_jobs_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"
        
        return JSONResponse(
            content={
                "csv": csv_content, 
                "filename": filename,
                "message": f"Download ready with {len(unique_jobs)} jobs"
            },
            media_type="application/json"
        )
        
    except Exception as e:
        logger.error(f"CSV download failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

@app.get("/api/jobs/download/json")
async def download_jobs_json(
    search_terms: str = Query(..., description="Comma-separated search terms"),
    max_jobs: int = Query(20, ge=5, le=50)
):
    """
    Endpoint to download job results as JSON file
    
    JSON format is ideal for developers and data processing
    """
    try:
        terms = [term.strip() for term in search_terms.split(",") if term.strip()]
        
        if not terms:
            raise HTTPException(status_code=400, detail="No search terms provided")
        
        all_jobs = []
        scraper = JobScraper()
        
        for search_term in terms:
            jobs = await asyncio.to_thread(scraper.scrape_development_sites, search_term, ['reliefweb'])
            filtered_jobs = scraper.filter_public_health_jobs(jobs)
            all_jobs.extend(filtered_jobs)
            await asyncio.sleep(2)
        
        # Remove duplicates
        unique_jobs = []
        seen_urls = set()
        for job in all_jobs:
            if job['url'] not in seen_urls:
                seen_urls.add(job['url'])
                unique_jobs.append(job)
        
        filename = f"public_health_jobs_{datetime.now().strftime('%Y%m%d_%H%M')}.json"
        
        return JSONResponse(
            content={
                "jobs": unique_jobs,
                "filename": filename,
                "total_jobs": len(unique_jobs),
                "timestamp": datetime.now().isoformat()
            },
            media_type="application/json"
        )
        
    except Exception as e:
        logger.error(f"JSON download failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")