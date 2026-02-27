// food-rucula.ts

export function setup(): void {
    // Page is static, no specific setup needed.
}

export function show(): void {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.scrollTop = 0;
    }
}
