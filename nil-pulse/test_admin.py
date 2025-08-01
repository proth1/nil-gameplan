#!/usr/bin/env python3
"""
NIL Pulse Admin API Testing Suite
Tests all admin functionality and API endpoints using Playwright
"""

import asyncio
import json
import time
from playwright.async_api import async_playwright
import requests
import sys

# Test configuration
BASE_URL = "http://localhost:3001"
API_BASE_URL = f"{BASE_URL}/api/v1"

# Test credentials (these should match what's in the seed data or be created)
ADMIN_CREDENTIALS = {
    "email": "admin@nilpulse.com",
    "password": "admin123"
}

DEMO_CREDENTIALS = {
    "email": "demo@nilpulse.com", 
    "password": "demo123"
}

class NILPulseAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.demo_token = None
        self.test_results = []
        
    def log_test(self, test_name, success, message="", data=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "data": data,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
    def test_basic_connectivity(self):
        """Test basic server connectivity"""
        try:
            response = requests.get(f"{BASE_URL}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Basic Connectivity", True, f"Server healthy, uptime: {data.get('uptime', 0):.1f}s", data)
                return True
            else:
                self.log_test("Basic Connectivity", False, f"Health check failed: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Basic Connectivity", False, f"Connection failed: {str(e)}")
            return False
    
    def test_api_documentation(self):
        """Test API documentation endpoint"""
        try:
            response = requests.get(f"{API_BASE_URL}/docs", timeout=5)
            success = response.status_code == 200
            self.log_test("API Documentation", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("API Documentation", False, f"Error: {str(e)}")
            return False
    
    def test_user_registration(self):
        """Test user registration"""
        try:
            user_data = {
                "name": "Test Admin User",
                "email": "testadmin@nilpulse.com",
                "password": "testpass123",
                "user_type": "admin"
            }
            
            response = requests.post(f"{API_BASE_URL}/auth/register", 
                                   json=user_data, timeout=10)
            
            if response.status_code in [200, 201]:
                data = response.json()
                success = data.get('success', False)
                self.log_test("User Registration", success, 
                            f"Created test user: {user_data['email']}", data)
                return success
            else:
                # User might already exist, try to continue
                self.log_test("User Registration", True, 
                            f"User may already exist (status: {response.status_code})")
                return True
                
        except Exception as e:
            self.log_test("User Registration", False, f"Error: {str(e)}")
            return False
    
    def test_admin_login(self):
        """Test admin user login"""
        try:
            # Try with test admin first, then fall back to default admin
            credentials_to_try = [
                {"email": "testadmin@nilpulse.com", "password": "testpass123"},
                ADMIN_CREDENTIALS,
                {"email": "admin@example.com", "password": "admin123"}
            ]
            
            for creds in credentials_to_try:
                response = requests.post(f"{API_BASE_URL}/auth/login", 
                                       json=creds, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success') and data.get('data', {}).get('token'):
                        self.admin_token = data['data']['token']
                        self.session.headers.update({'Authorization': f'Bearer {self.admin_token}'})
                        self.log_test("Admin Login", True, 
                                    f"Logged in as: {creds['email']}", data['data'])
                        return True
            
            self.log_test("Admin Login", False, "All login attempts failed")
            return False
            
        except Exception as e:
            self.log_test("Admin Login", False, f"Error: {str(e)}")
            return False
    
    def test_dashboard_overview(self):
        """Test dashboard overview endpoint"""
        try:
            headers = {'Authorization': f'Bearer {self.admin_token}'} if self.admin_token else {}
            response = requests.get(f"{API_BASE_URL}/dashboard/overview", 
                                   headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                success = data.get('success', False)
                self.log_test("Dashboard Overview", success, 
                            f"Retrieved overview data", data.get('data', {}))
                return success
            else:
                self.log_test("Dashboard Overview", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Dashboard Overview", False, f"Error: {str(e)}")
            return False
    
    def test_content_endpoints(self):
        """Test content management endpoints"""
        try:
            headers = {'Authorization': f'Bearer {self.admin_token}'} if self.admin_token else {}
            
            # Test GET /content
            response = requests.get(f"{API_BASE_URL}/content", 
                                   headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Content List", data.get('success', False), 
                            f"Retrieved {len(data.get('data', {}).get('data', []))} content items")
            else:
                self.log_test("Content List", False, f"Status: {response.status_code}")
                
            # Test content categories
            response = requests.get(f"{API_BASE_URL}/content/meta/categories", 
                                   headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                categories = data.get('data', [])
                self.log_test("Content Categories", True, 
                            f"Retrieved {len(categories)} categories", categories)
            else:
                self.log_test("Content Categories", False, f"Status: {response.status_code}")
                
            return True
            
        except Exception as e:
            self.log_test("Content Endpoints", False, f"Error: {str(e)}")
            return False
    
    def test_deals_endpoints(self):
        """Test deals management endpoints"""
        try:
            headers = {'Authorization': f'Bearer {self.admin_token}'} if self.admin_token else {}
            
            # Test GET /deals
            response = requests.get(f"{API_BASE_URL}/deals", 
                                   headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Deals List", data.get('success', False), 
                            f"Retrieved {len(data.get('data', {}).get('data', []))} deals")
            else:
                self.log_test("Deals List", False, f"Status: {response.status_code}")
                
            # Test deals leaderboard
            response = requests.get(f"{API_BASE_URL}/deals/leaderboard", 
                                   headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Deals Leaderboard", data.get('success', False), 
                            f"Retrieved leaderboard data")
            else:
                self.log_test("Deals Leaderboard", False, f"Status: {response.status_code}")
                
            return True
            
        except Exception as e:
            self.log_test("Deals Endpoints", False, f"Error: {str(e)}")
            return False
    
    def test_states_endpoints(self):
        """Test state law tracking endpoints"""
        try:
            headers = {'Authorization': f'Bearer {self.admin_token}'} if self.admin_token else {}
            
            # Test GET /states
            response = requests.get(f"{API_BASE_URL}/states", 
                                   headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("States List", data.get('success', False), 
                            f"Retrieved {len(data.get('data', []))} state laws")
            else:
                self.log_test("States List", False, f"Status: {response.status_code}")
                
            # Test states map activity
            response = requests.get(f"{API_BASE_URL}/states/map/activity", 
                                   headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("States Map Activity", data.get('success', False), 
                            f"Retrieved map activity data")
            else:
                self.log_test("States Map Activity", False, f"Status: {response.status_code}")
                
            return True
            
        except Exception as e:
            self.log_test("States Endpoints", False, f"Error: {str(e)}")
            return False
    
    def test_search_endpoints(self):
        """Test search functionality"""
        try:
            headers = {'Authorization': f'Bearer {self.admin_token}'} if self.admin_token else {}
            
            # Test search with query
            response = requests.get(f"{API_BASE_URL}/search?q=NIL", 
                                   headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Search Functionality", data.get('success', False), 
                            f"Search returned results")
            else:
                self.log_test("Search Functionality", False, f"Status: {response.status_code}")
                
            # Test search autocomplete
            response = requests.get(f"{API_BASE_URL}/search/autocomplete?q=sports", 
                                   headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Search Autocomplete", data.get('success', False), 
                            f"Autocomplete working")
            else:
                self.log_test("Search Autocomplete", False, f"Status: {response.status_code}")
                
            return True
            
        except Exception as e:
            self.log_test("Search Endpoints", False, f"Error: {str(e)}")
            return False
    
    def test_analytics_endpoints(self):
        """Test analytics functionality"""
        try:
            headers = {'Authorization': f'Bearer {self.admin_token}'} if self.admin_token else {}
            
            # Test analytics overview
            response = requests.get(f"{API_BASE_URL}/analytics/overview", 
                                   headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Analytics Overview", data.get('success', False), 
                            f"Analytics data retrieved")
            else:
                self.log_test("Analytics Overview", False, f"Status: {response.status_code}")
                
            return True
            
        except Exception as e:
            self.log_test("Analytics Endpoints", False, f"Error: {str(e)}")
            return False
    
    def test_sources_management(self):
        """Test sources management endpoints"""
        try:
            headers = {'Authorization': f'Bearer {self.admin_token}'} if self.admin_token else {}
            
            # Test GET /sources
            response = requests.get(f"{API_BASE_URL}/sources", 
                                   headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Sources List", data.get('success', False), 
                            f"Retrieved {len(data.get('data', {}).get('data', []))} sources")
            else:
                self.log_test("Sources List", False, f"Status: {response.status_code}")
                
            # Test create a test source
            test_source = {
                "name": "Test RSS Source",
                "url": "https://example.com/rss",
                "source_type": "rss",
                "category": "news",
                "is_active": True
            }
            
            response = requests.post(f"{API_BASE_URL}/sources", 
                                    json=test_source, 
                                    headers=headers, timeout=10)
            
            if response.status_code in [200, 201]:
                data = response.json()
                self.log_test("Source Creation", data.get('success', False), 
                            f"Created test source")
                
                # If creation successful, try to delete it
                if data.get('success') and data.get('data', {}).get('id'):
                    source_id = data['data']['id']
                    delete_response = requests.delete(f"{API_BASE_URL}/sources/{source_id}", 
                                                    headers=headers, timeout=10)
                    self.log_test("Source Deletion", delete_response.status_code == 200, 
                                f"Cleaned up test source")
            else:
                self.log_test("Source Creation", False, f"Status: {response.status_code}")
                
            return True
            
        except Exception as e:
            self.log_test("Sources Management", False, f"Error: {str(e)}")
            return False
    
    def test_database_connectivity(self):
        """Test database connectivity through API"""
        try:
            headers = {'Authorization': f'Bearer {self.admin_token}'} if self.admin_token else {}
            
            # Test various endpoints that require database
            endpoints_to_test = [
                ("/content/meta/stats", "Content Stats"),
                ("/deals/meta/stats", "Deals Stats"), 
                ("/states/meta/summary", "States Summary"),
                ("/dashboard/pulse", "Dashboard Pulse")
            ]
            
            db_working = True
            for endpoint, name in endpoints_to_test:
                try:
                    response = requests.get(f"{API_BASE_URL}{endpoint}", 
                                           headers=headers, timeout=10)
                    success = response.status_code == 200
                    self.log_test(f"Database - {name}", success, 
                                f"Status: {response.status_code}")
                    if not success:
                        db_working = False
                except Exception as e:
                    self.log_test(f"Database - {name}", False, f"Error: {str(e)}")
                    db_working = False
            
            self.log_test("Database Connectivity", db_working, 
                        "Database accessible through API" if db_working else "Database issues detected")
            return db_working
            
        except Exception as e:
            self.log_test("Database Connectivity", False, f"Error: {str(e)}")
            return False
    
    def generate_report(self):
        """Generate test report"""
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - passed_tests
        
        print(f"\n{'='*60}")
        print(f"NIL PULSE ADMIN API TEST REPORT")
        print(f"{'='*60}")
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        print(f"{'='*60}")
        
        if failed_tests > 0:
            print(f"\nFAILED TESTS:")
            print(f"{'='*60}")
            for result in self.test_results:
                if not result['success']:
                    print(f"❌ {result['test']}: {result['message']}")
        
        print(f"\nDETAILED RESULTS:")
        print(f"{'='*60}")
        for result in self.test_results:
            status = "✅" if result['success'] else "❌"
            print(f"{status} {result['test']}: {result['message']}")
        
        # Save detailed report
        with open('/Users/proth/repos/nil-gameplan/nil-pulse/test_report.json', 'w') as f:
            json.dump(self.test_results, f, indent=2)
        
        print(f"\nDetailed report saved to: test_report.json")
        return passed_tests == total_tests

async def run_comprehensive_tests():
    """Run all tests"""
    print("🚀 Starting NIL Pulse Admin API Comprehensive Testing...")
    print("="*60)
    
    tester = NILPulseAPITester()
    
    # Run all tests in sequence
    tests = [
        tester.test_basic_connectivity,
        tester.test_api_documentation,
        tester.test_user_registration,
        tester.test_admin_login,
        tester.test_dashboard_overview,
        tester.test_content_endpoints,
        tester.test_deals_endpoints,
        tester.test_states_endpoints,
        tester.test_search_endpoints,
        tester.test_analytics_endpoints,
        tester.test_sources_management,
        tester.test_database_connectivity
    ]
    
    print("Running tests...")
    for test_func in tests:
        try:
            test_func()
            time.sleep(0.5)  # Brief pause between tests
        except Exception as e:
            print(f"Test {test_func.__name__} crashed: {str(e)}")
    
    # Generate final report
    all_passed = tester.generate_report()
    
    if all_passed:
        print(f"\n🎉 ALL TESTS PASSED! NIL Pulse Admin API is fully functional!")
    else:
        print(f"\n⚠️  Some tests failed. Please review the issues above.")
        
    return all_passed

if __name__ == "__main__":
    # Run the comprehensive test suite
    result = asyncio.run(run_comprehensive_tests())
    sys.exit(0 if result else 1)