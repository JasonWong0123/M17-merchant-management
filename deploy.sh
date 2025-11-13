#!/bin/bash

# M17 Merchant Management API - Deployment Script
# This script helps deploy the API in various environments

set -e

echo "🚀 M17 Merchant Management API Deployment Script"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${ENVIRONMENT:-production}
PORT=${PORT:-3000}
IMAGE_NAME=${IMAGE_NAME:-m17-merchant-api}
CONTAINER_NAME=${CONTAINER_NAME:-m17-merchant-api}

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    print_status "Docker is installed"
}

# Function to check if Docker Compose is installed
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        print_warning "Docker Compose is not installed. Some features may not be available."
        return 1
    fi
    print_status "Docker Compose is installed"
    return 0
}

# Function to build Docker image
build_image() {
    print_info "Building Docker image..."
    docker build -t ${IMAGE_NAME}:latest .
    print_status "Docker image built successfully"
}

# Function to run container
run_container() {
    print_info "Starting container..."
    
    # Stop existing container if running
    if docker ps -q -f name=${CONTAINER_NAME} | grep -q .; then
        print_info "Stopping existing container..."
        docker stop ${CONTAINER_NAME}
        docker rm ${CONTAINER_NAME}
    fi
    
    # Create data and logs directories if they don't exist
    mkdir -p data logs
    
    # Run new container
    docker run -d \
        --name ${CONTAINER_NAME} \
        -p ${PORT}:3000 \
        -v $(pwd)/data:/app/data \
        -v $(pwd)/logs:/app/logs \
        -e NODE_ENV=${ENVIRONMENT} \
        -e LOG_LEVEL=info \
        --restart unless-stopped \
        ${IMAGE_NAME}:latest
    
    print_status "Container started successfully"
    print_info "API available at: http://localhost:${PORT}"
}

# Function to run with Docker Compose
run_compose() {
    if check_docker_compose; then
        print_info "Starting services with Docker Compose..."
        docker-compose up -d
        print_status "Services started successfully"
        print_info "API available at: http://localhost:3000"
        print_info "View logs: docker-compose logs -f"
    else
        print_error "Docker Compose is required for this option"
        exit 1
    fi
}

# Function to show logs
show_logs() {
    if docker ps -q -f name=${CONTAINER_NAME} | grep -q .; then
        print_info "Showing container logs (Ctrl+C to exit)..."
        docker logs -f ${CONTAINER_NAME}
    else
        print_error "Container ${CONTAINER_NAME} is not running"
        exit 1
    fi
}

# Function to stop services
stop_services() {
    print_info "Stopping services..."
    
    if docker ps -q -f name=${CONTAINER_NAME} | grep -q .; then
        docker stop ${CONTAINER_NAME}
        docker rm ${CONTAINER_NAME}
        print_status "Container stopped"
    fi
    
    if check_docker_compose && [ -f docker-compose.yml ]; then
        docker-compose down
        print_status "Docker Compose services stopped"
    fi
}

# Function to show status
show_status() {
    print_info "Service Status:"
    echo "==============="
    
    if docker ps -q -f name=${CONTAINER_NAME} | grep -q .; then
        print_status "Container ${CONTAINER_NAME} is running"
        echo "Port mapping: $(docker port ${CONTAINER_NAME})"
    else
        print_warning "Container ${CONTAINER_NAME} is not running"
    fi
    
    if check_docker_compose && [ -f docker-compose.yml ]; then
        echo ""
        print_info "Docker Compose Status:"
        docker-compose ps
    fi
}

# Function to test API
test_api() {
    local base_url="http://localhost:${PORT}"
    
    print_info "Testing API endpoints..."
    
    # Test API info endpoint
    if curl -s -f "${base_url}/api" > /dev/null; then
        print_status "API is responding"
    else
        print_error "API is not responding"
        return 1
    fi
    
    # Test categories endpoint
    if curl -s -f "${base_url}/api/merchant/categories" > /dev/null; then
        print_status "Categories endpoint working"
    else
        print_error "Categories endpoint not working"
        return 1
    fi
    
    # Test dishes endpoint
    if curl -s -f "${base_url}/api/merchant/dishes" > /dev/null; then
        print_status "Dishes endpoint working"
    else
        print_error "Dishes endpoint not working"
        return 1
    fi
    
    print_status "All API tests passed!"
}

# Function to show help
show_help() {
    echo "M17 Merchant Management API Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  build       Build Docker image"
    echo "  run         Run container (build + start)"
    echo "  compose     Run with Docker Compose"
    echo "  logs        Show container logs"
    echo "  status      Show service status"
    echo "  test        Test API endpoints"
    echo "  stop        Stop all services"
    echo "  help        Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  ENVIRONMENT    Environment (default: production)"
    echo "  PORT          Port to expose (default: 3000)"
    echo "  IMAGE_NAME    Docker image name (default: m17-merchant-api)"
    echo "  CONTAINER_NAME Container name (default: m17-merchant-api)"
    echo ""
    echo "Examples:"
    echo "  $0 run                    # Build and run container"
    echo "  $0 compose               # Run with Docker Compose"
    echo "  PORT=8080 $0 run         # Run on port 8080"
    echo "  $0 test                  # Test API endpoints"
    echo "  $0 logs                  # View logs"
    echo "  $0 stop                  # Stop services"
}

# Main script logic
main() {
    case "${1:-help}" in
        "build")
            check_docker
            build_image
            ;;
        "run")
            check_docker
            build_image
            run_container
            sleep 5
            test_api
            ;;
        "compose")
            check_docker
            run_compose
            sleep 10
            test_api
            ;;
        "logs")
            show_logs
            ;;
        "status")
            show_status
            ;;
        "test")
            test_api
            ;;
        "stop")
            stop_services
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"
