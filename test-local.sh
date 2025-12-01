#!/bin/bash

# ===== Public Health Job Scraper - Local Test Script =====
# This script tests the application locally before deployment

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Build the Docker image
build_image() {
    print_status "Building Docker image..."
    if docker build -t public-health-scraper .; then
        print_success "Docker image built successfully"
    else
        print_error "Failed to build Docker image"
        exit 1
    fi
}

# Run the container
run_container() {
    print_status "Starting container..."
    CONTAINER_ID=$(docker run -d -p 8000:8000 --name scraper-test public-health-scraper)
    
    if [ $? -eq 0 ]; then
        print_success "Container started with ID: ${CONTAINER_ID:0:12}"
    else
        print_error "Failed to start container"
        exit 1
    fi
}

# Wait for application to be ready
wait_for_app() {
    print_status "Waiting for application to start..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:8000/health > /dev/null; then
            print_success "Application is ready!"
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts - Application not ready yet..."
        sleep 2
        ((attempt++))
    done
    
    print_error "Application failed to start within 60 seconds"
    return 1
}

# Run health check
test_health_endpoint() {
    print_status "Testing health endpoint..."
    
    local response
    response=$(curl -s -w "%{http_code}" http://localhost:8000/health)
    local status_code=${response: -3}
    local response_body=${response%???}
    
    if [ "$status_code" -eq 200 ]; then
        print_success "Health endpoint returned 200 OK"
        echo "Response: $response_body"
    else
        print_error "Health endpoint failed with status: $status_code"
        return 1
    fi
}

# Test API endpoints
test_api_endpoints() {
    print_status "Testing API endpoints..."
    
    # Test jobs endpoint
    print_status "Testing /api/jobs endpoint..."
    local jobs_response
    jobs_response=$(curl -s -w "%{http_code}" "http://localhost:8000/api/jobs?search_terms=public%20health&max_jobs=5")
    local jobs_status=${jobs_response: -3}
    
    if [ "$jobs_status" -eq 200 ]; then
        print_success "Jobs API endpoint working"
    else
        print_warning "Jobs API returned status: $jobs_status (this might be expected if no jobs found)"
    fi
    
    # Test docs endpoint
    print_status "Testing API documentation..."
    if curl -s http://localhost:8000/docs > /dev/null; then
        print_success "API documentation is accessible"
    else
        print_warning "API documentation not accessible"
    fi
}

# Check container logs
check_logs() {
    print_status "Checking container logs..."
    docker logs scraper-test --tail 20
}

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    
    # Stop and remove container
    if docker stop scraper-test > /dev/null 2>&1; then
        print_success "Container stopped"
    fi
    
    if docker rm scraper-test > /dev/null 2>&1; then
        print_success "Container removed"
    fi
    
    # Remove image (optional)
    read -p "Remove Docker image? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if docker rmi public-health-scraper > /dev/null 2>&1; then
            print_success "Docker image removed"
        else
            print_warning "Could not remove Docker image (might be in use)"
        fi
    fi
}

# Main execution
main() {
    echo "=========================================="
    echo "   Public Health Job Scraper - Local Test"
    echo "=========================================="
    echo ""
    
    # Set up trap for cleanup on script exit
    trap cleanup EXIT
    
    # Run tests
    check_docker
    build_image
    run_container
    
    if wait_for_app; then
        test_health_endpoint
        test_api_endpoints
        check_logs
        
        echo ""
        print_success "✅ All tests completed successfully!"
        echo ""
        echo "🌐 Your application is running at: http://localhost:8000"
        echo "📚 API documentation: http://localhost:8000/docs"
        echo "❤️  Health check: http://localhost:8000/health"
        echo ""
        echo "Press Ctrl+C to stop the application and cleanup..."
        
        # Keep container running until user interrupts
        while true; do
            sleep 10
        done
    else
        check_logs
        print_error "❌ Application failed to start"
        exit 1
    fi
}

# Run main function
main "$@"