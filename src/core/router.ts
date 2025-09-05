import {
    initFisicaPage,
    initMentalPage,
    initFinanceiraPage,
    initFamiliarPage,
    initProfissionalPage,
    initSocialPage,
    initEspiritualPage,
    initPreventivaPage,
    initPlanejamentoDiarioPage,
    initTarefasPage,
    initInicioPage
} from '../pages';

import { toggleSidebar } from '../features/ui';

const pageInitializers: { [key: string]: Function | null } = {
    'fisica': initFisicaPage,
    'mental': initMentalPage,
    'espiritual': initEspiritualPage,
    'preventiva': initPreventivaPage,
    'financeira': initFinanceiraPage,
    'familiar': initFamiliarPage,
    'profissional': initProfissionalPage,
    'social': initSocialPage,
    'planejamento-diario': initPlanejamentoDiarioPage,
    'tarefas': initTarefasPage,
    'inicio': initInicioPage,
    // Food pages - no specific init for now
    'food-gengibre': null,
    'food-alho': null,
    'food-brocolis': null,
    'food-couveflor': null,
    'food-shitake': null,
    'food-lentilha': null,
    'food-azeite': null,
    'food-morango': null,
    'food-laranja': null,
    'food-maca': null,
    'food-cenoura': null,
    'food-pimenta': null,
    'food-ovo': null,
    'food-vinagremaca': null,
    'food-whey': null,
    'food-creatina': null,
    'food-curcuma': null,
    'food-chaverde': null,
    'food-canela': null,
    'food-linhaca': null,
    'alongamento': null, // New page for stretching, yoga, and pilates
    'leitura-guia-fisica': null,
    'leitura-guia-espiritual': null,
    'leitura-guia-familiar': null,
    'leitura-guia-mental': null,
    'leitura-guia-financeira': null,
};
let currentPageInitFunction: Function | null = null;
const pageCache = new Map<string, string>();

export async function showPage(pageId: string, isInitialLoad = false) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    try {
        let pageHtml = pageCache.get(pageId);
        if (!pageHtml) {
            const response = await fetch(`./${pageId}.html`);
            if (!response.ok) {
                console.error(`Page not found: ${pageId}.html. Redirecting to 'inicio'.`);
                if (pageId !== 'inicio') {
                    await showPage('inicio');
                } else {
                    mainContent.innerHTML = `<div class="container" style="padding: 20px; text-align: center;"><h1>Error</h1><p>Home page could not be loaded.</p></div>`;
                }
                return;
            }
            pageHtml = await response.text();
            pageCache.set(pageId, pageHtml);
        }
        mainContent.innerHTML = pageHtml;

    } catch(e) {
        console.error(`Failed to load page ${pageId}`, e);
        mainContent.innerHTML = `<div class="container" style="padding: 20px; text-align: center;"><h1>Error</h1><p>Error loading page content for ${pageId}.</p></div>`;
        return;
    }

    const targetSection = mainContent.querySelector('.page-section');
    if (targetSection) {
        targetSection.classList.add('active');
        document.body.scrollTop = document.documentElement.scrollTop = 0; // Scroll to top

        // Update active link in sidebar
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active', 'fisica', 'mental', 'financeira', 'familiar', 'profissional', 'social', 'espiritual', 'preventiva', 'inicio', 'planejamento-diario', 'tarefas-card');
            link.removeAttribute('aria-current');
            if (link.getAttribute('data-page') === pageId) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
                if (['fisica', 'mental', 'financeira', 'familiar', 'profissional', 'social', 'espiritual', 'preventiva', 'inicio', 'planejamento-diario'].includes(pageId)) {
                    link.classList.add(pageId);
                } else if (pageId === 'tarefas') {
                    link.classList.add('tarefas-card');
                }
            }
        });

        const pageTitle = targetSection.querySelector('h1')?.textContent || `Página ${pageId}`;
        document.title = `${pageTitle} | Pequenos Passos`;

        const newHash = `#${pageId}`;
        let currentFullUrl = window.location.href;
        const hashIndex = currentFullUrl.indexOf('#');
        if (hashIndex !== -1) {
            currentFullUrl = currentFullUrl.substring(0, hashIndex);
        }
        const newUrlForHistory = currentFullUrl + newHash;


        if (!isInitialLoad && window.location.hash !== newHash) {
            history.pushState({ page: pageId }, pageTitle, newUrlForHistory);
        } else if (isInitialLoad) {
             if (window.location.href !== newUrlForHistory) {
                 history.replaceState({ page: pageId }, pageTitle, newUrlForHistory);
            }
        }

        const initFn = pageInitializers[pageId];
        if (initFn) {
            if (currentPageInitFunction !== initFn || pageId === 'planejamento-diario' || isInitialLoad) {
                initFn();
                currentPageInitFunction = initFn;
            }
        } else {
             if (pageInitializers.hasOwnProperty(pageId)) {
                // Do not warn for pages that are explicitly set to null
            } else {
                console.warn(`Page initializer not found or not a function for ${pageId}.`);
            }
            currentPageInitFunction = null;
        }

    } else {
        console.warn(`Page section not found in loaded HTML for: ${pageId}`);
        if (pageId !== 'inicio') {
            await showPage('inicio');
        }
    }
}

export function setupPopstateListener() {
    window.addEventListener('popstate', async (event) => {
        if (event.state && event.state.page) {
            await showPage(event.state.page, true);
        } else {
            const pageIdFromHash = window.location.hash.substring(1);
            if (pageIdFromHash) {
                await showPage(pageIdFromHash, true);
            } else {
                await showPage('inicio', true);
            }
        }
    });
}
