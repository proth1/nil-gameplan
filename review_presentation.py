from playwright.sync_api import sync_playwright
import time

def review_presentation():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        # Navigate to the site
        print("Navigating to https://proth1.github.io/nil-gameplan/")
        page.goto("https://proth1.github.io/nil-gameplan/", wait_until="networkidle")
        
        # Wait for page to load
        time.sleep(2)
        
        # Login
        print("Logging in...")
        page.fill("#username", "MyNILGamePlan")
        page.fill("#password", "NIL2025!")
        page.click("button[type='submit']")
        
        # Wait for presentation to load
        time.sleep(2)
        
        # Take screenshots of the first few slides
        slides_to_capture = 5
        for i in range(slides_to_capture):
            print(f"Capturing slide {i + 1}...")
            page.screenshot(path=f"slide_{i + 1}.png")
            
            # Click next button if not on last slide
            if i < slides_to_capture - 1:
                page.click("#nextBtn")
                time.sleep(1)
        
        print("\nReview complete. Check the screenshot files.")
        
        # Keep browser open for manual review
        input("Press Enter to close browser...")
        browser.close()

if __name__ == "__main__":
    review_presentation()