
import { openModal as openScheduleModal, TaskCategory } from './planejamento-diario';
import { storageService } from './storage';
import { STORAGE_KEYS } from './constants';
import { GoalManager, Goal } from './goalManager';

// Re-declare window interface
declare global {
    interface Window {
        showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
    }
}

const defaultGoals: Goal[] = [
    { id: 'mental-1', text: 'Praticar 5-10 minutos de meditação ou atenção plena (Mindfulness)', completed: false },
    { id: 'mental-2', text: 'Identificar e nomear 3 emoções que senti hoje (Granularidade Emocional)', completed: false },
    { id: 'mental-3', text: 'Aplicar a Dicotomia do Controle a uma preocupação atual', completed: false },
    { id: 'mental-4', text: 'Planejar uma atividade de autocuidado (ex: ler um livro, tomar um banho relaxante)', completed: false },
    { id: 'mental-5', text: 'Organizar as 3 tarefas mais importantes para amanhã para reduzir a carga mental', completed: false },
];

let goalManager: GoalManager | null = null;

const elements = {
    pageContainer: null as HTMLElement | null,
    reflectionForm: null as HTMLFormElement | null,
};

const handleActionHubClick = (e: Event) => {
    const target = e.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>('.add-to-plan-btn, [data-page="planejamento-diario"]');
    if (!button) return;

    if (button.dataset.page === 'planejamento-diario') {
         window.location.hash = 'planejamento-diario';
         return;
    }

    const routineBlock = button.closest<HTMLElement>('.routine-block');
    if (!routineBlock) return;

    const description = routineBlock.dataset.description;
    const category = routineBlock.dataset.category as TaskCategory;

    if (description && category) {
        openScheduleModal(undefined, { description, category });
    }
};

function setupPDCAObserver(page: HTMLElement) {
    const sections = page.querySelectorAll<HTMLElement>('.content-section[id]');
    const navLinks = page.querySelectorAll<HTMLElement>('.pdca-nav-btn');

    if (sections.length === 0 || navLinks.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navLinks.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
                });
            }
        });
    }, { rootMargin: '-40% 0px -60% 0px', threshold: 0 });

    sections.forEach(section => observer.observe(section));
}

function setupReflectionForm() {
    if (!elements.reflectionForm) return;

    elements.reflectionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const textareas = elements.reflectionForm!.querySelectorAll<HTMLTextAreaElement>('.reflection-input');
        const category = elements.reflectionForm!.dataset.category as any;
        let savedCount = 0;

        const allReflections = storageService.get<any[]>(STORAGE_KEYS.UNIFIED_REFLECTIONS) || [];

        textareas.forEach(textarea => {
            const text = textarea.value.trim();
            if (text) {
                const now = new Date();
                const newReflection = {
                    id: `${now.getTime()}-${Math.random()}`,
                    category: category,
                    title: textarea.dataset.title || 'Reflexão',
                    text: text,
                    date: now.toISOString().split('T')[0],
                    timestamp: now.getTime()
                };
                allReflections.push(newReflection);
                textarea.value = ''; // Clear after saving
                savedCount++;
            }
        });
        
        if (savedCount > 0) {
            storageService.set(STORAGE_KEYS.UNIFIED_REFLECTIONS, allReflections);
            window.showToast(`${savedCount} reflex${savedCount > 1 ? 'ões salvas' : 'ão salva'} com sucesso!`, 'success');
        } else {
            window.showToast('Nenhuma reflexão preenchida para salvar.', 'info');
        }
    });
}


// --- LIFECYCLE FUNCTIONS ---
export function setup() {
    const page = document.getElementById('page-mental');
    if (!page) return;
    
    elements.pageContainer = page;
    elements.reflectionForm = page.querySelector('.reflection-form');

    const actionHubContainer = page.querySelector('.content-section');
    actionHubContainer?.addEventListener('click', handleActionHubClick);
    
    // Initializing Goal Manager
    goalManager = new GoalManager(
        'page-mental',
        STORAGE_KEYS.MENTAL_GOALS,
        'mental-metas-list',
        'mental-metas-form',
        'mental-meta-input',
        defaultGoals,
        'Mental'
    );
    goalManager.setup();

    setupReflectionForm();
    setupPDCAObserver(page);
}

export function show() {
    goalManager?.show();
}
