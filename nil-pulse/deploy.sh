#!/bin/bash

# NIL Pulse Deployment Script
# This script builds and deploys the NIL Pulse platform

set -e  # Exit on any error

echo "🚀 Starting NIL Pulse deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if Docker and Docker Compose are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Dependencies check passed"
}

# Create necessary directories
setup_directories() {
    print_status "Setting up directories..."
    
    mkdir -p nginx/ssl
    mkdir -p backend/logs
    mkdir -p backend/uploads
    
    print_success "Directories created"
}

# Check environment configuration
check_environment() {
    print_status "Checking environment configuration..."
    
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from template..."
        cp .env.example .env 2>/dev/null || echo "Please create .env file from .env.example"
    fi
    
    # Check for required environment variables
    if [ ! -f .env ]; then
        print_error ".env file is required for deployment"
        exit 1
    fi
    
    # Source the .env file
    set -a
    source .env
    set +a
    
    # Check critical variables
    if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your_super_secure_jwt_secret_key_change_this_in_production_2024" ]; then
        print_warning "Please update JWT_SECRET in .env file for production security"
    fi
    
    if [ -z "$SUPABASE_URL" ] || [ "$SUPABASE_URL" = "https://your-project.supabase.co" ]; then
        print_warning "Please configure SUPABASE_URL in .env file"
    fi
    
    print_success "Environment configuration checked"
}

# Build and start services
deploy_services() {
    print_status "Building and starting services..."
    
    # Stop any running services
    print_status "Stopping existing services..."
    docker-compose down --remove-orphans || true
    
    # Build services
    print_status "Building Docker images..."
    docker-compose build --no-cache
    
    # Start services
    print_status "Starting services..."
    docker-compose up -d
    
    print_success "Services started"
}

# Wait for services to be healthy
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        print_status "Health check attempt $attempt/$max_attempts..."
        
        # Check if all services are running
        if docker-compose ps | grep -q "Up (healthy)"; then
            print_success "Services are healthy!"
            return 0
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "Services failed to become healthy after $max_attempts attempts"
            print_status "Checking service logs..."
            docker-compose logs --tail=50
            return 1
        fi
        
        sleep 10
        ((attempt++))
    done
}

# Run database migrations and seeding
setup_database() {
    print_status "Setting up database..."
    
    # Wait for database to be ready
    print_status "Waiting for database connection..."
    sleep 15
    
    # The database setup is handled by the init scripts in docker-compose
    # Check if database is accessible
    if docker-compose exec -T postgres pg_isready -U nil_pulse_user -d nil_pulse; then
        print_success "Database is ready"
    else
        print_error "Database connection failed"
        return 1
    fi
}

# Display deployment information
show_deployment_info() {
    print_success "🎉 NIL Pulse deployed successfully!"
    echo
    echo "📍 Access URLs:"
    echo "   Frontend: http://localhost"
    echo "   API:      http://localhost/api/v1"
    echo "   Health:   http://localhost/health"
    echo
    echo "🔐 Demo Credentials:"
    echo "   Email:    demo@nilpulse.com"
    echo "   Password: demo123"
    echo
    echo "👤 Admin Credentials:"
    echo "   Email:    admin@nilpulse.com" 
    echo "   Password: admin123"
    echo
    echo "📊 Services Status:"
    docker-compose ps
    echo
    echo "📝 To view logs:"
    echo "   All services: docker-compose logs -f"
    echo "   Backend only: docker-compose logs -f backend"
    echo "   Frontend:     docker-compose logs -f frontend"
    echo
    echo "🛑 To stop services:"
    echo "   docker-compose down"
    echo
}

# Main deployment function
main() {
    echo "🎯 NIL Pulse - Real-time NIL Intelligence Platform"
    echo "=================================================="
    echo
    
    check_dependencies
    setup_directories
    check_environment
    deploy_services
    wait_for_services
    setup_database
    show_deployment_info
    
    print_success "Deployment completed successfully! 🚀"
}

# Handle script interruption
cleanup() {
    print_warning "Deployment interrupted. Cleaning up..."
    docker-compose down --remove-orphans || true
    exit 1
}

# Set up signal handling
trap cleanup SIGINT SIGTERM

# Run main function
main "$@"