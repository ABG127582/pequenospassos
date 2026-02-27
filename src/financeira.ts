
import DOMPurify from 'dompurify';
import { openModal as openScheduleModal, TaskCategory } from './planejamento-diario';
import { confirmAction, showMedalAnimation, awardMedalForCategory } from './utils';
import { STORAGE_KEYS } from './constants';
import { storageService } from './storage';
import { GoalManager, Goal } from './goalManager';

// Type definitions
interface Asset {
    id: string;
    name: string;
    purchaseDate: string;
}

// Re-declare window interface
declare global {
    interface Window {
        showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
    }
}

let assets: Asset[] = [];
let editingAssetId: string | null = null;
let goalManager: GoalManager | null = null;

const defaultGoals: Goal[] = [
    { id: 'financeira-1', text: 'Registrar todas as despesas do dia', completed: false },
    { id: 'financeira-2', text: 'Revisar o orçamento semanal e ajustar se necessário', completed: false },
    { id: 'financeira-3', text: 'Transferir valor para a reserva de emergência', completed: false },
    { id: 'financeira-4', text: 'Estudar por 15 minutos sobre um tipo de investimento (ex: Tesouro Selic)', completed: false },
];

const elements = {
    pageContainer: null as HTMLElement | null,
    assetList: null as HTMLTableSectionElement | null,
    assetForm: null as HTMLFormElement | null,
    assetNameInput: null as HTMLInputElement | null,
    assetPurchaseDateInput: null as HTMLInputElement | null,
    assetModal: null as HTMLElement | null,
    assetModalForm: null as HTMLFormElement | null,
    assetModalCloseBtn: null as HTMLButtonElement | null,
    assetModalCancelBtn: null as HTMLButtonElement | null,
    saveAssetEditBtn: null as HTMLButtonElement | null,
    assetNameEditInput: null as HTMLInputElement | null,
    assetPurchaseDateEditInput: null as HTMLInputElement | null,
    reflectionForm: null as HTMLFormElement | null,
};

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

    storageService.set(STORAGE_KEYS.FINANCE_ASSETS, assets);
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
    storageService.set(STORAGE_KEYS.FINANCE_ASSETS, assets);
    renderAssets();
    elements.assetForm!.reset();
};

const handleAssetListClick = async (e: Event) => {
    const target = e.target as HTMLElement;
    const row = target.closest('tr');
    if (!row || !row.dataset.id) return;
    const assetId = row.dataset.id;
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;


    const editBtn = target.closest('.edit-asset-btn');
    if (editBtn) {
        openAssetEditModal(asset);
        return;
    }

    const deleteBtn = target.closest('.delete-asset-btn');
    if (deleteBtn) {
        const confirmed = await confirmAction(`Tem certeza que deseja remover "${asset.name}" do planejamento?`);
        if (confirmed) {
            assets = assets.filter(a => a.id !== assetId);
            storageService.set(STORAGE_KEYS.FINANCE_ASSETS, assets);
            renderAssets();
            window.showToast('Item removido do planejamento.', 'success');
        }
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
    const page = document.getElementById('page-financeira');
    if (!page) return;

    elements.pageContainer = page;
    elements.assetList = page.querySelector('#asset-replacement-list') as HTMLTableSectionElement;
    elements.assetForm = page.querySelector('#add-asset-form') as HTMLFormElement;
    elements.assetNameInput = page.querySelector('#asset-name-input') as HTMLInputElement;
    elements.assetPurchaseDateInput = page.querySelector('#asset-purchase-date-input') as HTMLInputElement;
    elements.reflectionForm = page.querySelector('.reflection-form');
    
    // Asset Modal Elements
    elements.assetModal = document.getElementById('asset-modal');
    elements.assetModalForm = document.getElementById('asset-edit-form') as HTMLFormElement;
    elements.assetModalCloseBtn = document.getElementById('asset-modal-close-btn') as HTMLButtonElement;
    elements.assetModalCancelBtn = document.getElementById('asset-modal-cancel-btn') as HTMLButtonElement;
    elements.saveAssetEditBtn = document.getElementById('save-asset-edit-btn') as HTMLButtonElement;
    elements.assetNameEditInput = document.getElementById('asset-name-edit-input') as HTMLInputElement;
    elements.assetPurchaseDateEditInput = document.getElementById('asset-purchase-date-edit-input') as HTMLInputElement;

    const actionHub = page.querySelector('#do-action-hub');
    actionHub?.addEventListener('click', handleActionHubClick);
    elements.assetForm?.addEventListener('submit', handleAddAsset);
    elements.assetList?.addEventListener('click', handleAssetListClick);
    setupReflectionForm();

    // Asset Modal Listeners
    elements.assetModalCloseBtn?.addEventListener('click', closeAssetEditModal);
    elements.assetModalCancelBtn?.addEventListener('click', closeAssetEditModal);
    elements.assetModalForm?.addEventListener('submit', handleSaveAssetEdit);

    // Initializing Goal Manager
    goalManager = new GoalManager(
        'page-financeira',
        STORAGE_KEYS.FINANCE_GOALS,
        'financeira-metas-list',
        'financeira-metas-form',
        'financeira-meta-input',
        defaultGoals,
        'Financeira'
    );
    goalManager.setup();
}

export function show() {
    goalManager?.show();
    
    const savedAssets = storageService.get<Asset[]>(STORAGE_KEYS.FINANCE_ASSETS);
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
    
    renderAssets();
}
