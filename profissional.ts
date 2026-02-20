import DOMPurify from 'dompurify';
import { openModal as openScheduleModal, TaskCategory } from './planejamento-diario';


// Type definitions
interface Goal {
    id: string;
    text: string;
    completed: boolean;
    time?: string;
}

interface ProfissionalReflection {
    satisfacao: string;
    progresso: string;
    equilibrio: string;
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
const GOALS_STORAGE_KEY = 'profissionalGoals';
let reflection: ProfissionalReflection = { satisfacao: '', progresso: '', equilibrio: '' };

const defaultGoals: Goal[] = [
    { id: 'profissional-1', text: 'Dedicar 30 minutos à prática deliberada de uma habilidade chave', completed: false },
    { id: 'profissional-2', text: 'Realizar uma "auditoria de energia" ao final do dia de trabalho', completed: false },
    { id: 'profissional-3', text: 'Definir e respeitar um ritual de início e fim do expediente', completed: false },
    { id: 'profissional-4', text: 'Revisar o alinhamento de uma tarefa atual com meus valores e "Ikigai"', completed: false },
];

// --- DOM Elements ---
const elements = {
    pageContainer: null as HTMLElement | null,
    goalsList: null as HTMLUListElement | null,
    goalsForm: null as HTMLFormElement | null,
    goalInput: null as HTMLInputElement | null,
    goalAIBtn: null as HTMLButtonElement | null,
    actionHub: null as HTMLElement | null,
    // Reflection
    reflectionSection: null as HTMLElement | null,
    reflectionInputs: new Map<string, HTMLTextAreaElement>(),
};

const getReflectionStorageKey = () => `profissionalReflection-${new Date().toISOString().split('T')[0]}`;


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
export function setupProfissionalPage() {
    const page = document.getElementById('page-profissional');
    if (!page) return;
    
    elements.pageContainer = page;
    elements.goalsList = page.querySelector('#profissional-metas-list');
    elements.goalsForm = page.querySelector('#profissional-metas-form');
    elements.goalInput = page.querySelector('#profissional-meta-input');
    elements.goalAIBtn = page.querySelector('#profissional-meta-input-ai-btn');
    elements.reflectionSection = page.querySelector('#profissional-reflection-section');

    const actionHubContainer = page.querySelector('.content-section');
    actionHubContainer?.addEventListener('click', handleActionHubClick);
    elements.goalsForm?.addEventListener('submit', handleAddGoal);
    elements.goalsList?.addEventListener('click', handleGoalAction);

    elements.goalAIBtn?.addEventListener('click', () => {
        const prompt = "Sugira um objetivo de saúde profissional, como 'Atualizar meu currículo e perfil no LinkedIn este mês' ou 'Dedicar 1 hora por semana para aprender uma nova habilidade relevante para minha carreira'.";
        window.getAISuggestionForInput(prompt, elements.goalInput!, elements.goalAIBtn!);
    });

    // Setup reflection section
    if (elements.reflectionSection) {
        elements.reflectionSection.querySelectorAll<HTMLTextAreaElement>('textarea[data-key]').forEach(input => {
            const key = input.dataset.key as keyof ProfissionalReflection;
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
                        'reflection-satisfacao': "Escreva uma reflexão sobre se sentir engajado no trabalho hoje devido a um projeto desafiador e motivador.",
                        'reflection-progresso': "Descreva o progresso feito em uma meta importante hoje, como 'finalizei a primeira versão do relatório'.",
                        'reflection-equilibrio': "Gere um exemplo de reflexão sobre como conseguiu criar um bom limite entre trabalho e vida pessoal, desligando o computador no horário e focando na família."
                    };
                    btn.addEventListener('click', () => {
                        window.getAISuggestionForInput(promptMap[targetId], targetInput, btn);
                    });
                }
            }
        });
    }
}

export function showProfissionalPage() {
    const savedGoals = window.loadItems(GOALS_STORAGE_KEY);
    goals = (savedGoals && savedGoals.length > 0) ? savedGoals : defaultGoals;
    renderGoals();

    reflection = window.loadItems(getReflectionStorageKey()) || { satisfacao: '', progresso: '', equilibrio: '' };
    elements.reflectionInputs.forEach((input, key) => {
        input.value = reflection[key as keyof ProfissionalReflection] || '';
    });
}