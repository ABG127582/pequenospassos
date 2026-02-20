import DOMPurify from 'dompurify';
import { openModal as openScheduleModal, TaskCategory } from './planejamento-diario';

// Type definitions
interface Goal {
    id: string;
    text: string;
    completed: boolean;
    time?: string;
}

interface EspiritualReflection {
    conexaoProposito: string;
    praticasContemplativas: string;
    momentosGratidao: string;
}

// Re-declare window interface for global functions from index.tsx
declare global {
    interface Window {
        showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
        saveItems: (storageKey: string, items: any) => void;
        loadItems: (storageKey: string) => any;
        getAISuggestionForInput: (prompt: string, targetInput: HTMLInputElement | HTMLTextAreaElement, button: HTMLButtonElement) => Promise<void>;
    }
}

// --- Module-scoped state ---
let goals: Goal[] = [];
const GOALS_STORAGE_KEY = 'espiritualGoals';
let reflection: EspiritualReflection = { conexaoProposito: '', praticasContemplativas: '', momentosGratidao: '' };

const defaultGoals: Goal[] = [
    { id: 'espiritual-1', text: 'Praticar 10 minutos de meditação Mindfulness', completed: false },
    { id: 'espiritual-2', text: 'Escrever 3 coisas pelas quais sou grato(a) hoje', completed: false },
    { id: 'espiritual-3', text: 'Definir uma intenção clara para o dia (ex: ser mais paciente)', completed: false },
    { id: 'espiritual-4', text: 'Passar um tempo na natureza observando os detalhes ao redor (prática de "Awe")', completed: false },
];

// --- DOM Elements ---
const elements = {
    pageContainer: null as HTMLElement | null,
    goalsList: null as HTMLUListElement | null,
    goalsForm: null as HTMLFormElement | null,
    goalInput: null as HTMLInputElement | null,
    goalAIBtn: null as HTMLButtonElement | null,
    actionHub: null as HTMLElement | null,
    // Reflection elements
    reflectionSection: null as HTMLElement | null,
    reflectionInputs: new Map<string, HTMLTextAreaElement>(),
    reflectionAIBtns: new Map<string, HTMLButtonElement>(),
};

const getReflectionStorageKey = () => `espiritualReflection-${new Date().toISOString().split('T')[0]}`;

// --- RENDER FUNCTION ---
const renderGoals = () => {
    if (!elements.goalsList) return;
    elements.goalsList.innerHTML = '';

    if (goals.length === 0) {
        elements.goalsList.innerHTML = '<li class="empty-list-placeholder">Nenhuma tarefa ou objetivo definido.</li>';
        return;
    }

    goals.forEach(goal => {
        const li = document.createElement('li');
        li.className = goal.completed ? 'completed' : '';
        li.dataset.id = goal.id;
        li.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${goal.completed ? 'checked' : ''} id="task-${goal.id}" aria-labelledby="task-label-${goal.id}">
            <label for="task-${goal.id}" class="item-text" id="task-label-${goal.id}">${DOMPurify.sanitize(goal.text)}</label>
            ${goal.time ? `<span class="item-time"><i class="fas fa-clock"></i> ${goal.time}</span>` : ''}
            <div class="item-actions">
                <button class="action-btn delete-btn delete" aria-label="Apagar objetivo"><i class="fas fa-trash"></i></button>
            </div>
        `;
        elements.goalsList!.appendChild(li);
    });
};

// --- EVENT HANDLERS ---
const handleGoalAction = (e: Event) => {
    const target = e.target as HTMLElement;
    const li = target.closest('li');
    if (!li || !li.dataset.id) return;

    const goalId = li.dataset.id;
    const goalIndex = goals.findIndex(g => g.id === goalId);
    if (goalIndex === -1) return;

    if (target.matches('.task-checkbox') || target.closest('.item-text')) {
        goals[goalIndex].completed = !goals[goalIndex].completed;
        window.saveItems(GOALS_STORAGE_KEY, goals);
        renderGoals();
    } else if (target.closest('.delete-btn')) {
        goals.splice(goalIndex, 1);
        window.saveItems(GOALS_STORAGE_KEY, goals);
        renderGoals();
    }
};

const handleAddGoal = (e: Event) => {
    e.preventDefault();
    const text = elements.goalInput!.value.trim();
    if (text) {
        goals.unshift({ id: Date.now().toString(), text, completed: false });
        elements.goalInput!.value = '';
        window.saveItems(GOALS_STORAGE_KEY, goals);
        renderGoals();
    }
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

// --- LIFECYCLE FUNCTIONS ---
export function setupEspiritualPage() {
    const page = document.getElementById('page-espiritual');
    if (!page) return;

    elements.pageContainer = page;
    elements.goalsList = page.querySelector('#espiritual-metas-list');
    elements.goalsForm = page.querySelector('#espiritual-metas-form');
    elements.goalInput = page.querySelector('#espiritual-meta-input');
    elements.goalAIBtn = page.querySelector('#espiritual-meta-input-ai-btn');
    elements.reflectionSection = page.querySelector('#espiritual-reflection-section');
    
    elements.goalsForm?.addEventListener('submit', handleAddGoal);
    elements.goalsList?.addEventListener('click', handleGoalAction);
    
    // Action Hub is within the `do-action-hub` ID, but we grab the parent for event delegation
    const actionHubContainer = page.querySelector('.content-section');
    actionHubContainer?.addEventListener('click', handleActionHubClick);

    elements.goalAIBtn?.addEventListener('click', () => {
        const prompt = "Sugira um objetivo de saúde espiritual, como 'Meditar 10 minutos por dia' ou 'Escrever três coisas pelas quais sou grato todas as noites'.";
        window.getAISuggestionForInput(prompt, elements.goalInput!, elements.goalAIBtn!);
    });

    // Setup reflection section
    if (elements.reflectionSection) {
        elements.reflectionSection.querySelectorAll<HTMLTextAreaElement>('textarea[data-key]').forEach(input => {
            const key = input.dataset.key as keyof EspiritualReflection;
            elements.reflectionInputs.set(key, input);
            input.addEventListener('input', () => {
                reflection[key] = input.value;
                window.saveItems(getReflectionStorageKey(), reflection);
            });
        });

        elements.reflectionSection.querySelectorAll<HTMLButtonElement>('button.ai-suggestion-btn').forEach(btn => {
            const targetId = btn.dataset.target;
            if (targetId) {
                const targetInput = document.getElementById(targetId) as HTMLTextAreaElement;
                if (targetInput) {
                    const promptMap: { [key: string]: string } = {
                        'reflection-proposito': "Escreva uma breve reflexão sobre um momento em que me senti alinhado com meus valores ou propósito, como ajudar um colega.",
                        'reflection-praticas': "Descreva a sensação após uma breve meditação, focando na calma e clareza mental que ela trouxe.",
                        'reflection-gratidao': "Gere um exemplo de reflexão de gratidão, mencionando algo simples como o sabor do café da manhã ou a beleza de um dia ensolarado."
                    };
                    btn.addEventListener('click', () => {
                        window.getAISuggestionForInput(promptMap[targetId], targetInput, btn);
                    });
                }
            }
        });
    }
}

export function showEspiritualPage() {
    const savedGoals = window.loadItems(GOALS_STORAGE_KEY);
    goals = (savedGoals && savedGoals.length > 0) ? savedGoals : defaultGoals;
    renderGoals();

    reflection = window.loadItems(getReflectionStorageKey()) || { conexaoProposito: '', praticasContemplativas: '', momentosGratidao: '' };
    elements.reflectionInputs.forEach((input, key) => {
        input.value = reflection[key as keyof EspiritualReflection] || '';
    });
}