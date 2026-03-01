// index.tsx
import { initRouter } from './router';

document.addEventListener('DOMContentLoaded', () => {
    // Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const sidebarToggle = document.getElementById('sidebar-toggle');

    sidebarToggle?.addEventListener('click', () => {
        sidebar?.classList.toggle('collapsed');
        mainContent?.classList.toggle('expanded');
    });

    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const currentTheme = localStorage.getItem('theme') || 'light';
    body.setAttribute('data-theme', currentTheme);
    themeToggle?.querySelector('i')?.classList.replace(currentTheme === 'dark' ? 'fa-moon' : 'fa-sun', currentTheme === 'dark' ? 'fa-sun' : 'fa-moon');

    themeToggle?.addEventListener('click', () => {
        const theme = body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        themeToggle.querySelector('i')?.classList.replace(theme === 'dark' ? 'fa-moon' : 'fa-sun', theme === 'dark' ? 'fa-sun' : 'fa-moon');
    });

    // Rain Sound Toggle
    const rainSoundToggle = document.getElementById('rain-sound-toggle');
    const rainAudio = new Audio('https://www.soundjay.com/nature/rain-07.mp3');
    rainAudio.loop = true;
    let isPlaying = false;

    rainSoundToggle?.addEventListener('click', () => {
        if (isPlaying) {
            rainAudio.pause();
            rainSoundToggle.classList.remove('active');
        } else {
            rainAudio.play();
            rainSoundToggle.classList.add('active');
        }
        isPlaying = !isPlaying;
    });

    // Initialize Router
    initRouter();
});
