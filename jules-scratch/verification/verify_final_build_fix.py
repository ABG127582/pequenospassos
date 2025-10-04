import sys
import time
from playwright.sync_api import sync_playwright, expect

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            # 1. Go to the homepage served by the production server
            page.goto("http://localhost:8000/", wait_until="networkidle")

            # 2. Assert that the homepage loaded correctly
            expect(page.locator('h1')).to_have_text("Pequenos Passos", timeout=10000)
            print("Homepage loaded successfully.")

            # 3. Find and click the "Saúde Física" button
            fisica_button = page.locator('button[data-page="fisica"]')
            expect(fisica_button).to_be_visible(timeout=10000)
            fisica_button.click()

            # 4. Wait for navigation and assert the new page is correct
            expect(page).to_have_url("http://localhost:8000/#fisica", timeout=5000)

            page_header = page.locator("#page-fisica h1")
            expect(page_header).to_have_text("Planejamento de Saúde Física", timeout=5000)

            print("Verification successful: Navigation to 'Saúde Física' page confirmed.")

            # 5. Take a screenshot for visual confirmation
            screenshot_path = "jules-scratch/verification/verification.png"
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"Screenshot saved to {screenshot_path}")

        except Exception as e:
            print(f"Verification failed: {e}", file=sys.stderr)
            page.screenshot(path="jules-scratch/verification/error.png", full_page=True)
            print("Error screenshot saved to jules-scratch/verification/error.png", file=sys.stderr)
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    main()