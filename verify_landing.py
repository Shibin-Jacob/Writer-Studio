from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        print("Navigating to http://localhost:8000/")
        page.goto('http://localhost:8000/')
        page.wait_for_load_state('networkidle')
        
        # Check landing page elements
        assert page.is_visible("text=Write, Organize, and Export.")
        assert page.is_visible("text=Distraction-Free Editor")
        print("Landing page rendered successfully.")
        
        # Click login and check if authWrapper shows
        page.click("button:has-text('Login')")
        page.wait_for_timeout(500)
        assert page.is_visible("#authWrapper")
        assert page.is_visible("text=Welcome Back")
        print("Auth Wrapper (Login) shown successfully.")
        
        # Click close
        page.click("button:has-text('← Back')")
        page.wait_for_timeout(500)
        
        # Click Get Started
        page.click("button:has-text('Get Started')")
        page.wait_for_timeout(500)
        assert page.is_visible("#authWrapper")
        assert page.is_visible("text=Join Writer Studio")
        print("Auth Wrapper (Register) shown successfully.")
        
        print("All verification passed!")
        browser.close()

if __name__ == "__main__":
    verify()
