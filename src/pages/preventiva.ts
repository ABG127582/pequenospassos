import { showToast } from '../features/ui';
import { setupListManagement } from '../features/list-management';
import { addAIButtonListener } from '../features/ai-helpers';
import { loadItems, saveItems } from '../shared/storage';
import { vaccineInfoMap, indicatorConfigsPreventiva, diagnosticConfigs } from '../shared/config';
import { IndicatorConfig } from '../shared/types';

let vaccineData: { [key: string]: string } = {}; // Stores vaccineId: lastDoseDate
let indicatorData: { [key: string]: { value: number; date: string } } = {};
let diagnosticData: { [key: string]: { date: string; type?: string; severity?: string; notes?: string; medication?: string; } } = {};
let indicatorHistory: { timestamp: number, indicatorId: string, value: number, date: string, status: string }[] = [];

function loadVaccineData() {
    const storedData = loadItems('vaccineData');
    if (storedData) {
        vaccineData = storedData;
    } else {
        vaccineData = {};
    }
};

function saveVaccineData() {
    saveItems('vaccineData', vaccineData);
};

function calculateNextDose(lastDose: string, intervalYears?: number, intervalMonths?: number, isAnnual?: boolean) {
    if (!lastDose) return "-";
    const lastDoseDate = new Date(lastDose + "T00:00:00");

    if (isNaN(lastDoseDate.getTime())) return "Data inválida";

    let nextDoseDate = new Date(lastDoseDate);

    if (isAnnual) {
        nextDoseDate.setFullYear(nextDoseDate.getFullYear() + 1);
    } else if (intervalYears) {
        nextDoseDate.setFullYear(nextDoseDate.getFullYear() + intervalYears);
    } else if (intervalMonths) {
        nextDoseDate.setMonth(nextDoseDate.getMonth() + intervalMonths);
    } else {
        return "Intervalo não definido";
    }
    return nextDoseDate.toLocaleDateString('pt-BR');
};

function updateVaccineStatus(rowOrId: HTMLElement | string) {
    let row: HTMLElement | null = null;
    let vaccineId = '';

    if (typeof rowOrId === 'string') {
        vaccineId = rowOrId;
        const table = document.getElementById('tabela-vacinas');
        if (table) {
            row = table.querySelector(`tr[data-vaccine-id="${vaccineId}"]`);
        }
    } else {
        row = rowOrId;
        vaccineId = row.dataset.vaccineId || '';
    }

    if (!row || !vaccineId) return;

    const vaccine = vaccineInfoMap[vaccineId];
    if (!vaccine) return;

    const lastDoseInput = row.querySelector('.vaccine-last-dose') as HTMLInputElement;
    const nextDoseCell = row.querySelector('.vaccine-next-dose') as HTMLTableCellElement;
    const statusCell = row.querySelector('.vaccine-status') as HTMLTableCellElement;

    if (!lastDoseInput || !nextDoseCell || !statusCell) return; // Add guard for queried elements

    const lastDoseDateStr = lastDoseInput.value;
    vaccineData[vaccineId] = lastDoseDateStr;
    saveVaccineData();

    statusCell.textContent = 'Pendente';
    statusCell.className = 'vaccine-status status-pending';
    nextDoseCell.textContent = '-';

    if (lastDoseDateStr) {
        const lastDoseDate = new Date(lastDoseDateStr + "T00:00:00");
        if (isNaN(lastDoseDate.getTime())) {
            nextDoseCell.textContent = "Data inválida";
            return;
        }

        if (vaccine.requiresScheme && !vaccine.isAnnual && !vaccine.intervalYears && !vaccine.intervalMonths) {
            nextDoseCell.textContent = vaccine.doseInfo || "Consultar esquema";
            statusCell.textContent = 'Esquema em Andamento';
            statusCell.className = 'vaccine-status status-partial';

        } else {
            const nextDoseStr = calculateNextDose(lastDoseDateStr, vaccine.intervalYears, vaccine.intervalMonths, vaccine.isAnnual);
            nextDoseCell.textContent = nextDoseStr;
            if (nextDoseStr !== "-" && nextDoseStr !== "Data inválida" && nextDoseStr !== "Intervalo não definido") {
                const parts = nextDoseStr.split('/');
                const nextDoseObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                nextDoseObj.setHours(0,0,0,0);

                const today = new Date();
                today.setHours(0,0,0,0);

                if (nextDoseObj < today) {
                    statusCell.textContent = 'Atrasada';
                    statusCell.className = 'vaccine-status status-overdue';
                } else {
                    statusCell.textContent = 'Em Dia';
                    statusCell.className = 'vaccine-status status-ok';
                }
            }
        }
    } else {
        if (vaccine.requiresScheme) {
            nextDoseCell.textContent = vaccine.doseInfo || "Consultar esquema";
            statusCell.textContent = 'Verificar';
            statusCell.className = 'vaccine-status status-check';
        } else {
            nextDoseCell.textContent = "-";
            statusCell.textContent = 'Pendente';
            statusCell.className = 'vaccine-status status-pending';
        }
    }
};

function getIndicatorById(id: string) {
    return indicatorConfigsPreventiva.find(c => c.id === id);
}

function getDiagnosticById(id: string) {
    return diagnosticConfigs.find(d => d.id === id);
}

function saveIndicatorData(indicatorId: string, value: number, date: string) {
    indicatorData[indicatorId] = { value, date };
    saveAllIndicatorData();
};

function loadIndicatorData(indicatorId: string) {
    return indicatorData[indicatorId] || null;
};

function saveAllIndicatorData() {
    saveItems('indicatorData', indicatorData);
    saveItems('indicatorHistory', indicatorHistory);
};

function loadAllIndicatorData() {
    const storedData = loadItems('indicatorData');
    if (storedData) indicatorData = storedData;
    const storedHistory = loadItems('indicatorHistory');
    if (storedHistory) indicatorHistory = storedHistory;
};

function saveDiagnosticData() {
    saveItems('diagnosticData', diagnosticData);
};

function loadDiagnosticData() {
    const storedData = loadItems('diagnosticData');
    if (storedData) {
        diagnosticData = storedData;
    }
};

function logIndicatorEntry(indicatorId: string, value: number, date: string, status: string) {
    const newEntry = {
        timestamp: new Date().getTime(),
        indicatorId,
        value,
        date,
        status
    };
    indicatorHistory.unshift(newEntry);
    if (indicatorHistory.length > 50) {
        indicatorHistory.pop();
    }
    updateIndicatorHistoryTable();
    saveAllIndicatorData();
};

function updateIndicatorUI(config: IndicatorConfig, value: number | null, date: string | null) {
    const card = document.getElementById(`indicator-card-${config.id}`) || document.querySelector(`[data-indicator-id="${config.id}"]`);
    if (!card) return;

    const valueInput = card.querySelector('.indicator-value') as HTMLInputElement;
    const dateInput = card.querySelector('.indicator-date') as HTMLInputElement;
    const marker = card.querySelector('.marker') as HTMLElement;
    const interpretationEl = card.querySelector('.interpretation') as HTMLElement;
    const suggestionEl = card.querySelector('.suggestion') as HTMLElement;
    const overdueWarningEl = card.querySelector('.overdue-warning') as HTMLElement;
    const bar = card.querySelector('.indicator-bar') as HTMLElement;

    if (!valueInput || !dateInput || !marker || !interpretationEl || !suggestionEl || !overdueWarningEl || !bar) {
        console.error(`One or more UI elements not found for indicator: ${config.id}`);
        return;
    }


    if (value !== null && value !== undefined && date) {
        valueInput.value = value.toString();
        dateInput.value = date;

        const zone = config.zones.find(z => value >= z.min && value <= z.max);
        let statusText = 'Indefinido';
        let statusClass = 'status-check';
        if (zone) {
            statusText = zone.label;
            statusClass = zone.colorClass;
        }

        interpretationEl.textContent = `Status: ${statusText}`;
        interpretationEl.className = `interpretation ${statusClass}`;

        if(statusClass === 'status-ok') {
            suggestionEl.textContent = "Excelente! Mantenha os bons hábitos.";
        } else if (statusClass === 'status-warning' || statusClass === 'status-overdue') {
            suggestionEl.textContent = "Recomenda-se acompanhamento médico para avaliação.";
        } else {
            suggestionEl.textContent = "Consulte um profissional de saúde para interpretar este resultado.";
        }

        const percentage = Math.max(0, Math.min(100, ((value - config.barMin) / (config.barMax - config.barMin)) * 100));
        marker.style.left = `${percentage}%`;
        bar.style.opacity = '1';

        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (new Date(date) < oneYearAgo) {
            overdueWarningEl.style.display = 'flex';
        } else {
            overdueWarningEl.style.display = 'none';
        }

    } else {
        valueInput.value = '';
        dateInput.value = '';
        interpretationEl.textContent = '';
        interpretationEl.className = 'interpretation';
        suggestionEl.textContent = 'Preencha os dados para ver a análise.';
        marker.style.left = '0%';
        bar.style.opacity = '0.5';
        overdueWarningEl.style.display = 'none';
    }
};

function updateIndicatorHistoryTable() {
    const historyTableBody = document.getElementById('historicoIndicadoresBody');
    if (!historyTableBody) return;

    historyTableBody.innerHTML = '';
    const last50 = indicatorHistory.slice(0, 50);

    if (last50.length === 0) {
        historyTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nenhum registro de indicador encontrado.</td></tr>';
        return;
    }

    last50.forEach(entry => {
        const indicator = getIndicatorById(entry.indicatorId);
        let statusClass = 'status-check';
        if (indicator) {
            const zone = indicator.zones.find(z => z.label === entry.status);
            if (zone) {
                statusClass = zone.colorClass;
            }
        }
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${indicator?.name || 'Desconhecido'}</td>
            <td>${new Date(entry.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
            <td>${entry.value.toLocaleString('pt-BR')} ${indicator?.unit || ''}</td>
            <td><span class="vaccine-status ${statusClass}">${entry.status}</span></td>
        `;
        historyTableBody.appendChild(row);
    });
}

export function initPreventivaPage() {
    // Sub-page navigation logic
    const mainTitle = document.getElementById('preventivaMainTitle') as HTMLElement;
    const backButton = document.getElementById('preventivaBackButton') as HTMLButtonElement;
    const mainMenu = document.getElementById('preventivaMainMenu') as HTMLElement;
    const menuItems = document.querySelectorAll('#preventivaMainMenu .menu-item');
    const preventivaPages = document.querySelectorAll('#page-preventiva .preventiva-page');

    const showSubPage = (targetId: string) => {
        const targetPage = document.getElementById(targetId) as HTMLElement;
        const targetMenuItem = document.querySelector(`.menu-item[data-target="${targetId}"]`);

        preventivaPages.forEach(p => (p as HTMLElement).classList.remove('active'));
        if (mainMenu) mainMenu.classList.remove('active');

        if (targetPage) {
            targetPage.classList.add('active');
            if(mainTitle && targetMenuItem) mainTitle.textContent = targetMenuItem.querySelector('h3')?.textContent || 'Saúde Preventiva';
            if(backButton) backButton.style.display = 'inline-flex';
        }
    };

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            if (targetId) showSubPage(targetId);
        });
    });

    if (backButton) {
        backButton.addEventListener('click', () => {
            preventivaPages.forEach(p => (p as HTMLElement).classList.remove('active'));
            if(mainMenu) mainMenu.classList.add('active');
            if(mainTitle) mainTitle.textContent = 'Saúde Preventiva';
            backButton.style.display = 'none';
        });
    }

    // Load all data
    loadVaccineData();
    loadAllIndicatorData();
    loadDiagnosticData();

    // Init Vaccines
    const vaccineTableRows = document.querySelectorAll('#tabela-vacinas tbody tr');
    vaccineTableRows.forEach(row => {
        const rowEl = row as HTMLElement;
        const vaccineId = rowEl.dataset.vaccineId;
        if (!vaccineId) return;

        const dateInput = rowEl.querySelector('.vaccine-last-dose') as HTMLInputElement;
        if(dateInput) {
            if (vaccineData[vaccineId]) {
                dateInput.value = vaccineData[vaccineId];
            }
            dateInput.addEventListener('input', () => updateVaccineStatus(rowEl));
        }

        updateVaccineStatus(rowEl);

        const infoLink = rowEl.querySelector('.vaccine-info-link');
        const vaccineInfo = vaccineInfoMap[vaccineId];
        if(infoLink && vaccineInfo) {
            infoLink.addEventListener('click', (e) => {
                e.preventDefault();
                showToast(vaccineInfo.info, 'info');
            });
        }
    });

    // Init Indicators
    const indicatorCards = document.querySelectorAll('#preventivaExames .indicator-card');
    indicatorCards.forEach(card => {
        const cardEl = card as HTMLElement;
        const indicatorId = cardEl.dataset.indicatorId;
        if (!indicatorId) return;

        const config = getIndicatorById(indicatorId);
        if (!config) {
             console.warn(`Config not found for indicator: ${indicatorId}`);
             return;
        }

        const data = loadIndicatorData(indicatorId);
        updateIndicatorUI(config, data?.value ?? null, data?.date ?? null);

        const updateButton = cardEl.querySelector('.update-button') as HTMLButtonElement;
        if(updateButton) {
            updateButton.addEventListener('click', () => {
                const valueInput = cardEl.querySelector('.indicator-value') as HTMLInputElement;
                const dateInput = cardEl.querySelector('.indicator-date') as HTMLInputElement;
                const value = parseFloat(valueInput.value);
                const date = dateInput.value;

                if (isNaN(value) || !date) {
                    showToast('Por favor, preencha o valor e a data.', 'warning');
                    return;
                }

                saveIndicatorData(indicatorId, value, date);
                const zone = config.zones.find(z => value >= z.min && value <= z.max);
                const status = zone ? zone.label : 'Indefinido';
                logIndicatorEntry(indicatorId, value, date, status);
                updateIndicatorUI(config, value, date);
                showToast(`${config.name} salvo com sucesso!`, 'success');
            });
        }
    });

    // Init Diagnostics
    const diagnosticItems = document.querySelectorAll('#preventivaDiagnosticos .risk-item');
    diagnosticItems.forEach(item => {
        const itemEl = item as HTMLElement;
        const diagnosticId = itemEl.dataset.diagnosticId;
        if (!diagnosticId) return;

        const toggle = itemEl.querySelector('.diagnostic-toggle') as HTMLInputElement;
        const details = itemEl.querySelector('.risk-details') as HTMLElement;

        const showDetails = (show: boolean) => {
            if(details) details.style.display = show ? 'block' : 'none';
        };

        if (toggle) {
            toggle.addEventListener('change', () => showDetails(toggle.checked));

            const data = diagnosticData[diagnosticId];
            if (data) {
                toggle.checked = true;
                const dateInput = itemEl.querySelector('.diagnostic-date') as HTMLInputElement;
                if(dateInput) dateInput.value = data.date || '';

                const typeInput = itemEl.querySelector('.diagnostic-type') as HTMLInputElement;
                if (typeInput) typeInput.value = data.type || '';

                const severityInput = itemEl.querySelector('.diagnostic-severity') as HTMLInputElement;
                if (severityInput) severityInput.value = data.severity || '';

                const notesInput = itemEl.querySelector('.diagnostic-notes') as HTMLTextAreaElement;
                if (notesInput) notesInput.value = data.notes || '';

                const medicationInput = itemEl.querySelector('.diagnostic-medication') as HTMLInputElement;
                if (medicationInput) medicationInput.value = data.medication || '';
            }
            showDetails(toggle.checked);
        }
    });

    const saveDiagnosticosButton = document.getElementById('saveDiagnosticosButton');
    if (saveDiagnosticosButton) {
        saveDiagnosticosButton.addEventListener('click', () => {
            diagnosticItems.forEach(item => {
                const itemEl = item as HTMLElement;
                const diagnosticId = itemEl.dataset.diagnosticId;
                if (!diagnosticId) return;

                const toggle = itemEl.querySelector('.diagnostic-toggle') as HTMLInputElement;
                if (toggle && toggle.checked) {
                    const date = (itemEl.querySelector('.diagnostic-date') as HTMLInputElement)?.value;
                    const type = (itemEl.querySelector('.diagnostic-type') as HTMLInputElement)?.value;
                    const severity = (itemEl.querySelector('.diagnostic-severity') as HTMLInputElement)?.value;
                    const notes = (itemEl.querySelector('.diagnostic-notes') as HTMLTextAreaElement)?.value;
                    const medication = (itemEl.querySelector('.diagnostic-medication') as HTMLInputElement)?.value;

                    diagnosticData[diagnosticId] = { date, type, severity, notes, medication };
                } else {
                    delete diagnosticData[diagnosticId];
                }
            });
            saveDiagnosticData();
            showToast('Diagnósticos e riscos salvos!', 'success');
        });
    }

    // Init Goals
    setupListManagement({
        sectionKey: 'preventiva',
        listId: 'preventiva-metas-list',
        formId: 'preventiva-metas-form',
        textInputId: 'preventiva-meta-input',
        storageKey: 'preventivaGoals',
        itemType: 'goal'
    });
    addAIButtonListener('preventiva-meta-input-ai-btn', 'preventiva-meta-input', "Sugira uma meta SMART e concisa para a Saúde Preventiva. Exemplo: 'Agendar check-up médico anual até o final de março' ou 'Realizar autoexame de pele mensalmente'.");


    // Init History
    updateIndicatorHistoryTable();
}
