# 🚀 Public Health Job Scraper - Deployment Guide

## Free Deployment Options

### Option 1: Railway.app (Recommended) - **$0/month**

**Steps:**
1. **Create account** at [railway.app](https://railway.app) (GitHub login)
2. **Create new project** → "Deploy from GitHub repo"
3. **Connect your repository**: `yourusername/public-health-job-scraper`
4. **Automatic deployment**: Railway detects Dockerfile and deploys automatically
5. **Get your URL**: `https://your-app-name.up.railway.app`

**Railway Free Tier:**
- $5/month free credits (never expires for low-traffic apps)
- Unlimited deployments
- Custom domains
- Automatic HTTPS
- 512MB RAM, 0.25 CPU

### Option 2: Render.com (Alternative) - **$0/month**

**Steps:**
1. **Create account** at [render.com](https://render.com)
2. **Click "New+"** → "Web Service"
3. **Connect your GitHub repository**
4. **Configure service:**
   - **Name**: `public-health-scraper`
   - **Environment**: `Docker`
   - **Plan**: `Free`
   - **Branch**: `main`
5. **Click "Create Web Service"**

**Render Free Tier:**
- 750 hours/month (sleeps after 15 minutes inactivity)
- 512MB RAM
- Automatic deployments from GitHub
- Custom domains

## Environment Setup

No environment variables needed for basic functionality. Optional variables for advanced features:

```env
# Optional: Add in Railway/Render dashboard if needed later
LOG_LEVEL=INFO
MAX_JOBS_PER_SEARCH=20
REQUEST_TIMEOUT=30