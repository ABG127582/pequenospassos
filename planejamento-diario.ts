import DOMPurify from 'dompurify';

// --- TYPE DEFINITIONS ---
export type TaskCategory = 'Física' | 'Mental' | 'Financeira' | 'Familiar' | 'Profissional' | 'Social' | 'Espiritual' | 'Preventiva' | 'Pessoal';

export interface ScheduledTask {
    id: string;
    startTime: string; // "HH:MM"
    endTime: string;   // "HH:MM"
    description: string;
    completed: boolean;
    category: TaskCategory;
}

interface StoicReflection {
    sleep: string;
    dayReview: string;
    bodyScan: string;
    mentalCheck: string;
    premeditation: string;
}

interface DailyPlan {
    tasks: ScheduledTask[];
    reflection: StoicReflection;
}

// Re-declare global functions from index.tsx
declare global {
    interface Window {
        showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
        saveItems: (storageKey: string, items: any) => void;
        loadItems: (storageKey: string) => any;
        getAISuggestionForInput: (prompt: string, targetInput: HTMLInputElement | HTMLTextAreaElement, button: HTMLButtonElement) => Promise<void>;
    }
}

// --- MODULE-SCOPED VARIABLES ---

let currentDate: string;
let dailyPlan: DailyPlan;
let editingTaskId: string | null = null;

const defaultPlan: DailyPlan = {
    tasks: [
        { id: '1', startTime: '05:00', endTime: '06:00', description: 'Acordar, Hidratação e Leitura Silenciosa', completed: false, category: 'Mental' },
        { id: '2', startTime: '06:00', endTime: '07:00', description: 'Exercício Físico (Cardio ou Força)', completed: false, category: 'Física' },
        { id: '3', startTime: '07:00', endTime: '08:00', description: 'Café da Manhã Nutritivo e Suplementos', completed: false, category: 'Preventiva' },
        { id: '4', startTime: '08:00', endTime: '09:00', description: 'Planejar o Dia e Definir 3 MITs (Tarefas Mais Importantes)', completed: false, category: 'Profissional' },
        { id: '5', startTime: '09:00', endTime: '11:00', description: 'Bloco de Trabalho Focado 1 (Deep Work)', completed: false, category: 'Profissional' },
        { id: '6', startTime: '11:00', endTime: '11:15', description: 'Pausa e Alongamento', completed: false, category: 'Física' },
        { id: '7', startTime: '11:15', endTime: '13:00', description: 'Bloco de Trabalho Focado 2', completed: false, category: 'Profissional' },
        { id: '8', startTime: '13:00', endTime: '14:00', description: 'Almoço Consciente (Sem distrações)', completed: false, category: 'Mental' },
        { id: '9', startTime: '14:00', endTime: '15:00', description: 'Tarefas Administrativas e E-mails', completed: false, category: 'Profissional' },
        { id: '10', startTime: '15:00', endTime: '15:15', description: 'Pausa para Meditação ou Respiração', completed: false, category: 'Mental' },
        { id: '11', startTime: '15:15', endTime: '17:00', description: 'Aprendizado Contínuo / Desenvolver Habilidade', completed: false, category: 'Profissional' },
        { id: '12', startTime: '17:00', endTime: '17:30', description: 'Revisão Financeira Rápida', completed: false, category: 'Financeira' },
        { id: '13', startTime: '17:30', endTime: '18:00', description: 'Ritual de Encerramento do Trabalho', completed: false, category: 'Mental' },
        { id: '14', startTime: '18:00', endTime: '19:00', description: 'Conexão Social (Ligar para amigo/familiar)', completed: false, category: 'Social' },
        { id: '15', startTime: '19:00', endTime: '20:30', description: 'Jantar em Família e Tempo de Qualidade', completed: false, category: 'Familiar' },
        { id: '16', startTime: '20:30', endTime: '21:30', description: 'Hobby / Tempo Livre Criativo', completed: false, category: 'Pessoal' },
        { id: '17', startTime: '21:30', endTime: '22:00', description: 'Leitura Relaxante (Sem telas)', completed: false, category: 'Mental' },
        { id: '18', startTime: '22:00', endTime: '22:15', description: 'Diário de Gratidão e Reflexão do Dia', completed: false, category: 'Espiritual' },
    ],
    reflection: {
        sleep: '',
        dayReview: '',
        bodyScan: '',
        mentalCheck: '',
        premeditation: '',
    }
};

const elements = {
    pageContainer: null as HTMLElement | null,
    dateInput: null as HTMLInputElement | null,
    progressRing: null as SVGCircleElement | null,
    progressText: null as SVGTextElement | null,
    scheduleList: null as HTMLUListElement | null,
    addEventBtn: null as HTMLButtonElement | null,
    reflectionContainer: null as HTMLElement | null,
    reflectionSleepInput: null as HTMLTextAreaElement | null,
    reflectionDayReviewInput: null as HTMLTextAreaElement | null,
    reflectionBodyScanInput: null as HTMLTextAreaElement | null,
    reflectionMentalCheckInput: null as HTMLTextAreaElement | null,
    reflectionPremeditationInput: null as HTMLTextAreaElement | null,
    reflectionSleepAIBtn: null as HTMLButtonElement | null,
    reflectionDayReviewAIBtn: null as HTMLButtonElement | null,
    reflectionBodyScanAIBtn: null as HTMLButtonElement | null,
    reflectionMentalCheckAIBtn: null as HTMLButtonElement | null,
    reflectionPremeditationAIBtn: null as HTMLButtonElement | null,
    // Modal Elements
    modal: null as HTMLElement | null,
    modalTitle: null as HTMLElement | null,
    modalForm: null as HTMLFormElement | null,
    modalCloseBtn: null as HTMLButtonElement | null,
    modalCancelBtn: null as HTMLButtonElement | null,
    modalSaveBtn: null as HTMLButtonElement | null,
    modalDeleteBtn: null as HTMLButtonElement | null,
    modalDescriptionInput: null as HTMLTextAreaElement | null,
    modalStartTimeInput: null as HTMLInputElement | null,
    modalEndTimeInput: null as HTMLInputElement | null,
    modalCategorySelect: null as HTMLSelectElement | null,
    modalAIBtn: null as HTMLButtonElement | null,
};

// --- DATA HANDLING ---
const getStorageKey = (date: string): string => `daily-plan-${date}`;

const loadPlan = () => {
    // Ensure currentDate is set before loading
    if (!currentDate) {
        currentDate = localStorage.getItem('daily-plan-last-date') || new Date().toISOString().split('T')[0];
    }
    const savedPlan = window.loadItems(getStorageKey(currentDate));
    if (savedPlan && savedPlan.tasks && savedPlan.tasks.length > 0) {
        dailyPlan = savedPlan;
        // Ensure reflection object exists for backward compatibility
        if (typeof dailyPlan.reflection === 'string' || !dailyPlan.reflection) {
            dailyPlan.reflection = { sleep: '', dayReview: '', bodyScan: '', mentalCheck: '', premeditation: '' };
        }
    } else {
        dailyPlan = JSON.parse(JSON.stringify(defaultPlan));
    }
};

const savePlan = () => {
    window.saveItems(getStorageKey(currentDate), dailyPlan);
};


// --- UI RENDERING ---
const updateProgress = () => {
    if (!elements.progressRing || !elements.progressText) return;
    const totalTasks = dailyPlan.tasks.length;
    if (totalTasks === 0) {
        elements.progressRing.style.strokeDashoffset = '100';
        elements.progressText.textContent = '0%';
        return;
    }
    const completedTasks = dailyPlan.tasks.filter(task => task.completed).length;
    const percentage = Math.round((completedTasks / totalTasks) * 100);
    
    elements.progressRing.style.strokeDashoffset = (100 - percentage).toString();
    elements.progressText.textContent = `${percentage}%`;
};

const renderSchedule = () => {
    if (!elements.scheduleList) return;
    elements.scheduleList.innerHTML = '';
    
    for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0');
        const hourSlot = document.createElement('li');
        hourSlot.className = 'hour-slot';
        hourSlot.dataset.hour = hour;
        
        const tasksInThisHour = dailyPlan.tasks
            .filter(task => task.startTime.startsWith(hour + ':'))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

        let tasksHtml = '';
        tasksInThisHour.forEach(task => {
            tasksHtml += `
                <div class="task-block ${task.completed ? 'completed' : ''}" data-task-id="${task.id}" data-category="${task.category}" tabindex="0">
                    <div class="task-content">
                        <div class="task-time-range">${task.startTime} - ${task.endTime}</div>
                        <p class="task-description">${DOMPurify.sanitize(task.description)}</p>
                    </div>
                    <div class="task-block-actions">
                        <button class="action-btn complete-btn complete" aria-label="Marcar como concluída"><i class="fas fa-check"></i></button>
                    </div>
                </div>
            `;
        });

        hourSlot.innerHTML = `
            <div class="hour-label">${hour}:00</div>
            <div class="tasks-in-hour">
                ${tasksHtml || ''}
            </div>
        `;
        elements.scheduleList.appendChild(hourSlot);
    }
    updateProgress();
};

const renderPage = () => {
    loadPlan();
    renderSchedule();
    if (elements.reflectionSleepInput) elements.reflectionSleepInput.value = dailyPlan.reflection.sleep;
    if (elements.reflectionDayReviewInput) elements.reflectionDayReviewInput.value = dailyPlan.reflection.dayReview;
    if (elements.reflectionBodyScanInput) elements.reflectionBodyScanInput.value = dailyPlan.reflection.bodyScan;
    if (elements.reflectionMentalCheckInput) elements.reflectionMentalCheckInput.value = dailyPlan.reflection.mentalCheck;
    if (elements.reflectionPremeditationInput) elements.reflectionPremeditationInput.value = dailyPlan.reflection.premeditation;
};

// --- MODAL HANDLING ---
export const openModal = (task?: ScheduledTask, prefill?: { description: string, category: TaskCategory }, hour?: string) => {
    if (!elements.modal || !elements.modalForm || !elements.modalTitle || !elements.modalDeleteBtn) return;
    elements.modalForm.reset();
    editingTaskId = task ? task.id : null;
    
    if (task) { // Editing existing task
        elements.modalTitle.textContent = 'Editar Evento';
        elements.modalDescriptionInput!.value = task.description;
        elements.modalStartTimeInput!.value = task.startTime;
        elements.modalEndTimeInput!.value = task.endTime;
        elements.modalCategorySelect!.value = task.category;
        elements.modalDeleteBtn.style.display = 'inline-flex';
    } else { // Adding new task
        elements.modalTitle.textContent = 'Adicionar Evento';
        elements.modalStartTimeInput!.value = hour ? `${hour.padStart(2, '0')}:00` : '';
        elements.modalEndTimeInput!.value = hour ? `${(parseInt(hour, 10) + 1).toString().padStart(2, '0')}:00` : '';
        elements.modalDeleteBtn.style.display = 'none';

        if (prefill) {
            elements.modalDescriptionInput!.value = prefill.description;
            elements.modalCategorySelect!.value = prefill.category;
        }
    }

    elements.modal.style.display = 'flex';
};

const closeModal = () => {
    if (elements.modal) elements.modal.style.display = 'none';
};

const handleSaveTask = (e: Event) => {
    e.preventDefault();
    loadPlan(); // Ensure we have the latest data for the current date
    
    const description = elements.modalDescriptionInput!.value.trim();
    if (!description) {
        window.showToast('A descrição é obrigatória.', 'warning');
        return;
    }

    const taskData: Omit<ScheduledTask, 'id' | 'completed'> = {
        description,
        startTime: elements.modalStartTimeInput!.value,
        endTime: elements.modalEndTimeInput!.value,
        category: elements.modalCategorySelect!.value as TaskCategory
    };
    
    if (editingTaskId) {
        const taskIndex = dailyPlan.tasks.findIndex(t => t.id === editingTaskId);
        if (taskIndex > -1) {
            dailyPlan.tasks[taskIndex] = { ...dailyPlan.tasks[taskIndex], ...taskData };
        }
    } else {
        dailyPlan.tasks.push({
            id: Date.now().toString(),
            completed: false,
            ...taskData,
        });
    }

    savePlan();
    renderSchedule(); // Only re-render the schedule if the modal is on the daily plan page
    closeModal();
    window.showToast('Evento salvo no plano diário!', 'success');
};


const handleDeleteTask = () => {
    if (!editingTaskId) return;
    if (confirm('Tem certeza que deseja excluir este evento?')) {
        dailyPlan.tasks = dailyPlan.tasks.filter(t => t.id !== editingTaskId);
        savePlan();
        renderSchedule();
        closeModal();
        window.showToast('Evento excluído.', 'success');
    }
};

// --- EVENT HANDLERS ---
const handleDateChange = () => {
    if (!elements.dateInput) return;
    currentDate = elements.dateInput.value;
    localStorage.setItem('daily-plan-last-date', currentDate);
    renderPage();
};

const handleScheduleClick = (e: Event) => {
    const target = e.target as HTMLElement;
    
    const taskBlock = target.closest<HTMLElement>('.task-block');
    const tasksInHour = target.closest<HTMLElement>('.tasks-in-hour');

    if (taskBlock) {
        const taskId = taskBlock.dataset.taskId;
        const task = dailyPlan.tasks.find(t => t.id === taskId);
        if (!task) return;

        if (target.closest('.complete-btn')) {
            task.completed = !task.completed;
            savePlan();
            renderSchedule(); // Re-render to update class and progress
        } else {
            // Open modal to edit
            openModal(task);
        }
    } else if (tasksInHour) {
        const hour = tasksInHour.parentElement?.dataset.hour;
        openModal(undefined, undefined, hour);
    }
};

// --- LIFECYCLE FUNCTIONS ---
export function setupPlanejamentoDiarioPage() {
    elements.pageContainer = document.getElementById('page-planejamento-diario');
    if (!elements.pageContainer) return;

    // Query elements
    elements.dateInput = elements.pageContainer.querySelector('#daily-plan-date');
    elements.progressRing = elements.pageContainer.querySelector('#daily-progress-ring .progress-ring-fg');
    elements.progressText = elements.pageContainer.querySelector('#progress-ring-text');
    elements.scheduleList = elements.pageContainer.querySelector('#schedule-hours-list');
    elements.addEventBtn = document.getElementById('add-event-btn') as HTMLButtonElement;
    
    elements.reflectionContainer = elements.pageContainer.querySelector('#daily-reflection-section');
    elements.reflectionSleepInput = elements.pageContainer.querySelector('#reflection-sleep');
    elements.reflectionDayReviewInput = elements.pageContainer.querySelector('#reflection-day-review');
    elements.reflectionBodyScanInput = elements.pageContainer.querySelector('#reflection-body-scan');
    elements.reflectionMentalCheckInput = elements.pageContainer.querySelector('#reflection-mental-check');
    elements.reflectionPremeditationInput = elements.pageContainer.querySelector('#reflection-premeditation');
    elements.reflectionSleepAIBtn = elements.pageContainer.querySelector('#reflection-sleep-ai-btn');
    elements.reflectionDayReviewAIBtn = elements.pageContainer.querySelector('#reflection-day-review-ai-btn');
    elements.reflectionBodyScanAIBtn = elements.pageContainer.querySelector('#reflection-body-scan-ai-btn');
    elements.reflectionMentalCheckAIBtn = elements.pageContainer.querySelector('#reflection-mental-check-ai-btn');
    elements.reflectionPremeditationAIBtn = elements.pageContainer.querySelector('#reflection-premeditation-ai-btn');

    // Modal elements are in the global scope (index.html), so we search the whole document
    elements.modal = document.getElementById('schedule-task-modal');
    if (elements.modal) {
        elements.modalTitle = elements.modal.querySelector('#schedule-task-modal-title');
        elements.modalForm = elements.modal.querySelector('#schedule-task-form');
        elements.modalCloseBtn = elements.modal.querySelector('#schedule-task-modal-close-btn');
        elements.modalCancelBtn = elements.modal.querySelector('#schedule-task-modal-cancel-btn');
        elements.modalSaveBtn = elements.modal.querySelector('#save-task-btn');
        elements.modalDeleteBtn = elements.modal.querySelector('#delete-task-btn');
        elements.modalDescriptionInput = elements.modal.querySelector('#task-description-input');
        elements.modalStartTimeInput = elements.modal.querySelector('#task-start-time-input');
        elements.modalEndTimeInput = elements.modal.querySelector('#task-end-time-input');
        elements.modalCategorySelect = elements.modal.querySelector('#task-category-select');
        elements.modalAIBtn = elements.modal.querySelector('#schedule-task-ai-btn');
    }

    // Attach event listeners
    elements.dateInput?.addEventListener('change', handleDateChange);
    elements.addEventBtn?.addEventListener('click', () => openModal());
    elements.scheduleList?.addEventListener('click', handleScheduleClick);
    
    elements.reflectionContainer?.addEventListener('input', (e) => {
        const target = e.target as HTMLTextAreaElement;
        if (target.tagName === 'TEXTAREA' && target.dataset.key) {
            const key = target.dataset.key as keyof StoicReflection;
            dailyPlan.reflection[key] = target.value;
            savePlan(); // Autosave
        }
    });

    elements.reflectionSleepAIBtn?.addEventListener('click', () => {
        const prompt = "Com base na informação 'dormi 7 horas mas acordei uma vez no meio da noite', escreva uma breve reflexão sobre a qualidade do sono, mencionando a interrupção mas focando na duração razoável.";
        window.getAISuggestionForInput(prompt, elements.reflectionSleepInput!, elements.reflectionSleepAIBtn!);
    });

    elements.reflectionDayReviewAIBtn?.addEventListener('click', () => {
        const prompt = "Escreva uma breve reflexão sobre um dia de trabalho produtivo, mencionando a conclusão de tarefas importantes, mas também um ponto a melhorar para amanhã, como o gerenciamento de pequenas interrupções.";
        window.getAISuggestionForInput(prompt, elements.reflectionDayReviewInput!, elements.reflectionDayReviewAIBtn!);
    });

    elements.reflectionBodyScanAIBtn?.addEventListener('click', () => {
        const prompt = "Descreva uma breve reflexão de escaneamento corporal, notando uma leve tensão nos ombros e costas devido ao trabalho no computador, e sugerindo um alongamento rápido como ação corretiva.";
        window.getAISuggestionForInput(prompt, elements.reflectionBodyScanInput!, elements.reflectionBodyScanAIBtn!);
    });
    
    elements.reflectionMentalCheckAIBtn?.addEventListener('click', () => {
        const prompt = "Escreva uma breve reflexão de check-in mental sobre um dia com sentimento predominante de foco, mas com um breve momento de ansiedade antes de uma reunião, e como a respiração ajudou a recentralizar.";
        window.getAISuggestionForInput(prompt, elements.reflectionMentalCheckInput!, elements.reflectionMentalCheckAIBtn!);
    });

    elements.reflectionPremeditationAIBtn?.addEventListener('click', () => {
        const prompt = "Crie um exemplo de 'Premeditatio Malorum' para uma importante apresentação no trabalho amanhã. Antecipe dois possíveis problemas (ex: falha técnica do projetor, uma pergunta difícil da diretoria) e sugira um plano de contingência para cada um.";
        window.getAISuggestionForInput(prompt, elements.reflectionPremeditationInput!, elements.reflectionPremeditationAIBtn!);
    });
    
    // Modal Listeners - IDEMPOTENT SETUP
    if (elements.modal && !elements.modal.dataset.handlerAttached) {
        elements.modalCloseBtn?.addEventListener('click', closeModal);
        elements.modalCancelBtn?.addEventListener('click', closeModal);
        elements.modalForm?.addEventListener('submit', handleSaveTask);
        elements.modalDeleteBtn?.addEventListener('click', handleDeleteTask);
    
        elements.modalAIBtn?.addEventListener('click', () => {
            const prompt = "Sugira uma tarefa para um planejamento diário, como 'Reunião de alinhamento com a equipe' ou 'Preparar o jantar'.";
            window.getAISuggestionForInput(prompt, elements.modalDescriptionInput!, elements.modalAIBtn!);
        });

        elements.modal.dataset.handlerAttached = 'true';
    }
}

export function showPlanejamentoDiarioPage() {
    if (!elements.pageContainer || !elements.dateInput) {
        // If the page is not fully loaded, setup might not have run.
        // This can happen if user navigates away quickly.
        // It's safe to just return.
        return;
    };

    currentDate = localStorage.getItem('daily-plan-last-date') || new Date().toISOString().split('T')[0];
    elements.dateInput.value = currentDate;
    
    renderPage();

    // Scroll to current time
    setTimeout(() => {
        const currentHour = new Date().getHours();
        const currentHourSlot = elements.scheduleList?.querySelector(`[data-hour="${currentHour.toString().padStart(2, '0')}"]`);
        currentHourSlot?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
}