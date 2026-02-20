
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

let goalManager: GoalManager | null = null;

const defaultGoals: Goal[] = [
    { id: 'social-1', text: 'Enviar uma mensagem para um amigo da "tribo íntima"', completed: false },
    { id: 'social-2', text: 'Ligar para um amigo ou familiar com quem não falo há tempos', completed: false },
    { id: 'social-3', text: 'Pesquisar um grupo ou evento local de um hobby de interesse', completed: false },
    { id: 'social-4', text: 'Praticar uma micro-interação positiva com um estranho (ex: um elogio, um "bom dia" atencioso)', completed: false },
];

const elements = {
    pageContainer: null as HTMLElement | null,
    reflectionForm: null as HTMLFormElement | null,
};

const handleActionHubClick = (e: Event) => {
    const target = e.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>('.add-to-plan-btn');
    if (!button) return;

    const routineBlock = button.closest<HTMLElement>('.routine-block');
    if (!routineBlock) return;

    const description = routineBlock.dataset.description;
    const category = routineBlock.dataset.category as TaskCategory;

    if (description && category) {
        openScheduleModal(undefined, { description, category });
    }
};

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
    const page = document.getElementById('page-social');
    if (!page) return;
    
    elements.pageContainer = page;
    elements.reflectionForm = page.querySelector('.reflection-form');
    
    const actionHubContainer = page.querySelector('.content-section');
    actionHubContainer?.addEventListener('click', handleActionHubClick);
    
    // Initializing Goal Manager
    goalManager = new GoalManager(
        'page-social',
        STORAGE_KEYS.SOCIAL_GOALS,
        'social-metas-list',
        'social-metas-form',
        'social-meta-input',
        defaultGoals,
        'Social'
    );
    goalManager.setup();

    setupReflectionForm();
}

export function show() {
    goalManager?.show();
}
