// router.ts
import DOMPurify from 'dompurify';

export const pageModuleImports: { [key: string]: () => Promise<any> } = {
    'inicio': () => import('./inicio'),
    'fisica': () => import('./fisica'),
    'mental': () => import('./mental'),
    'financeira': () => import('./financeira'),
    'familiar': () => import('./familiar'),
    'profissional': () => import('./profissional'),
    'social': () => import('./social'),
    'espiritual': () => import('./espiritual'),
    'preventiva': () => import('./preventiva'),
    'planejamento-diario': () => import('./planejamento-diario'),
    'tarefas': () => import('./tarefas'),
    'reflexoes-diarias': () => import('./reflexoes-diarias'),
    'sono': () => import('./sono'),
    'alongamento': () => import('./alongamento'),
    'alimentacao-forte': () => import('./alimentacao-forte'),
    'food-alho': () => import('./food-alho'),
    'food-brocolis': () => import('./food-brocolis'),
    'food-gengibre': () => import('./food-gengibre'),
    'food-couve': () => import('./food-couve'),
    'food-rucula': () => import('./food-rucula'),
};

const pageHierarchy: { [key: string]: { parent: string | null; title: string } } = {
    'inicio': { parent: null, title: 'Início' },
    'fisica': { parent: 'inicio', title: 'Saúde Física' },
    'mental': { parent: 'inicio', title: 'Saúde Mental' },
    'financeira': { parent: 'inicio', title: 'Saúde Financeira' },
    'familiar': { parent: 'inicio', title: 'Saúde Familiar' },
    'profissional': { parent: 'inicio', title: 'Saúde Profissional' },
    'social': { parent: 'inicio', title: 'Saúde Social' },
    'espiritual': { parent: 'inicio', title: 'Saúde Espiritual' },
    'preventiva': { parent: 'inicio', title: 'Saúde Preventiva' },
    'planejamento-diario': { parent: 'inicio', title: 'Planejamento Diário' },
    'tarefas': { parent: 'inicio', title: 'Lista de Tarefas' },
    'reflexoes-diarias': { parent: 'inicio', title: 'Reflexões Diárias' },
    'sono': { parent: 'mental', title: 'Qualidade do Sono' },
    'alongamento': { parent: 'fisica', title: 'Alongamento' },
    'alimentacao-forte': { parent: 'fisica', title: 'Alimentação Forte' },
};

export function initRouter() {
    const pageContentWrapper = document.getElementById('page-content-wrapper');
    const loadedJSModules: { [key: string]: any } = {};

    const router = async () => {
        const hash = window.location.hash.substring(1) || 'inicio';
        let pageToLoad = pageModuleImports[hash] || pageHierarchy[hash] ? hash : 'inicio';

        if (pageContentWrapper) {
            pageContentWrapper.innerHTML = '<p style="text-align:center; padding: 40px;">Carregando...</p>';
            
            try {
                const response = await fetch(`${pageToLoad}.html`);
                if (!response.ok) throw new Error(`Page not found: ${pageToLoad}.html`);
                const pageHtml = await response.text();
                pageContentWrapper.innerHTML = DOMPurify.sanitize(pageHtml, { ADD_ATTR: ['target'] });

                // Load and setup module
                if (pageModuleImports[pageToLoad]) {
                    let pageModule = loadedJSModules[pageToLoad];
                    if (!pageModule) {
                        pageModule = await pageModuleImports[pageToLoad]();
                        loadedJSModules[pageToLoad] = pageModule;
                    }
                    if (pageModule.setup) pageModule.setup();
                    if (pageModule.show) pageModule.show();
                }
            } catch (error) {
                console.error('Router error:', error);
                pageContentWrapper.innerHTML = '<div class="card"><h2>Erro ao carregar página</h2><p>Por favor, tente novamente.</p></div>';
            }
        }
    };

    window.addEventListener('hashchange', router);
    router();
}
