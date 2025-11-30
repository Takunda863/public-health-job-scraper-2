# ===== Public Health Job Scraper - Production Dockerfile =====
# This Dockerfile creates an optimized, secure container for production deployment

# Use official Python 3.11 slim image for minimal size and security
FROM python:3.11-slim as builder

# Set environment variables for Python optimization
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Set working directory in container
WORKDIR /app

# Install system dependencies required for Python packages and health checks
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy requirements file first (Docker caching optimization)
COPY requirements.txt .

# Install Python dependencies in a single layer for better caching
RUN pip install --no-cache-dir --user -r requirements.txt

# ===== Production Stage =====
FROM python:3.11-slim as production

# Create non-root user for security (defense in depth)
RUN groupadd -r app && useradd -r -g app app

# Set environment variables for production
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/home/app/.local/bin:${PATH}" \
    PORT=8000

# Create app directory and set permissions
WORKDIR /app
RUN chown app:app /app

# Copy installed packages from builder stage
COPY --from=builder --chown=app:app /root/.local /home/app/.local
COPY --chown=app:app . .

# Switch to non-root user
USER app

# Expose port (Railway/Render will override $PORT)
EXPOSE 8000

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the application with production settings
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]