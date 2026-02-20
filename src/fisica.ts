
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
    { id: 'fisica-1', text: 'Realizar 30-45 minutos de exercício cardiovascular (Resistência)', completed: false },
    { id: 'fisica-2', text: 'Fazer um treino de força para os principais grupos musculares', completed: false },
    { id: 'fisica-3', text: 'Dedicar 10 minutos ao alongamento e mobilidade', completed: false },
    { id: 'fisica-4', text: 'Gerenciar estresse físico com uma pausa relaxante ou respiração profunda', completed: false },
    { id: 'fisica-5', text: 'Manter a hidratação adequada ao longo do dia', completed: false },
];

let goalManager: GoalManager | null = null;

// --- DOM Elements ---
const elements = {
    pageContainer: null as HTMLElement | null,
    hydrationInput: null as HTMLInputElement | null,
    hydrationBtn: null as HTMLButtonElement | null,
    hydrationResult: null as HTMLSpanElement | null,
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

const calculateHydration = () => {
    if (!elements.hydrationInput || !elements.hydrationResult) return;
    const weight = parseFloat(elements.hydrationInput.value);
    if (isNaN(weight) || weight <= 0) {
        elements.hydrationResult.textContent = '0 ml';
        window.showToast('Por favor, insira um peso válido.', 'warning');
        return;
    }
    const hydrationMl = Math.round(weight * 35);
    elements.hydrationResult.textContent = `${hydrationMl} ml`;
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
    const page = document.getElementById('page-fisica');
    if (!page) return;

    elements.pageContainer = page;
    elements.hydrationInput = page.querySelector('#weight-input');
    elements.hydrationBtn = page.querySelector('#calculate-hydration-btn');
    elements.hydrationResult = page.querySelector('#hydration-result');
    elements.reflectionForm = page.querySelector('.reflection-form');

    elements.hydrationBtn?.addEventListener('click', calculateHydration);
    
    // Initializing Goal Manager
    goalManager = new GoalManager(
        'page-fisica',
        STORAGE_KEYS.FISICA_GOALS,
        'fisica-metas-list',
        'fisica-metas-form',
        'fisica-meta-input',
        defaultGoals,
        'Física'
    );
    goalManager.setup();

    setupReflectionForm();
    
    const actionHubContainer = page.querySelector('.content-section');
    actionHubContainer?.addEventListener('click', handleActionHubClick);
}

export function show() {
    goalManager?.show();
}
