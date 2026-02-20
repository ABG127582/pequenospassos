// alimentacao-forte.ts
// This file contains the logic for the "Alimentação Forte" page.

/**
 * Sets up event listeners for the page.
 * Currently, the page is static, so no specific setup is needed.
 */
export function setup(): void {
    const page = document.getElementById('page-alimentacao-forte');
    if (!page) {
        console.warn("Alimentação Forte page container not found.");
        return;
    }
    // No interactive elements requiring special setup.
}

/**
 * This function is called by the router when the page is shown.
 * Ensures the page scrolls to the top.
 */
export function show(): void {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.scrollTop = 0;
    }
}
