import DOMPurify from 'dompurify';
import { openModal as openScheduleModal, TaskCategory } from './planejamento-diario';

// Type definitions
interface Goal {
    id: string;
    text: string;
    completed: boolean;
    time?: string;
}

interface FisicaReflection {
    energia: string;
    sinais: string;
    alimentacao: string;
}

// Re-declare window interface
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
const GOALS_STORAGE_KEY = 'fisicaGoals';
let reflection: FisicaReflection = { energia: '', sinais: '', alimentacao: '' };

const defaultGoals: Goal[] = [
    { id: 'fisica-1', text: 'Realizar 30-45 minutos de exercício cardiovascular (Resistência)', completed: false },
    { id: 'fisica-2', text: 'Fazer um treino de força para os principais grupos musculares', completed: false },
    { id: 'fisica-3', text: 'Dedicar 10 minutos ao alongamento e mobilidade', completed: false },
    { id: 'fisica-4', text: 'Gerenciar estresse físico com uma pausa relaxante ou respiração profunda', completed: false },
    { id: 'fisica-5', text: 'Manter a hidratação adequada ao longo do dia', completed: false },
];

// --- DOM Elements ---
const elements = {
    pageContainer: null as HTMLElement | null,
    // Hydration
    hydrationInput: null as HTMLInputElement | null,
    hydrationBtn: null as HTMLButtonElement | null,
    hydrationResult: null as HTMLSpanElement | null,
    // Goals
    goalsList: null as HTMLUListElement | null,
    goalsForm: null as HTMLFormElement | null,
    goalInput: null as HTMLInputElement | null,
    goalAIBtn: null as HTMLButtonElement | null,
    actionHub: null as HTMLElement | null,
    // Reflection
    reflectionSection: null as HTMLElement | null,
    reflectionInputs: new Map<string, HTMLTextAreaElement>(),
};

const getReflectionStorageKey = () => `fisicaReflection-${new Date().toISOString().split('T')[0]}`;

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
const handleHydrationCalc = () => {
    const weight = parseFloat(elements.hydrationInput!.value);
    if (weight && weight > 0) {
        const hydration = (weight * 35 / 1000).toFixed(2);
        elements.hydrationResult!.textContent = `${hydration} litros/dia`;
    } else {
        elements.hydrationResult!.textContent = '';
    }
};

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
export function setupFisicaPage() {
    const page = document.getElementById('page-fisica');
    if (!page) return;

    elements.pageContainer = page;
    // Query elements
    elements.hydrationInput = page.querySelector('#peso-corporal-hidratacao-mapa');
    elements.hydrationBtn = page.querySelector('#btn-calcular-hidratacao-mapa');
    elements.hydrationResult = page.querySelector('#resultado-hidratacao-mapa');
    elements.reflectionSection = page.querySelector('#fisica-reflection-section');
    elements.goalsList = page.querySelector('#fisica-metas-list');
    elements.goalsForm = page.querySelector('#fisica-metas-form');
    elements.goalInput = page.querySelector('#fisica-meta-input');
    elements.goalAIBtn = page.querySelector('#fisica-meta-input-ai-btn');
    elements.actionHub = page.querySelector('.action-hub-grid');
    
    // Attach listeners
    elements.hydrationBtn?.addEventListener('click', handleHydrationCalc);
    elements.goalsForm?.addEventListener('submit', handleAddGoal);
    elements.goalsList?.addEventListener('click', handleGoalAction);
    elements.actionHub?.addEventListener('click', handleActionHubClick);

    elements.goalAIBtn?.addEventListener('click', () => {
        const prompt = "Sugira um objetivo de saúde física SMART (Específico, Mensurável, Atingível, Relevante, Temporal). Por exemplo, 'Caminhar 30 minutos, 3 vezes por semana, durante o próximo mês'.";
        window.getAISuggestionForInput(prompt, elements.goalInput!, elements.goalAIBtn!);
    });
    
     // Setup reflection section
    if (elements.reflectionSection) {
        elements.reflectionSection.querySelectorAll<HTMLTextAreaElement>('textarea[data-key]').forEach(input => {
            const key = input.dataset.key as keyof FisicaReflection;
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
                        'reflection-energia': "Escreva uma breve reflexão sobre ter um bom nível de energia hoje, atribuindo-o a uma boa noite de sono.",
                        'reflection-sinais': "Descreva a sensação de bem-estar e ausência de dores após uma sessão de alongamento.",
                        'reflection-alimentacao': "Gere um exemplo de reflexão sobre a alimentação do dia, mencionando que foi equilibrada e deu energia para as atividades."
                    };
                    btn.addEventListener('click', () => {
                        window.getAISuggestionForInput(promptMap[targetId], targetInput, btn);
                    });
                }
            }
        });
    }
}

export function showFisicaPage() {
    if (!elements.pageContainer) return;
    
    const savedGoals = window.loadItems(GOALS_STORAGE_KEY);
    goals = (savedGoals && savedGoals.length > 0) ? savedGoals : defaultGoals;
    reflection = window.loadItems(getReflectionStorageKey()) || { energia: '', sinais: '', alimentacao: '' };

    renderGoals();
    elements.reflectionInputs.forEach((input, key) => {
        input.value = reflection[key as keyof FisicaReflection] || '';
    });
}