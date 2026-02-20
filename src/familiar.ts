import DOMPurify from 'dompurify';
import { openModal as openScheduleModal, TaskCategory } from './planejamento-diario';

// Type definitions
interface Goal {
    id: string;
    text: string;
    completed: boolean;
    time?: string;
}

interface FamiliarReflection {
    qualidadeInteracoes: string;
    momentosConexao: string;
    gestaoConflitos: string;
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
const GOALS_STORAGE_KEY = 'familiarGoals';
let reflection: FamiliarReflection = { qualidadeInteracoes: '', momentosConexao: '', gestaoConflitos: '' };

const defaultGoals: Goal[] = [
    { id: 'familiar-1', text: 'Praticar escuta ativa em uma conversa com um familiar', completed: false },
    { id: 'familiar-2', text: 'Agendar um "tempo de qualidade" sem distrações (ex: noite de jogos, caminhada)', completed: false },
    { id: 'familiar-3', text: 'Expressar apreciação a um membro da família (antídoto para crítica)', completed: false },
    { id: 'familiar-4', text: 'Identificar e praticar uma das 5 "Linguagens do Amor" com um ente querido', completed: false },
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
};

const getReflectionStorageKey = () => `familiarReflection-${new Date().toISOString().split('T')[0]}`;


// --- RENDER FUNCTION ---
const renderGoals = () => {
    if (!elements.goalsList) return;
    elements.goalsList.innerHTML = '';

    if (goals.length === 0) {
        elements.goalsList.innerHTML = '<li class="empty-list-placeholder">Nenhum objetivo definido ainda.</li>';
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
export function setupFamiliarPage() {
    const page = document.getElementById('page-familiar');
    if (!page) return;

    elements.pageContainer = page;
    elements.goalsList = page.querySelector('#familiar-metas-list');
    elements.goalsForm = page.querySelector('#familiar-metas-form');
    elements.goalInput = page.querySelector('#familiar-meta-input');
    elements.goalAIBtn = page.querySelector('#familiar-meta-input-ai-btn');
    elements.reflectionSection = page.querySelector('#familiar-reflection-section');

    const actionHubContainer = page.querySelector('.content-section');
    actionHubContainer?.addEventListener('click', handleActionHubClick);
    elements.goalsForm?.addEventListener('submit', handleAddGoal);
    elements.goalsList?.addEventListener('click', handleGoalAction);

    elements.goalAIBtn?.addEventListener('click', () => {
        const prompt = "Sugira um objetivo para melhorar a saúde familiar, como 'Fazer uma noite de jogos em família por semana' ou 'Ligar para os pais duas vezes por semana'.";
        window.getAISuggestionForInput(prompt, elements.goalInput!, elements.goalAIBtn!);
    });

    // Setup reflection section
    if (elements.reflectionSection) {
        elements.reflectionSection.querySelectorAll<HTMLTextAreaElement>('textarea[data-key]').forEach(input => {
            const key = input.dataset.key as keyof FamiliarReflection;
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
                        'reflection-interacoes': "Escreva uma reflexão sobre ter tido uma conversa positiva e paciente com um familiar hoje.",
                        'reflection-conexao': "Descreva um pequeno momento de conexão, como compartilhar uma risada ou um abraço com alguém da família.",
                        'reflection-conflitos': "Gere um exemplo de reflexão sobre a gestão de um pequeno conflito, focando em ouvir o outro lado antes de responder."
                    };
                    btn.addEventListener('click', () => {
                        window.getAISuggestionForInput(promptMap[targetId], targetInput, btn);
                    });
                }
            }
        });
    }
}

export function showFamiliarPage() {
    const savedGoals = window.loadItems(GOALS_STORAGE_KEY);
    goals = (savedGoals && savedGoals.length > 0) ? savedGoals : defaultGoals;
    renderGoals();

    reflection = window.loadItems(getReflectionStorageKey()) || { qualidadeInteracoes: '', momentosConexao: '', gestaoConflitos: '' };
    elements.reflectionInputs.forEach((input, key) => {
        input.value = reflection[key as keyof FamiliarReflection] || '';
    });
}