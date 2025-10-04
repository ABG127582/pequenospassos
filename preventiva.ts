import DOMPurify from 'dompurify';

// Re-declare window interface for global functions
declare global {
    interface Window {
        showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
        saveItems: (storageKey: string, items: any) => void;
        loadItems: (storageKey: string) => any;
    }
}

// --- TYPE DEFINITIONS ---
interface Supplement {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    time: string;
    notes: string;
}

interface Diagnostic {
    id: string;
    enabled: boolean;
    date: string;
    type: string;
    medication: string;
    notes: string;
    severity: string;
}

// --- MODULE-SCOPED VARIABLES & CONSTANTS ---
const VACCINE_DATES_KEY = 'preventivaVaccineDates';
const INDICATOR_PREFIX = 'preventiva-indicator-';
const SUPPLEMENTS_KEY = 'preventivaSupplements';
const DIAGNOSTICS_KEY = 'preventivaDiagnostics';

let supplements: Supplement[] = [];
let diagnostics: { [key: string]: Diagnostic } = {};

// --- VACCINE DATA AND LOGIC ---
const vaccineInfo: { [key: string]: { name: string; scheduleType: 'booster' | 'annual' | 'series' | 'single' | 'check'; validityYears?: number; pendingMonths?: number; details: string; } } = {
    'tetano': { name: 'Tétano e Difteria (dT/dTpa)', scheduleType: 'booster', validityYears: 10, pendingMonths: 3, details: 'Reforço a cada 10 anos para a maioria dos adultos. Gestantes podem necessitar da dTpa a cada gestação.' },
    'hepatite-b': { name: 'Hepatite B', scheduleType: 'series', details: 'Normalmente um esquema de 3 doses. Após completo, a imunidade é geralmente vitalícia. Verifique seu status vacinal.' },
    'influenza': { name: 'Influenza (Gripe)', scheduleType: 'annual', pendingMonths: 2, details: 'Dose anual, recomendada antes do início do inverno.' },
    'triplice-viral': { name: 'Tríplice Viral (SCR)', scheduleType: 'series', details: 'Duas doses na vida para nascidos após 1960 garantem imunidade. Verifique seu cartão de vacina.' },
    'febre-amarela': { name: 'Febre Amarela', scheduleType: 'single', details: 'Dose única para a maioria das pessoas. Verifique a recomendação para sua área.' },
    'hpv': { name: 'HPV', scheduleType: 'series', details: 'Esquema de 2 ou 3 doses dependendo da idade de início. Verifique seu status vacinal.' },
    'pneumococica': { name: 'Pneumocócica', scheduleType: 'check', details: 'Recomendada para adultos 60+ ou com condições de risco. Esquema varia. Consulte um médico.' },
    'meningococica': { name: 'Meningocócica', scheduleType: 'check', details: 'Recomendada para adolescentes e adultos jovens, ou em situações de surto. Consulte um médico.' },
    'varicela': { name: 'Varicela (Catapora)', scheduleType: 'series', details: 'Esquema de 2 doses se não teve a doença. Verifique seu cartão de vacina.' },
    'hepatite-a': { name: 'Hepatite A', scheduleType: 'series', details: 'Esquema de 2 doses. Após completo, a imunidade é duradoura.' },
    'herpes-zoster': { name: 'Herpes Zóster', scheduleType: 'check', details: 'Recomendada para adultos 50+. Esquema de 2 doses da vacina recombinante. Consulte um médico.' },
    'covid-19': { name: 'COVID-19', scheduleType: 'annual', pendingMonths: 2, details: 'Reforços anuais ou semestrais podem ser recomendados, siga as diretrizes locais de saúde.' },
    'dengue': { name: 'Dengue', scheduleType: 'series', details: 'Disponível para faixas etárias específicas e em áreas endêmicas. Esquema de 2 doses. Consulte um médico.' },
};

function calculateAndDisplayVaccineStatus(vaccineId: string) {
    const row = document.querySelector(`tr[data-vaccine-id="${vaccineId}"]`);
    if (!row) return;

    const lastDoseInput = row.querySelector('.vaccine-last-dose') as HTMLInputElement;
    const nextDoseCell = row.querySelector('.vaccine-next-dose') as HTMLElement;
    const statusCell = row.querySelector('.vaccine-status') as HTMLElement;
    const infoLink = row.querySelector('.vaccine-info-link') as HTMLElement;

    const vaccineRule = vaccineInfo[vaccineId];
    infoLink?.setAttribute('data-tooltip', vaccineRule.details);

    const savedDates = window.loadItems(VACCINE_DATES_KEY) || {};
    const lastDoseDateStr = savedDates[vaccineId];
    lastDoseInput.value = lastDoseDateStr || '';

    nextDoseCell.textContent = '-';
    statusCell.textContent = 'Verificar';
    statusCell.className = 'vaccine-status status-check';

    if (!lastDoseDateStr) return;

    const lastDoseDate = new Date(lastDoseDateStr + 'T00:00:00');
    let nextDueDate: Date | null = null;
    let statusText = '', statusClass = '';

    switch (vaccineRule.scheduleType) {
        case 'booster':
            if (vaccineRule.validityYears) {
                nextDueDate = new Date(lastDoseDate);
                nextDueDate.setFullYear(nextDueDate.getFullYear() + vaccineRule.validityYears);
            }
            break;
        case 'annual':
            nextDueDate = new Date(lastDoseDate);
            nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
            break;
        case 'series': statusText = 'Verificar esquema'; statusClass = 'status-partial'; break;
        case 'single': statusText = 'Dose única'; statusClass = 'status-ok'; break;
        case 'check': statusText = 'Consultar médico'; statusClass = 'status-check'; break;
    }

    if (nextDueDate) {
        nextDoseCell.textContent = nextDueDate.toLocaleDateString('pt-BR');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysUntilDue = Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        const pendingDays = (vaccineRule.pendingMonths || 1) * 30;

        if (daysUntilDue < 0) { statusText = 'Vencida'; statusClass = 'status-overdue'; }
        else if (daysUntilDue <= pendingDays) { statusText = 'Vence em breve'; statusClass = 'status-pending'; }
        else { statusText = 'Em dia'; statusClass = 'status-ok'; }
    }

    statusCell.textContent = statusText;
    statusCell.className = `vaccine-status ${statusClass}`;
}

// --- BIOMARKER DATA AND LOGIC ---
const indicatorConfig: { [key: string]: any } = {
    'glicemia': { name: 'Glicemia em Jejum', unit: 'mg/dL', min: 50, max: 150, zones: [{ to: 69, status: 'Atenção', tip: 'Possível hipoglicemia. Monitore.' }, { to: 99, status: 'Normal', tip: 'Valor ótimo.' }, { to: 125, status: 'Atenção', tip: 'Glicemia de jejum alterada. Risco de pré-diabetes.' }, { to: 150, status: 'Alerta', tip: 'Valor elevado, sugestivo de diabetes. Consulte um médico.' }] },
    'hdl': { name: 'HDL Colesterol', unit: 'mg/dL', min: 20, max: 100, reversed: true, zones: [{ to: 39, status: 'Alerta', tip: 'Nível baixo, maior risco cardiovascular.' }, { to: 59, status: 'Normal', tip: 'Nível aceitável.' }, { to: 100, status: 'Ótimo', tip: 'Nível protetor.' }] },
    'ldl': { name: 'LDL Colesterol', unit: 'mg/dL', min: 50, max: 200, zones: [{ to: 99, status: 'Ótimo', tip: 'Nível ideal para a maioria das pessoas.' }, { to: 129, status: 'Normal', tip: 'Próximo ao ótimo.' }, { to: 159, status: 'Alerta', tip: 'Limítrofe.' }, { to: 200, status: 'Alerta', tip: 'Nível alto, risco aumentado.' }] },
    'colesterol': { name: 'Colesterol Total', unit: 'mg/dL', min: 100, max: 300, zones: [{ to: 199, status: 'Ótimo', tip: 'Nível desejável.' }, { to: 239, status: 'Atenção', tip: 'Limítrofe.' }, { to: 300, status: 'Alerta', tip: 'Nível alto.' }] },
    'triglicerideos': { name: 'Triglicerídeos', unit: 'mg/dL', min: 50, max: 500, zones: [{ to: 149, status: 'Ótimo', tip: 'Nível desejável.' }, { to: 199, status: 'Atenção', tip: 'Limítrofe.' }, { to: 499, status: 'Alerta', tip: 'Nível alto.' }, { to: 500, status: 'Alerta', tip: 'Nível muito alto.' }] },
    'vitd': { name: 'Vitamina D', unit: 'ng/mL', min: 10, max: 100, zones: [{ to: 19, status: 'Alerta', tip: 'Deficiência. Exposição solar e/ou suplementação necessária.' }, { to: 29, status: 'Atenção', tip: 'Insuficiência.' }, { to: 60, status: 'Ótimo', tip: 'Nível adequado.' }, { to: 100, status: 'Atenção', tip: 'Nível elevado. Evitar excesso de suplementação.' }] },
    'tsh': { name: 'TSH', unit: 'µUI/mL', min: 0.1, max: 10, zones: [{ to: 0.39, status: 'Atenção', tip: 'Sugestivo de hipertireoidismo.' }, { to: 4.0, status: 'Normal', tip: 'Função tireoidiana normal.' }, { to: 10, status: 'Atenção', tip: 'Sugestivo de hipotireoidismo.' }] },
    'creatinina': { name: 'Creatinina', unit: 'mg/dL', min: 0.4, max: 1.5, zones: [{ to: 0.59, status: 'Atenção', tip: 'Pode indicar baixa massa muscular.' }, { to: 1.2, status: 'Normal', tip: 'Função renal normal.' }, { to: 1.5, status: 'Atenção', tip: 'Pode indicar alteração na função renal.' }] },
    'acidourico': { name: 'Ácido Úrico', unit: 'mg/dL', min: 2, max: 10, zones: [{ to: 2.4, status: 'Atenção', tip: 'Nível baixo.' }, { to: 6.0, status: 'Normal', tip: 'Nível normal.' }, { to: 10, status: 'Alerta', tip: 'Nível elevado, risco de gota.' }] },
    'pcr': { name: 'PCR Ultrassensível', unit: 'mg/L', min: 0, max: 10, zones: [{ to: 0.9, status: 'Normal', tip: 'Baixo risco inflamatório.' }, { to: 2.9, status: 'Atenção', tip: 'Risco inflamatório médio.' }, { to: 10, status: 'Alerta', tip: 'Alto risco inflamatório.' }] },
    'ferritina': { name: 'Ferritina', unit: 'ng/mL', min: 10, max: 400, zones: [{ to: 49, status: 'Atenção', tip: 'Estoques de ferro baixos.' }, { to: 150, status: 'Normal', tip: 'Estoques de ferro adequados.' }, { to: 400, status: 'Atenção', tip: 'Pode indicar sobrecarga de ferro ou inflamação.' }] },
    'b12': { name: 'Vitamina B12', unit: 'pg/mL', min: 100, max: 1000, zones: [{ to: 399, status: 'Atenção', tip: 'Nível baixo, risco de deficiência.' }, { to: 900, status: 'Normal', tip: 'Nível adequado.' }, { to: 1000, status: 'Atenção', tip: 'Nível elevado.' }] },
    'gordura_bio': { name: 'Gordura Corporal', unit: '%', min: 5, max: 50, zones: [{ to: 9, status: 'Ótimo', tip: 'Nível de atleta.' }, { to: 20, status: 'Normal', tip: 'Faixa saudável.' }, { to: 25, status: 'Atenção', tip: 'Acima do ideal.' }, { to: 50, status: 'Alerta', tip: 'Obesidade. Risco aumentado para a saúde.' }] },
    'massamagra_bio': { name: 'Massa Magra', unit: 'kg', min: 30, max: 90, reversed: true, zones: [{ to: 49, status: 'Alerta', tip: 'Baixa massa muscular. Risco de sarcopenia.' }, { to: 80, status: 'Normal', tip: 'Nível adequado.' }, { to: 90, status: 'Ótimo', tip: 'Nível excelente.' }] },
};

function renderIndicatorCard(indicatorId: string) {
    const card = document.querySelector(`.indicator-card[data-indicator-id="${indicatorId}"]`) as HTMLElement;
    if (!card) return;

    const config = indicatorConfig[indicatorId];
    const data = window.loadItems(`${INDICATOR_PREFIX}${indicatorId}`) || { value: null, date: '' };

    (card.querySelector('.indicator-value') as HTMLInputElement).value = data.value ?? '';
    (card.querySelector('.indicator-date') as HTMLInputElement).value = data.date || '';

    const interpretationEl = card.querySelector('.interpretation') as HTMLElement;
    const suggestionEl = card.querySelector('.suggestion') as HTMLElement;
    const marker = card.querySelector('.marker') as HTMLElement;
    const overdueWarning = card.querySelector('.overdue-warning') as HTMLElement;

    if (data.value !== null && !isNaN(data.value)) {
        const zone = config.zones.find((z: any) => data.value <= z.to) || config.zones[config.zones.length - 1];
        interpretationEl.textContent = zone.status;
        suggestionEl.textContent = zone.tip;
        interpretationEl.className = `interpretation status-${zone.status.toLowerCase().replace(/ /g, '-')}`;
        const percentage = Math.max(0, Math.min(100, ((data.value - config.min) / (config.max - config.min)) * 100));
        marker.style.left = `${percentage}%`;
    } else {
        interpretationEl.textContent = 'N/A';
        suggestionEl.textContent = 'Insira um valor.';
        marker.style.left = `-100%`;
    }

    if (data.date) {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        overdueWarning.style.display = new Date(data.date) < oneYearAgo ? 'block' : 'none';
    } else {
        overdueWarning.style.display = 'none';
    }
}

function updateIndicator(indicatorId: string) {
    const card = document.querySelector(`.indicator-card[data-indicator-id="${indicatorId}"]`) as HTMLElement;
    if (!card) return;

    const valueInput = card.querySelector('.indicator-value') as HTMLInputElement;
    const dateInput = card.querySelector('.indicator-date') as HTMLInputElement;

    const valueStr = valueInput.value.trim();
    const date = dateInput.value;
    
    if (valueStr === '') {
        window.showToast('Por favor, insira um valor para o indicador.', 'warning');
        return;
    }

    const value = parseFloat(valueStr);

    if (isNaN(value)) {
        window.showToast('Por favor, insira um valor numérico válido.', 'warning');
        return;
    }
    
    if (!date) {
        window.showToast('Por favor, insira a data da medição.', 'warning');
        return;
    }

    const dataToSave = { value, date };
    window.saveItems(`${INDICATOR_PREFIX}${indicatorId}`, dataToSave);
    window.showToast(`${indicatorConfig[indicatorId].name} atualizado com sucesso!`, 'success');
    renderIndicatorCard(indicatorId);
}

// --- SUPPLEMENT PROTOCOL LOGIC ---
function renderSupplements() {
    const list = document.getElementById('supplement-protocol-list');
    if (!list) return;
    list.innerHTML = '';
    if (supplements.length === 0) {
        list.innerHTML = `<tr><td colspan="6" class="empty-list-placeholder">Nenhum item no protocolo.</td></tr>`;
        return;
    }
    supplements.forEach(sup => {
        const row = document.createElement('tr');
        row.dataset.id = sup.id;
        row.innerHTML = `
            <td>${DOMPurify.sanitize(sup.name)}</td>
            <td>${DOMPurify.sanitize(sup.dosage)}</td>
            <td>${DOMPurify.sanitize(sup.frequency)}</td>
            <td>${DOMPurify.sanitize(sup.time)}</td>
            <td>${DOMPurify.sanitize(sup.notes)}</td>
            <td><button class="action-btn delete-supplement-btn delete" aria-label="Remover item"><i class="fas fa-trash"></i></button></td>
        `;
        list.appendChild(row);
    });
}

// --- DIAGNOSTICS LOGIC ---
function loadDiagnostics() {
    diagnostics = window.loadItems(DIAGNOSTICS_KEY) || {};
    document.querySelectorAll<HTMLElement>('.risk-item').forEach(item => {
        const id = item.dataset.diagnosticId;
        if (!id) return;
        const data = diagnostics[id] || { enabled: false, date: '', type: '', medication: '', notes: '', severity: '' };
        const toggle = item.querySelector('.diagnostic-toggle') as HTMLInputElement;
        const details = item.querySelector('.risk-details') as HTMLElement;
        
        toggle.checked = data.enabled;
        if (details) details.style.display = data.enabled ? 'flex' : 'none';

        const dateInput = item.querySelector('.diagnostic-date') as HTMLInputElement;
        if(dateInput) dateInput.value = data.date;
        const typeInput = item.querySelector('.diagnostic-type') as HTMLInputElement;
        if(typeInput) typeInput.value = data.type;
        const medInput = item.querySelector('.diagnostic-medication') as HTMLInputElement;
        if(medInput) medInput.value = data.medication;
        const notesInput = item.querySelector('.diagnostic-notes') as HTMLTextAreaElement;
        if(notesInput) notesInput.value = data.notes;
        const severityInput = item.querySelector('.diagnostic-severity') as HTMLInputElement;
        if(severityInput) severityInput.value = data.severity;
    });
}

// --- EVENT HANDLERS ---
function showSubPage(pageId: string) {
    const mainContainer = document.getElementById('page-preventiva')!;
    mainContainer.querySelectorAll('.preventiva-page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');
    (document.getElementById('preventivaBackButton') as HTMLElement).style.display = 'block';
    const title = document.querySelector(`#${pageId} .section-title`)?.textContent || 'Saúde Preventiva';
    (document.getElementById('preventivaMainTitle') as HTMLElement).textContent = title;
}

// --- LIFECYCLE FUNCTIONS ---
export function setupPreventivaPage() {
    const page = document.getElementById('page-preventiva');
    if (!page) return;

    page.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const menuItem = target.closest<HTMLElement>('.menu-item');
        if (menuItem?.dataset.target) {
            e.preventDefault();
            showSubPage(menuItem.dataset.target);
        }
        
        if (target.closest('#preventivaBackButton')) {
            page.querySelectorAll('.preventiva-page').forEach(p => p.classList.remove('active'));
            document.getElementById('preventivaMainMenu')?.classList.add('active');
            (document.getElementById('preventivaBackButton') as HTMLElement).style.display = 'none';
            (document.getElementById('preventivaMainTitle') as HTMLElement).textContent = 'Saúde Preventiva';
        }

        const updateBtn = target.closest('.update-button');
        if (updateBtn) {
            const card = target.closest<HTMLElement>('.indicator-card');
            if (card?.dataset.indicatorId) {
                updateIndicator(card.dataset.indicatorId);
            }
        }

        const deleteSupBtn = target.closest('.delete-supplement-btn');
        if (deleteSupBtn) {
            const row = deleteSupBtn.closest('tr');
            if(row?.dataset.id) {
                supplements = supplements.filter(s => s.id !== row.dataset.id);
                window.saveItems(SUPPLEMENTS_KEY, supplements);
                renderSupplements();
                window.showToast('Item removido do protocolo.', 'success');
            }
        }
    });

    page.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.classList.contains('vaccine-last-dose')) {
            const row = target.closest('tr');
            if (row?.dataset.vaccineId) {
                const savedDates = window.loadItems(VACCINE_DATES_KEY) || {};
                savedDates[row.dataset.vaccineId] = target.value;
                window.saveItems(VACCINE_DATES_KEY, savedDates);
                calculateAndDisplayVaccineStatus(row.dataset.vaccineId);
            }
        }
        if (target.classList.contains('diagnostic-toggle')) {
            const details = target.closest('.risk-item')?.querySelector('.risk-details') as HTMLElement;
            if (details) details.style.display = target.checked ? 'flex' : 'none';
        }
    });

    const supplementForm = document.getElementById('add-supplement-form') as HTMLFormElement;
    supplementForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const newSup: Supplement = {
            id: Date.now().toString(),
            name: (document.getElementById('supplement-name') as HTMLInputElement).value,
            dosage: (document.getElementById('supplement-dosage') as HTMLInputElement).value,
            frequency: (document.getElementById('supplement-frequency') as HTMLInputElement).value,
            time: (document.getElementById('supplement-time') as HTMLInputElement).value,
            notes: (document.getElementById('supplement-notes') as HTMLInputElement).value,
        };
        supplements.push(newSup);
        window.saveItems(SUPPLEMENTS_KEY, supplements);
        renderSupplements();
        supplementForm.reset();
    });

    const saveDiagnosticsBtn = document.getElementById('saveDiagnosticosButton');
    saveDiagnosticsBtn?.addEventListener('click', () => {
        document.querySelectorAll<HTMLElement>('.risk-item').forEach(item => {
            const id = item.dataset.diagnosticId;
            if (!id) return;
            diagnostics[id] = {
                id: id,
                enabled: (item.querySelector('.diagnostic-toggle') as HTMLInputElement).checked,
                date: (item.querySelector('.diagnostic-date') as HTMLInputElement)?.value || '',
                type: (item.querySelector('.diagnostic-type') as HTMLInputElement)?.value || '',
                medication: (item.querySelector('.diagnostic-medication') as HTMLInputElement)?.value || '',
                notes: (item.querySelector('.diagnostic-notes') as HTMLTextAreaElement)?.value || '',
                severity: (item.querySelector('.diagnostic-severity') as HTMLInputElement)?.value || '',
            };
        });
        window.saveItems(DIAGNOSTICS_KEY, diagnostics);
        window.showToast('Diagnósticos e riscos salvos!', 'success');
    });
}

export function showPreventivaPage() {
    const page = document.getElementById('page-preventiva');
    if (!page) return;
    
    // Reset to main menu
    page.querySelectorAll('.preventiva-page').forEach(p => p.classList.remove('active'));
    document.getElementById('preventivaMainMenu')?.classList.add('active');
    (document.getElementById('preventivaBackButton') as HTMLElement).style.display = 'none';
    (document.getElementById('preventivaMainTitle') as HTMLElement).textContent = 'Saúde Preventiva';
    
    // Load data for all sub-pages
    Object.keys(vaccineInfo).forEach(calculateAndDisplayVaccineStatus);
    Object.keys(indicatorConfig).forEach(renderIndicatorCard);
    supplements = window.loadItems(SUPPLEMENTS_KEY) || [];
    renderSupplements();
    loadDiagnostics();
}