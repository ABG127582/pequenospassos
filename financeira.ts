import DOMPurify from 'dompurify';
import { openModal as openScheduleModal, TaskCategory } from './planejamento-diario';

// Type definitions
interface Goal {
    id: string;
    text: string;
    completed: boolean;
    time?: string;
}

interface Asset {
    id: string;
    name: string;
    purchaseDate: string;
}

interface FinanceiraReflection {
    sentimento: string;
    decisoesGasto: string;
    progressoMetas: string;
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
let assets: Asset[] = [];
let reflection: FinanceiraReflection = { sentimento: '', decisoesGasto: '', progressoMetas: '' };
let editingAssetId: string | null = null;

const GOALS_STORAGE_KEY = 'financeiraGoals';
const ASSETS_STORAGE_KEY = 'financeiraAssets';

const defaultGoals: Goal[] = [
    { id: 'financeira-1', text: 'Registrar todas as despesas do dia', completed: false },
    { id: 'financeira-2', text: 'Revisar o orçamento semanal e ajustar se necessário', completed: false },
    { id: 'financeira-3', text: 'Transferir valor para a reserva de emergência', completed: false },
    { id: 'financeira-4', text: 'Estudar por 15 minutos sobre um tipo de investimento (ex: Tesouro Selic)', completed: false },
];

// --- DOM Elements ---
const elements = {
    pageContainer: null as HTMLElement | null,
    // Goals
    goalsList: null as HTMLUListElement | null,
    goalsForm: null as HTMLFormElement | null,
    goalInput: null as HTMLInputElement | null,
    goalAIBtn: null as HTMLButtonElement | null,
    // Action Hub
    actionHub: null as HTMLElement | null,
    // Asset Replacement
    assetList: null as HTMLTableSectionElement | null,
    assetForm: null as HTMLFormElement | null,
    assetNameInput: null as HTMLInputElement | null,
    assetPurchaseDateInput: null as HTMLInputElement | null,
    // Asset Modal
    assetModal: null as HTMLElement | null,
    assetModalForm: null as HTMLFormElement | null,
    assetModalCloseBtn: null as HTMLButtonElement | null,
    assetModalCancelBtn: null as HTMLButtonElement | null,
    saveAssetEditBtn: null as HTMLButtonElement | null,
    assetNameEditInput: null as HTMLInputElement | null,
    assetPurchaseDateEditInput: null as HTMLInputElement | null,
    // Reflection
    reflectionSection: null as HTMLElement | null,
    reflectionInputs: new Map<string, HTMLTextAreaElement>(),
};

const getReflectionStorageKey = () => `financeiraReflection-${new Date().toISOString().split('T')[0]}`;


// --- ASSET REPLACEMENT ---
const renderAssets = () => {
    if (!elements.assetList) return;
    elements.assetList.innerHTML = '';

    if (assets.length === 0) {
        elements.assetList.innerHTML = `<tr><td colspan="4" class="empty-list-placeholder">Nenhum item adicionado.</td></tr>`;
        return;
    }

    assets.forEach(asset => {
        const purchaseDate = new Date(asset.purchaseDate + 'T00:00:00');
        const replacementDate = new Date(purchaseDate);
        replacementDate.setFullYear(replacementDate.getFullYear() + 7);

        const row = document.createElement('tr');
        row.dataset.id = asset.id;
        row.innerHTML = `
            <td>${DOMPurify.sanitize(asset.name)}</td>
            <td>${purchaseDate.toLocaleDateString('pt-BR')}</td>
            <td>${replacementDate.toLocaleDateString('pt-BR')}</td>
            <td class="item-actions">
                <button class="action-btn edit-asset-btn edit" aria-label="Editar item"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-asset-btn delete" aria-label="Remover item"><i class="fas fa-trash"></i></button>
            </td>
        `;
        elements.assetList!.appendChild(row);
    });
};

const openAssetEditModal = (asset: Asset) => {
    if (!elements.assetModal) return;
    editingAssetId = asset.id;
    elements.assetNameEditInput!.value = asset.name;
    elements.assetPurchaseDateEditInput!.value = asset.purchaseDate;
    elements.assetModal.style.display = 'flex';
};

const closeAssetEditModal = () => {
    if (elements.assetModal) {
        elements.assetModal.style.display = 'none';
        editingAssetId = null;
    }
};

const handleSaveAssetEdit = (e: Event) => {
    e.preventDefault();
    if (!editingAssetId) return;

    const assetIndex = assets.findIndex(a => a.id === editingAssetId);
    if (assetIndex === -1) return;

    const newName = elements.assetNameEditInput!.value.trim();
    const newDate = elements.assetPurchaseDateEditInput!.value;

    if (!newName || !newDate) {
        window.showToast('Nome do item e data são obrigatórios.', 'warning');
        return;
    }

    assets[assetIndex].name = newName;
    assets[assetIndex].purchaseDate = newDate;

    window.saveItems(ASSETS_STORAGE_KEY, assets);
    renderAssets();
    closeAssetEditModal();
    window.showToast('Item atualizado com sucesso!', 'success');
};

const handleAddAsset = (e: Event) => {
    e.preventDefault();
    const name = elements.assetNameInput!.value.trim();
    const purchaseDate = elements.assetPurchaseDateInput!.value;

    if (!name || !purchaseDate) {
        window.showToast('Por favor, preencha o nome e a data de compra do item.', 'warning');
        return;
    }
    
    const newAsset: Asset = {
        id: Date.now().toString(),
        name,
        purchaseDate,
    };
    
    assets.push(newAsset);
    window.saveItems(ASSETS_STORAGE_KEY, assets);
    renderAssets();
    elements.assetForm!.reset();
};

const handleAssetListClick = (e: Event) => {
    const target = e.target as HTMLElement;
    const row = target.closest('tr');
    if (!row || !row.dataset.id) return;
    const assetId = row.dataset.id;

    const editBtn = target.closest('.edit-asset-btn');
    if (editBtn) {
        const assetToEdit = assets.find(a => a.id === assetId);
        if (assetToEdit) {
            openAssetEditModal(assetToEdit);
        }
        return;
    }

    const deleteBtn = target.closest('.delete-asset-btn');
    if (deleteBtn) {
        if (confirm('Tem certeza que deseja remover este item do planejamento?')) {
            assets = assets.filter(asset => asset.id !== assetId);
            window.saveItems(ASSETS_STORAGE_KEY, assets);
            renderAssets();
            window.showToast('Item removido do planejamento.', 'success');
        }
    }
};

// --- GOAL MANAGEMENT ---
const renderGoals = () => {
    if (!elements.goalsList) return;
    elements.goalsList.innerHTML = '';
    if (goals.length === 0) {
        elements.goalsList.innerHTML = '<li class="empty-list-placeholder">Nenhum objetivo definido.</li>';
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
export function setupFinanceiraPage() {
    const page = document.getElementById('page-financeira');
    if (!page) return;

    elements.pageContainer = page;
    // FIX: Added type assertions to querySelector calls for improved type safety.
    elements.goalsList = page.querySelector('#financeira-metas-list') as HTMLUListElement;
    elements.goalsForm = page.querySelector('#financeira-metas-form') as HTMLFormElement;
    elements.goalInput = page.querySelector('#financeira-meta-input') as HTMLInputElement;
    elements.goalAIBtn = page.querySelector('#financeira-meta-input-ai-btn') as HTMLButtonElement;
    elements.actionHub = page.querySelector('#do-action-hub') as HTMLElement;
    elements.assetList = page.querySelector('#asset-replacement-list') as HTMLTableSectionElement;
    elements.assetForm = page.querySelector('#add-asset-form') as HTMLFormElement;
    elements.assetNameInput = page.querySelector('#asset-name-input') as HTMLInputElement;
    elements.assetPurchaseDateInput = page.querySelector('#asset-purchase-date-input') as HTMLInputElement;
    elements.reflectionSection = page.querySelector('#financeira-reflection-section') as HTMLElement;
    
    // Asset Modal Elements
    elements.assetModal = document.getElementById('asset-modal');
    elements.assetModalForm = document.getElementById('asset-edit-form') as HTMLFormElement;
    // FIX: Added type assertion to correctly cast HTMLElement to HTMLButtonElement.
    elements.assetModalCloseBtn = document.getElementById('asset-modal-close-btn') as HTMLButtonElement;
    // FIX: Added type assertion to correctly cast HTMLElement to HTMLButtonElement.
    elements.assetModalCancelBtn = document.getElementById('asset-modal-cancel-btn') as HTMLButtonElement;
    // FIX: Added type assertion to correctly cast HTMLElement to HTMLButtonElement.
    elements.saveAssetEditBtn = document.getElementById('save-asset-edit-btn') as HTMLButtonElement;
    elements.assetNameEditInput = document.getElementById('asset-name-edit-input') as HTMLInputElement;
    elements.assetPurchaseDateEditInput = document.getElementById('asset-purchase-date-edit-input') as HTMLInputElement;


    elements.goalsForm?.addEventListener('submit', handleAddGoal);
    elements.goalsList?.addEventListener('click', handleGoalAction);
    elements.actionHub?.addEventListener('click', handleActionHubClick);
    elements.assetForm?.addEventListener('submit', handleAddAsset);
    elements.assetList?.addEventListener('click', handleAssetListClick);

    // Asset Modal Listeners
    elements.assetModalCloseBtn?.addEventListener('click', closeAssetEditModal);
    elements.assetModalCancelBtn?.addEventListener('click', closeAssetEditModal);
    elements.assetModalForm?.addEventListener('submit', handleSaveAssetEdit);

    elements.goalAIBtn?.addEventListener('click', () => {
        const prompt = "Sugira um objetivo financeiro SMART (Específico, Mensurável, Atingível, Relevante, Temporal). Por exemplo, 'Economizar R$ 3.000 para a reserva de emergência nos próximos 6 meses' ou 'Quitar a fatura do cartão de crédito de R$ 1.500 em 3 meses'.";
        window.getAISuggestionForInput(prompt, elements.goalInput!, elements.goalAIBtn!);
    });

    // Setup reflection section
    if (elements.reflectionSection) {
        elements.reflectionSection.querySelectorAll<HTMLTextAreaElement>('textarea[data-key]').forEach(input => {
            const key = input.dataset.key as keyof FinanceiraReflection;
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
                        'reflection-sentimento': "Gere uma breve reflexão sobre se sentir no controle das finanças hoje por ter seguido o orçamento.",
                        'reflection-gastos': "Escreva uma reflexão sobre uma compra consciente, explicando por que ela estava alinhada com os valores pessoais e não foi por impulso.",
                        'reflection-progresso': "Descreva um pequeno passo dado hoje em direção a uma meta financeira, como 'transferi R$50 para a poupança'."
                    };
                    btn.addEventListener('click', () => {
                        window.getAISuggestionForInput(promptMap[targetId], targetInput, btn);
                    });
                }
            }
        });
    }
}

export function showFinanceiraPage() {
    const savedGoals = window.loadItems(GOALS_STORAGE_KEY);
    goals = (savedGoals && savedGoals.length > 0) ? savedGoals : defaultGoals;
    
    const savedAssets = window.loadItems(ASSETS_STORAGE_KEY);
    if (savedAssets && savedAssets.length > 0) {
        assets = savedAssets;
    } else {
        assets = [
            { id: 'default-1', name: 'Notebook', purchaseDate: '2014-01-01' },
            { id: 'default-2', name: 'Geladeira', purchaseDate: '2015-01-01' },
            { id: 'default-3', name: 'Cama de casal', purchaseDate: '2015-01-01' },
            { id: 'default-4', name: 'Air fryer', purchaseDate: '2015-01-01' },
            { id: 'default-5', name: 'Lancheira', purchaseDate: '2015-01-01' },
            { id: 'default-6', name: 'Sofá', purchaseDate: '2025-01-01' },
            { id: 'default-7', name: 'Video game (PS2, PS3, PS4)', purchaseDate: '2018-01-01' },
            { id: 'default-8', name: 'Mesa escritório', purchaseDate: '2021-01-01' },
            { id: 'default-9', name: 'Mesas de apoio', purchaseDate: '2022-01-01' },
            { id: 'default-10', name: 'Banquetas vermelhas', purchaseDate: '2022-01-01' },
            { id: 'default-11', name: 'Cama de solteiro', purchaseDate: '2022-01-01' },
            { id: 'default-12', name: 'Fogão', purchaseDate: '2021-01-01' },
            { id: 'default-13', name: 'Televisão', purchaseDate: '2022-01-01' },
        ];
    }
    
    renderGoals();
    renderAssets();
    
    reflection = window.loadItems(getReflectionStorageKey()) || { sentimento: '', decisoesGasto: '', progressoMetas: '' };
    elements.reflectionInputs.forEach((input, key) => {
        input.value = reflection[key as keyof FinanceiraReflection] || '';
    });
}