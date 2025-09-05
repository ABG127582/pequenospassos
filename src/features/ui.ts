declare var DOMPurify: any;

export function showToast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    const container = document.getElementById('toast-notification-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');

    let iconClass = 'fas fa-info-circle';
    if (type === 'success') iconClass = 'fas fa-check-circle';
    if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';
    if (type === 'error') iconClass = 'fas fa-times-circle';

    toast.innerHTML = `<i class="${iconClass}"></i> ${DOMPurify.sanitize(message)}`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 500);
    }, 4000);
}

export function toggleSidebar(initialize = false) {
    const sidebar = document.getElementById('sidebar-menu');
    const mainContent = document.getElementById('main-content');
    const toggleButton = document.getElementById('sidebar-toggle');

    if (!sidebar || !mainContent || !toggleButton) return;

    const isCollapsed = sidebar.classList.contains('collapsed');

    if (initialize) {
        const storedState = localStorage.getItem('sidebarCollapsed');
        if (storedState === 'true') {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('sidebar-collapsed');
            document.body.classList.add('sidebar-collapsed');
            toggleButton.setAttribute('aria-expanded', 'false');
            toggleButton.innerHTML = '<i class="fas fa-bars"></i>';
        } else if (storedState === 'false') {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('sidebar-collapsed');
            document.body.classList.remove('sidebar-collapsed');
            toggleButton.setAttribute('aria-expanded', 'true');
            toggleButton.innerHTML = '<i class="fas fa-times"></i>';
        } else {
            if (window.innerWidth < 768) {
                sidebar.classList.remove('collapsed');
                mainContent.classList.remove('sidebar-collapsed');
                document.body.classList.remove('sidebar-collapsed');
                toggleButton.setAttribute('aria-expanded', 'true');
                toggleButton.innerHTML = '<i class="fas fa-times"></i>';
                localStorage.setItem('sidebarCollapsed', 'false');
            } else {
                 sidebar.classList.add('collapsed');
                 mainContent.classList.add('sidebar-collapsed');
                 document.body.classList.add('sidebar-collapsed');
                 toggleButton.setAttribute('aria-expanded', 'false');
                 toggleButton.innerHTML = '<i class="fas fa-bars"></i>';
                 localStorage.setItem('sidebarCollapsed', 'true');
            }
        }
    } else {
        // Regular toggle action
        if (isCollapsed) {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('sidebar-collapsed');
            document.body.classList.remove('sidebar-collapsed');
            toggleButton.setAttribute('aria-expanded', 'true');
            toggleButton.innerHTML = '<i class="fas fa-times"></i>';
            localStorage.setItem('sidebarCollapsed', 'false');
        } else {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('sidebar-collapsed');
            document.body.classList.add('sidebar-collapsed');
            toggleButton.setAttribute('aria-expanded', 'false');
            toggleButton.innerHTML = '<i class="fas fa-bars"></i>';
            localStorage.setItem('sidebarCollapsed', 'true');
        }
    }
    if(window.updateRainSoundButtonPosition) window.updateRainSoundButtonPosition();
}

export function updateRainSoundButtonPosition() {
    const button = document.getElementById('rain-sound-toggle');
    const sidebar = document.getElementById('sidebar-menu');
    if (button && sidebar) {
        if (sidebar.classList.contains('collapsed')) {
            button.style.left = '80px';
        } else {
            button.style.left = '260px';
        }
    }
}

export function updateThemeToggleButtonIcon(isDark: boolean) {
    const icon = document.getElementById('theme-toggle-icon');
    if (icon) {
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
}

export function loadTheme() {
    const theme = localStorage.getItem('theme');
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark-mode', isDark);
    updateThemeToggleButtonIcon(isDark);
}
