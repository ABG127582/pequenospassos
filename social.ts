import DOMPurify from 'dompurify';
import { openModal as openScheduleModal, TaskCategory } from './planejamento-diario';

// Type definitions
interface Goal {
    id: string;
    text: string;
    completed: boolean;
    time?: string;
}

interface SocialReflection {
    sentimentoConexao: string;
    interacoes: string;
    qualidadeAmizades: string;
}

// Re-declare window interface
declare global {
    interface Window {
        showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
        saveItems: (storageKey: string, items: any) => void;
        loadItems: (storageKey: string) => any;
        getAISuggestionForInput: (prompt: string, targetInput: HTMLInputElement | HTMLTextAreaElement, button: HTMLButtonElement) => Promise<void>;
        getAITextResponse: (prompt: string, button?: HTMLButtonElement) => Promise<string | null>;
    }
}

// --- Module-scoped state ---
let goals: Goal[] = [];
const GOALS_STORAGE_KEY = 'socialGoals';
let reflection: SocialReflection = { sentimentoConexao: '', interacoes: '', qualidadeAmizades: '' };

const defaultGoals: Goal[] = [
    { id: 'social-1', text: 'Enviar uma mensagem para um amigo da "tribo íntima"', completed: false },
    { id: 'social-2', text: 'Ligar para um amigo ou familiar com quem não falo há tempos', completed: false },
    { id: 'social-3', text: 'Pesquisar um grupo ou evento local de um hobby de interesse', completed: false },
    { id: 'social-4', text: 'Praticar uma micro-interação positiva com um estranho (ex: um elogio, um "bom dia" atencioso)', completed: false },
];

// --- DOM Elements ---
const elements = {
    pageContainer: null as HTMLElement | null,
    // Goals
    goalsList: null as HTMLUListElement | null,
    goalsForm: null as HTMLFormElement | null,
    goalInput: null as HTMLInputElement | null,
    goalAIBtn: null as HTMLButtonElement | null,
    // AI Resources
    generateBtn: null as HTMLButtonElement | null,
    loadingEl: null as HTMLElement | null,
    outputEl: null as HTMLElement | null,
    // Action Hub
    actionHub: null as HTMLElement | null,
    // Reflection
    reflectionSection: null as HTMLElement | null,
    reflectionInputs: new Map<string, HTMLTextAreaElement>(),
};

const getReflectionStorageKey = () => `socialReflection-${new Date().toISOString().split('T')[0]}`;


// --- AI RESOURCES ---
const generateResources = async () => {
    if (!elements.generateBtn || !elements.loadingEl || !elements.outputEl) return;
    
    elements.loadingEl.style.display = 'block';
    elements.outputEl.innerHTML = '';

    const prompt = `
        Sugira 3 recursos online ou aplicativos para melhorar a saúde social e as conexões.
        Para cada um, forneça um link (se aplicável) e uma breve descrição (1-2 frases).
        Formate a resposta em HTML, usando <ul> e <li> para a lista.
        Exemplo: <li><a href="..." target="_blank">Nome do Recurso</a> - Breve descrição.</li>
    `;

    try {
        const responseText = await window.getAITextResponse(prompt, elements.generateBtn);
        if (responseText) {
            elements.outputEl.innerHTML = DOMPurify.sanitize(responseText);
        } else {
            elements.outputEl.innerHTML = '<li>Não foi possível gerar sugestões. Tente novamente.</li>';
        }
    } catch (error) {
        console.error("Error generating social resources:", error);
        window.showToast('Erro ao gerar recursos.', 'error');
        elements.outputEl.innerHTML = '<li>Ocorreu um erro. Tente novamente.</li>';
    } finally {
        elements.loadingEl.style.display = 'none';
    }
};

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
export function setupSocialPage() {
    const page = document.getElementById('page-social');
    if (!page) return;
    
    elements.pageContainer = page;
    elements.goalsList = page.querySelector('#social-metas-list');
    elements.goalsForm = page.querySelector('#social-metas-form');
    elements.goalInput = page.querySelector('#social-meta-input');
    elements.goalAIBtn = page.querySelector('#social-meta-input-ai-btn');
    elements.generateBtn = page.querySelector('#generate-social-resources-btn');
    elements.loadingEl = page.querySelector('#social-resources-loading');
    elements.outputEl = page.querySelector('#social-resources-output');
    elements.reflectionSection = page.querySelector('#social-reflection-section');
    
    const actionHubContainer = page.querySelector('.content-section');
    actionHubContainer?.addEventListener('click', handleActionHubClick);
    elements.goalsForm?.addEventListener('submit', handleAddGoal);
    elements.goalsList?.addEventListener('click', handleGoalAction);
    elements.generateBtn?.addEventListener('click', generateResources);

    elements.goalAIBtn?.addEventListener('click', () => {
        const prompt = "Sugira um objetivo de saúde social, como 'Ligar para um amigo esta semana' ou 'Participar de um evento comunitário este mês'.";
        window.getAISuggestionForInput(prompt, elements.goalInput!, elements.goalAIBtn!);
    });

    // Setup reflection section
    if (elements.reflectionSection) {
        elements.reflectionSection.querySelectorAll<HTMLTextAreaElement>('textarea[data-key]').forEach(input => {
            const key = input.dataset.key as keyof SocialReflection;
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
                        'reflection-conexao-social': "Escreva uma reflexão sobre se sentir conectado após uma boa conversa com um amigo.",
                        'reflection-interacoes-sociais': "Descreva uma interação social positiva que teve hoje, mesmo que pequena, como um 'bom dia' a um vizinho.",
                        'reflection-qualidade-amizades': "Gere um exemplo de reflexão sobre a qualidade de uma amizade, focando em apoio mútuo e confiança."
                    };
                    btn.addEventListener('click', () => {
                        window.getAISuggestionForInput(promptMap[targetId], targetInput, btn);
                    });
                }
            }
        });
    }
}

export function showSocialPage() {
    const savedGoals = window.loadItems(GOALS_STORAGE_KEY);
    goals = (savedGoals && savedGoals.length > 0) ? savedGoals : defaultGoals;
    renderGoals();

    if(elements.outputEl) elements.outputEl.innerHTML = '';

    reflection = window.loadItems(getReflectionStorageKey()) || { sentimentoConexao: '', interacoes: '', qualidadeAmizades: '' };
    elements.reflectionInputs.forEach((input, key) => {
        input.value = reflection[key as keyof SocialReflection] || '';
    });
}