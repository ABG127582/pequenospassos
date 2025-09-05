import './styles/main.css';
import { GoogleGenAI } from "@google/genai";
import { showPage, setupPopstateListener } from './core/router';
import { loadTheme, toggleSidebar, updateThemeToggleButtonIcon, updateRainSoundButtonPosition } from './features/ui';
import { toggleRainSound } from './features/rain-sound';
import { openContractModal, closeContractModal, saveContractData, printContract } from './features/contract';
import { addAIButtonListener } from './features/ai-helpers';
import { showToast } from './features/ui';

// Global Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // Check for API Key
    if (!process.env.API_KEY) {
        console.warn("API key for Gemini not found. AI features will be disabled.");
    } else {
        try {
            window.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        } catch (error) {
            console.error("Failed to initialize GoogleGenAI:", error);
            showToast("Falha ao inicializar a API do Gemini. Verifique a chave.", "error");
        }
    }

    // Load initial theme
    loadTheme();

    // Setup sidebar toggle
    const toggleButton = document.getElementById('sidebar-toggle');
    if (toggleButton) {
        toggleButton.addEventListener('click', () => toggleSidebar());
    }
    toggleSidebar(true); // Initialize sidebar state

    // Setup theme toggle
    const themeToggleButton = document.getElementById('theme-toggle');
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            const isDark = document.documentElement.classList.toggle('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            updateThemeToggleButtonIcon(isDark);
        });
    }

    // Event delegation for dynamically loaded content
    document.body.addEventListener('click', async (e: MouseEvent) => {
        const target = e.target as HTMLElement;

        // Handle sidebar link clicks
        const sidebarLink = target.closest('.sidebar-link');
        if (sidebarLink) {
            e.preventDefault();
            const pageId = sidebarLink.getAttribute('data-page');
            if (pageId) {
                if (pageId === 'avaliacao-card') {
                    openContractModal();
                } else {
                    await showPage(pageId);
                }

                if (window.innerWidth < 768 && !document.getElementById('sidebar-menu')?.classList.contains('collapsed')) {
                    toggleSidebar();
                }
            }
            return; // Stop further processing
        }

        // Handle back buttons
        const backButton = target.closest('.back-button');
        if (backButton) {
            e.preventDefault();
            const targetPage = backButton.getAttribute('data-target-page') || 'inicio';
            await showPage(targetPage);

            const subTargetScroll = backButton.getAttribute('data-sub-target-scroll');
            if (subTargetScroll) {
                setTimeout(() => {
                    const elementToScrollTo = document.getElementById(subTargetScroll);
                    if (elementToScrollTo) {
                        elementToScrollTo.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        elementToScrollTo.classList.add('highlight-on-scroll');
                        setTimeout(() => elementToScrollTo.classList.remove('highlight-on-scroll'), 2000);
                    }
                }, 100);
            }
            return;
        }

        // Handle in-page anchor links with smooth scroll and highlight
        const anchorLink = target.closest('a[href^="#"]');
        if (anchorLink) {
            const href = anchorLink.getAttribute('href');
            if (href && href.length > 1) { // Ensure it's not just "#"
                const elementToScrollTo = document.getElementById(href.substring(1));
                // Ensure it's not a link that also navigates pages (like some themes do)
                if (elementToScrollTo && !anchorLink.hasAttribute('data-page')) {
                    e.preventDefault(); // Prevent the default instant jump
                    elementToScrollTo.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    // Add highlight effect
                    elementToScrollTo.classList.add('highlight-on-scroll');
                    setTimeout(() => {
                        elementToScrollTo.classList.remove('highlight-on-scroll');
                    }, 2000); // Highlight for 2 seconds
                    return; // Stop further processing for this click
                }
            }
        }


        // Handle page navigation from buttons within content
        const pageButton = target.closest('[data-page]');
         if (pageButton && !sidebarLink) { // Ensure it's not a sidebar link we already handled
             const pageId = pageButton.getAttribute('data-page');
             if(pageId) {
                e.preventDefault();
                await showPage(pageId);
             }
         }
    });


    // Handle initial page load from URL hash
    const initialPageId = window.location.hash.substring(1) || 'inicio';
    await showPage(initialPageId, true);
    setupPopstateListener();

    // Rain sound
    const rainButton = document.getElementById('rain-sound-toggle');
    if (rainButton) {
        rainButton.addEventListener('click', toggleRainSound);
        if (localStorage.getItem('rainSoundPlaying') === 'true') {
            toggleRainSound();
        }
    }
    if (updateRainSoundButtonPosition) updateRainSoundButtonPosition();
    window.addEventListener('resize', updateRainSoundButtonPosition);

    // Add listeners for Contract Modal
    const contractModal = document.getElementById('contract-modal');
    if (contractModal) {
        document.getElementById('contract-modal-close-btn')?.addEventListener('click', closeContractModal);
        document.getElementById('contract-modal-cancel-btn')?.addEventListener('click', closeContractModal);
        document.getElementById('contract-modal-save-btn')?.addEventListener('click', saveContractData);
        document.getElementById('contract-modal-print-btn')?.addEventListener('click', printContract);
        addAIButtonListener('contract-commitment-ai-btn', 'contract-commitment', "Sugira um parágrafo curto e inspirador para um contrato de compromisso pessoal focado em auto-aperfeiçoamento e bem-estar holístico.");
        addAIButtonListener('contract-goals-ai-btn', 'contract-goals', "Com base nas 8 áreas da vida (Física, Mental, Financeira, Familiar, Profissional, Social, Espiritual, Preventiva), sugira uma lista de 3 a 5 metas SMART (Específicas, Mensuráveis, Atingíveis, Relevantes, Temporais) para um contrato de compromisso pessoal.");
    }
});
