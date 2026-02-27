// reflexoes-diarias.ts

import DOMPurify from 'dompurify';
import { storageService } from './storage';
import { STORAGE_KEYS } from './constants';
import { confirmAction, debounce } from './utils';
import { ai } from './ai';
import { loadingManager } from './loadingManager';

// --- TYPE DEFINITIONS ---
interface Reflection {
    id: string;
    category: 'Física' | 'Mental' | 'Financeira' | 'Familiar' | 'Profissional' | 'Social' | 'Espiritual';
    title: string;
    text: string;
    date: string; // YYYY-MM-DD
    timestamp: number;
}

interface ReflectionElements {
    page: HTMLElement;
    searchInput: HTMLInputElement;
    categoryFilter: HTMLSelectElement;
    dateFilter: HTMLSelectElement;
    sortFilter: HTMLSelectElement;
    listViewBtn: HTMLButtonElement;
    gridViewBtn: HTMLButtonElement;
    listContainer: HTMLElement;
    emptyState: HTMLElement;
    generateInsightsBtn: HTMLButtonElement;
    aiInsightsModal: HTMLElement;
    aiInsightsBody: HTMLElement;
    aiInsightsCloseBtn: HTMLButtonElement;
    aiInsightsOkBtn: HTMLButtonElement;
    aiInsightsCopyBtn: HTMLButtonElement;
}

// --- CONSTANTS ---
const categoryMap: { [key: string]: { name: string; color: string; } } = {
    'Física': { name: 'Física', color: 'var(--color-fisica)' },
    'Mental': { name: 'Mental', color: 'var(--color-mental)' },
    'Financeira': { name: 'Financeira', color: 'var(--color-financeira)' },
    'Familiar': { name: 'Familiar', color: 'var(--color-familiar)' },
    'Profissional': { name: 'Profissional', color: 'var(--color-profissional)' },
    'Social': { name: 'Social', color: 'var(--color-social)' },
    'Espiritual': { name: 'Espiritual', color: 'var(--color-espiritual)' },
};


// --- STATE ---
let allReflections: Reflection[] = [];
let filteredReflections: Reflection[] = [];
let elements: ReflectionElements;


// --- UTILITIES ---
function getElement<T extends HTMLElement>(selector: string, context: HTMLElement): T {
    const el = context.querySelector(selector);
    if (!el) throw new Error(`Element not found: ${selector}`);
    return el as T;
}

function formatReflectionDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

function simpleMarkdownToHtml(text: string): string {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\n/g, '<br>') // Newlines
        .replace(/<br>\s*-\s/g, '<br>&#8226; ') // Basic list items
        .replace(/<br>\s*\*\s/g, '<br>&#8226; '); // Basic list items (asterisk)
}


// --- UI RENDERING ---
function renderReflections() {
    applyFilters();

    const fragment = document.createDocumentFragment();
    if (filteredReflections.length === 0) {
        elements.emptyState.style.display = 'block';
        elements.listContainer.innerHTML = '';
        elements.generateInsightsBtn.disabled = true;
    } else {
        elements.emptyState.style.display = 'none';
        elements.generateInsightsBtn.disabled = false;
        filteredReflections.forEach(reflection => {
            fragment.appendChild(createReflectionCardElement(reflection));
        });
        elements.listContainer.replaceChildren(fragment);
    }
}

function createReflectionCardElement(reflection: Reflection): HTMLElement {
    const categoryInfo = categoryMap[reflection.category] || { name: reflection.category, color: 'var(--color-secondary)' };
    const formattedDate = formatReflectionDate(reflection.timestamp);

    const card = document.createElement('div');
    card.className = 'reflection-card-item';
    card.style.borderLeftColor = categoryInfo.color;
    card.dataset.id = reflection.id;

    card.innerHTML = `
        <div class="reflection-card-header">
            <span class="reflection-card-category" style="background-color: ${categoryInfo.color};">${DOMPurify.sanitize(categoryInfo.name)}</span>
            <span class="reflection-card-date">${formattedDate}</span>
        </div>
        <div class="reflection-card-body">
            <strong class="reflection-title">${DOMPurify.sanitize(reflection.title)}</strong>
            <p>${DOMPurify.sanitize(reflection.text).replace(/\n/g, '<br>')}</p>
        </div>
        <div class="reflection-card-actions">
            <button class="action-btn delete-reflection-btn delete" aria-label="Excluir reflexão"><i class="fas fa-trash"></i></button>
        </div>
    `;
    return card;
}

function populateCategoryFilter() {
    elements.categoryFilter.innerHTML = '<option value="all">Todas</option>';
    Object.values(categoryMap).forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        elements.categoryFilter.appendChild(option);
    });
}

// --- MODAL & AI LOGIC ---
function openInsightsModal(content: string) {
    elements.aiInsightsBody.innerHTML = simpleMarkdownToHtml(DOMPurify.sanitize(content));
    elements.aiInsightsModal.style.display = 'flex';
}

function closeInsightsModal() {
    elements.aiInsightsModal.style.display = 'none';
}

async function handleGenerateInsights() {
    if (filteredReflections.length === 0) {
        window.showToast('Não há reflexões para analisar. Altere os filtros ou adicione novas reflexões.', 'info');
        return;
    }

    loadingManager.start('ai-insights');
    elements.generateInsightsBtn.classList.add('loading');
    elements.generateInsightsBtn.disabled = true;

    const combinedReflections = filteredReflections
        .map(r => `Data: ${r.date}\nTítulo: ${r.title}\nCategoria: ${r.category}\nReflexão: ${r.text}`)
        .join('\n\n---\n\n');
    
    const prompt = `Aja como um psicólogo compassivo e analista de padrões. Analise as seguintes entradas de diário de um usuário. Identifique temas recorrentes, padrões emocionais, áreas de força e potenciais áreas para crescimento. Apresente suas percepções em uma lista de marcadores (usando '*') concisa e encorajadora. As entradas são:\n\n${combinedReflections}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        const insights = response.text;
        openInsightsModal(insights);
    } catch (error) {
        console.error("Gemini API error:", error);
        window.showToast('Ocorreu um erro ao gerar os insights. Por favor, tente novamente.', 'error');
    } finally {
        loadingManager.stop('ai-insights');
        elements.generateInsightsBtn.classList.remove('loading');
        elements.generateInsightsBtn.disabled = false;
    }
}


// --- LOGIC ---
function loadReflections() {
    allReflections = storageService.get<Reflection[]>(STORAGE_KEYS.UNIFIED_REFLECTIONS) || [];
}

function applyFilters() {
    const searchTerm = elements.searchInput.value.toLowerCase();
    const category = elements.categoryFilter.value;
    const dateRange = elements.dateFilter.value;
    const sortOrder = elements.sortFilter.value;

    let result = [...allReflections];

    if (searchTerm) {
        result = result.filter(r =>
            r.text.toLowerCase().includes(searchTerm) ||
            r.title.toLowerCase().includes(searchTerm)
        );
    }

    if (category !== 'all') {
        result = result.filter(r => r.category === category);
    }

    if (dateRange !== 'all') {
        const now = new Date();
        now.setHours(23, 59, 59, 999); // End of today
        let startTime: number;

        switch (dateRange) {
            case 'today':
                const todayStart = new Date();
                todayStart.setHours(0,0,0,0);
                startTime = todayStart.getTime();
                break;
            case 'week':
                startTime = now.getTime() - 7 * 24 * 60 * 60 * 1000;
                break;
            case 'month':
                startTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;
                break;
            default:
                startTime = 0;
        }
        result = result.filter(r => r.timestamp >= startTime);
    }

    result.sort((a, b) => sortOrder === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);

    filteredReflections = result;
}

async function handleDeleteReflection(e: Event) {
    const target = e.target as HTMLElement;
    const deleteBtn = target.closest('.delete-reflection-btn');
    if (!deleteBtn) return;
    
    const card = deleteBtn.closest<HTMLElement>('.reflection-card-item');
    if (!card?.dataset.id) return;
    
    const reflectionId = card.dataset.id;
    
    const confirmed = await confirmAction('Tem certeza que deseja excluir esta reflexão? Esta ação não pode ser desfeita.');
    if (confirmed) {
        allReflections = allReflections.filter(r => r.id !== reflectionId);
        storageService.set(STORAGE_KEYS.UNIFIED_REFLECTIONS, allReflections);
        window.showToast('Reflexão excluída com sucesso.', 'success');
        renderReflections(); // Re-render after deletion
    }
}

function switchView(view: 'list' | 'grid') {
    if (view === 'grid') {
        elements.listContainer.classList.add('grid-view');
        elements.gridViewBtn.classList.add('active');
        elements.listViewBtn.classList.remove('active');
        elements.gridViewBtn.setAttribute('aria-pressed', 'true');
        elements.listViewBtn.setAttribute('aria-pressed', 'false');
    } else {
        elements.listContainer.classList.remove('grid-view');
        elements.listViewBtn.classList.add('active');
        elements.gridViewBtn.classList.remove('active');
        elements.listViewBtn.setAttribute('aria-pressed', 'true');
        elements.gridViewBtn.setAttribute('aria-pressed', 'false');
    }
}


// --- LIFECYCLE FUNCTIONS ---
function initElements(page: HTMLElement) {
    elements = {
        page,
        searchInput: getElement<HTMLInputElement>('#reflexoes-search-input', page),
        categoryFilter: getElement<HTMLSelectElement>('#reflexoes-category-filter', page),
        dateFilter: getElement<HTMLSelectElement>('#reflexoes-date-filter', page),
        sortFilter: getElement<HTMLSelectElement>('#reflexoes-sort-filter', page),
        listViewBtn: getElement<HTMLButtonElement>('#list-view-btn', page),
        gridViewBtn: getElement<HTMLButtonElement>('#grid-view-btn', page),
        listContainer: getElement<HTMLElement>('#reflexoes-list-container', page),
        emptyState: getElement<HTMLElement>('#reflexoes-empty-state', page),
        generateInsightsBtn: getElement<HTMLButtonElement>('#generate-insights-btn', page),
        // Global modal elements
        aiInsightsModal: document.getElementById('ai-insights-modal') as HTMLElement,
        aiInsightsBody: document.getElementById('ai-insights-body') as HTMLElement,
        aiInsightsCloseBtn: document.getElementById('ai-insights-close-btn') as HTMLButtonElement,
        aiInsightsOkBtn: document.getElementById('ai-insights-ok-btn') as HTMLButtonElement,
        aiInsightsCopyBtn: document.getElementById('ai-insights-copy-btn') as HTMLButtonElement,
    };
}

export function setup() {
    const page = document.getElementById('page-reflexoes-diarias');
    if (!page) {
        console.warn('Página de reflexões não encontrada durante o setup.');
        return;
    }

    initElements(page);

    const debouncedRender = debounce(renderReflections, 300);

    elements.searchInput.addEventListener('input', debouncedRender);
    elements.categoryFilter.addEventListener('change', renderReflections);
    elements.dateFilter.addEventListener('change', renderReflections);
    elements.sortFilter.addEventListener('change', renderReflections);
    elements.listContainer.addEventListener('click', handleDeleteReflection);

    elements.listViewBtn.addEventListener('click', () => switchView('list'));
    elements.gridViewBtn.addEventListener('click', () => switchView('grid'));
    
    elements.generateInsightsBtn.addEventListener('click', handleGenerateInsights);

    // AI Modal Listeners
    elements.aiInsightsCloseBtn.addEventListener('click', closeInsightsModal);
    elements.aiInsightsOkBtn.addEventListener('click', closeInsightsModal);
    elements.aiInsightsCopyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(elements.aiInsightsBody.innerText)
            .then(() => window.showToast('Insights copiados para a área de transferência!', 'success'))
            .catch(() => window.showToast('Falha ao copiar texto.', 'error'));
    });
    
    populateCategoryFilter();
}

export function show() {
    if (!elements || !elements.page) return; // Guard clause if setup failed
    loadReflections();
    renderReflections();
    switchView('list'); // Default to list view on show
}