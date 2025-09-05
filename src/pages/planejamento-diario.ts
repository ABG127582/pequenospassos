import { loadItems, saveItems } from '../shared/storage';
import { DailyPlan, DailyTask } from '../shared/types';
import { getAISuggestionForInput } from '../api/gemini';
import { addMicButtonTo } from '../features/speech';
import { addAIButtonListener } from '../features/ai-helpers';

declare var DOMPurify: any;

let dailyPlan: DailyPlan;

const autogrowTextarea = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
};

function loadPlan(date: string) {
    const datePicker = document.getElementById('daily-plan-date') as HTMLInputElement;
    const reflectionTextarea = document.getElementById('daily-reflection') as HTMLTextAreaElement;
    const hideCompletedToggle = document.getElementById('hide-completed-toggle') as HTMLInputElement;

    const storedPlan = loadItems(`dailyPlan-${date}`);
    if (storedPlan) {
        dailyPlan = storedPlan;
    } else {
        dailyPlan = {
            date,
            tasks: [],
            reflection: '',
            hideCompleted: false
        };
    }
    if(hideCompletedToggle) hideCompletedToggle.checked = dailyPlan.hideCompleted;
    if(reflectionTextarea) {
        reflectionTextarea.value = dailyPlan.reflection;
        autogrowTextarea(reflectionTextarea);
    }
    renderTasks();
}

function savePlan() {
    if (!dailyPlan) return;
    const reflectionTextarea = document.getElementById('daily-reflection') as HTMLTextAreaElement;
    const hideCompletedToggle = document.getElementById('hide-completed-toggle') as HTMLInputElement;

    if(reflectionTextarea) dailyPlan.reflection = reflectionTextarea.value;
    if(hideCompletedToggle) dailyPlan.hideCompleted = hideCompletedToggle.checked;
    saveItems(`dailyPlan-${dailyPlan.date}`, dailyPlan);
}

function updateProgress() {
    const progressRing = document.querySelector<SVGCircleElement>('#progress-ring-circle');
    const progressText = document.querySelector<SVGTextElement>('#progress-ring-text');

    if (!progressRing || !progressText || !dailyPlan) return;
    const totalTasks = dailyPlan.tasks.length;
    if (totalTasks === 0) {
        progressText.textContent = '0%';
        progressRing.style.strokeDasharray = '0, 339.292';
        return;
    }
    const completedTasks = dailyPlan.tasks.filter(t => t.status === 'completed').length;
    const percentage = Math.round((completedTasks / totalTasks) * 100);
    progressText.textContent = `${percentage}%`;
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (percentage / 100) * circumference;
    progressRing.style.strokeDashoffset = offset.toString();
    progressRing.style.strokeDasharray = `${circumference}, ${circumference}`;
}

function renderTasks() {
    const taskList = document.getElementById('daily-task-list');
    const mitSummary = document.getElementById('mit-summary');

    if (!taskList || !mitSummary || !dailyPlan) return;
    taskList.innerHTML = '';
    const tasksToRender = dailyPlan.hideCompleted ? dailyPlan.tasks.filter(t => t.status !== 'completed') : dailyPlan.tasks;

    tasksToRender.forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.className = `daily-task-item ${task.isMIT ? 'mit' : ''} ${task.status}`;
        taskItem.dataset.id = task.id;

        taskItem.innerHTML = `
            <div class="task-main-info">
                <button class="task-status-toggle"><i class="fas fa-circle-notch"></i></button>
                <input type="time" class="task-time" value="${task.time}">
                <div id="desc-wrapper-${task.id}" class="task-description-wrapper input-mic-wrapper planner-mic-wrapper">
                    <textarea id="desc-text-${task.id}" class="task-description" rows="1" placeholder="Descrição da tarefa">${DOMPurify.sanitize(task.description)}</textarea>
                </div>
                <div id="intent-wrapper-${task.id}" class="task-intention-wrapper input-mic-wrapper input-wrapper planner-mic-wrapper">
                     <textarea id="intent-text-${task.id}" class="task-intention" rows="1" placeholder="Intenção (o porquê)...">${DOMPurify.sanitize(task.intention)}</textarea>
                     <button type="button" id="intent-ai-btn-${task.id}" class="ai-suggestion-btn small-button" title="Sugerir Intenção com IA"><i class="fas fa-wand-magic-sparkles"></i><i class="fas fa-spinner fa-spin"></i></button>
                </div>
                <div class="task-actions">
                    <button class="task-mit-toggle ${task.isMIT ? 'active' : ''}">MIT</button>
                    <button class="standard-button-danger small-button delete-task-btn"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;

        taskList.appendChild(taskItem);

        const descriptionTextarea = document.getElementById(`desc-text-${task.id}`) as HTMLTextAreaElement;
        const intentionTextarea = document.getElementById(`intent-text-${task.id}`) as HTMLTextAreaElement;
        const timeInput = taskItem.querySelector('.task-time') as HTMLInputElement;
        const statusToggle = taskItem.querySelector('.task-status-toggle') as HTMLButtonElement;
        const mitToggle = taskItem.querySelector('.task-mit-toggle') as HTMLButtonElement;
        const deleteBtn = taskItem.querySelector('.delete-task-btn') as HTMLButtonElement;
        const suggestBtn = document.getElementById(`intent-ai-btn-${task.id}`) as HTMLButtonElement;

        const statusIcon = statusToggle?.querySelector('i') as HTMLElement;
        if (statusIcon) {
            if (task.status === 'completed') statusIcon.className = 'fas fa-check-circle';
            else if (task.status === 'in-progress') statusIcon.className = 'fas fa-spinner fa-spin';
            else statusIcon.className = 'far fa-circle';
        }

        [descriptionTextarea, intentionTextarea].forEach(textarea => {
            textarea?.addEventListener('input', () => {
                autogrowTextarea(textarea);
                if(textarea) {
                    saveTaskField(task.id, textarea.id.startsWith('desc') ? 'description' : 'intention', textarea.value);
                }
            });
            textarea?.addEventListener('focus', () => autogrowTextarea(textarea));
            autogrowTextarea(textarea);
        });

        timeInput?.addEventListener('change', () => { if(timeInput) saveTaskField(task.id, 'time', timeInput.value) });
        statusToggle?.addEventListener('click', () => toggleTaskStatus(task.id, statusIcon));
        mitToggle?.addEventListener('click', () => toggleMIT(task.id, taskItem));
        deleteBtn?.addEventListener('click', () => deleteTask(task.id));

        if (suggestBtn && intentionTextarea && descriptionTextarea) {
             suggestBtn.addEventListener('click', () => {
                const prompt = `Para a tarefa "${descriptionTextarea?.value || ''}", sugira uma 'intenção' curta e poderosa. A intenção deve ser o 'porquê' por trás da tarefa, focando no benefício ou no valor que ela gera. Exemplo: para a tarefa 'Preparar relatório', a intenção poderia ser 'Para fornecer clareza e facilitar a tomada de decisão da equipe'.`;
                getAISuggestionForInput(prompt, intentionTextarea, suggestBtn);
            });
        }

        addMicButtonTo(`#desc-wrapper-${task.id}`, `desc-text-${task.id}`);
        addMicButtonTo(`#intent-wrapper-${task.id}`, `intent-text-${task.id}`);
    });

    const mitCount = dailyPlan.tasks.filter(t => t.isMIT).length;
    if(mitSummary) mitSummary.textContent = `Você tem ${mitCount} MIT(s) hoje. Foque nelas!`;
    updateProgress();
}

function saveTaskField(id: string, field: keyof DailyTask, value: any) {
    if (!dailyPlan) return;
    const task = dailyPlan.tasks.find(t => t.id === id);
    if (task) {
        (task[field] as any) = value;
        savePlan();
    }
}

function toggleTaskStatus(id: string, icon: HTMLElement | null) {
    if (!dailyPlan) return;
    const task = dailyPlan.tasks.find(t => t.id === id);
    if (task) {
        const statuses: DailyTask['status'][] = ['pending', 'in-progress', 'completed'];
        const currentIdx = statuses.indexOf(task.status);
        const nextIdx = (currentIdx + 1) % statuses.length;
        task.status = statuses[nextIdx];

        if (icon) {
            if (task.status === 'completed') icon.className = 'fas fa-check-circle';
            else if (task.status === 'in-progress') icon.className = 'fas fa-spinner fa-spin';
            else icon.className = 'far fa-circle';
        }

        savePlan();
        renderTasks();
    }
}

function toggleMIT(id: string, taskItem: HTMLElement) {
    if (!dailyPlan) return;
    const task = dailyPlan.tasks.find(t => t.id === id);
    if (task) {
        task.isMIT = !task.isMIT;
        taskItem.classList.toggle('mit', task.isMIT);
        const mitToggleButton = taskItem.querySelector('.task-mit-toggle');
        if(mitToggleButton) {
            mitToggleButton.classList.toggle('active', task.isMIT);
        }
        savePlan();
        renderTasks();
    }
}

function deleteTask(id: string) {
    if (!dailyPlan) return;
    dailyPlan.tasks = dailyPlan.tasks.filter(t => t.id !== id);
    savePlan();
    renderTasks();
}

export function printDailyPlan() {
    window.print();
};

export function initPlanejamentoDiarioPage() {
    const datePicker = document.getElementById('daily-plan-date') as HTMLInputElement;
    const addTaskBtn = document.getElementById('add-daily-task-btn');
    const reflectionTextarea = document.getElementById('daily-reflection') as HTMLTextAreaElement;
    const hideCompletedToggle = document.getElementById('hide-completed-toggle') as HTMLInputElement;
    const printBtn = document.getElementById('print-daily-plan-btn');

    addTaskBtn?.addEventListener('click', () => {
        if (!dailyPlan) return;
        const newTask: DailyTask = {
            id: `task-${Date.now()}`,
            time: new Date().toTimeString().substring(0, 5),
            description: '',
            intention: '',
            isMIT: false,
            status: 'pending'
        };
        dailyPlan.tasks.push(newTask);
        savePlan();
        renderTasks();
        const newTextarea = document.querySelector(`.daily-task-item[data-id="${newTask.id}"] .task-description`) as HTMLTextAreaElement;
        if (newTextarea) newTextarea.focus();
    });

    datePicker?.addEventListener('change', () => {
        if (datePicker) loadPlan(datePicker.value);
    });

    reflectionTextarea?.addEventListener('input', () => {
        autogrowTextarea(reflectionTextarea);
        savePlan();
    });

    hideCompletedToggle?.addEventListener('change', () => {
        if (dailyPlan && hideCompletedToggle) {
            dailyPlan.hideCompleted = hideCompletedToggle.checked;
            savePlan();
        }
        renderTasks();
    });

    printBtn?.addEventListener('click', () => printDailyPlan());

    // Add AI and Mic buttons for Reflection
    const reflectionAIButton = document.getElementById('daily-reflection-ai-btn');
    if (reflectionAIButton && reflectionTextarea) {
        addAIButtonListener('daily-reflection-ai-btn', 'daily-reflection', "Sugira um parágrafo para uma reflexão de fim de dia. O texto deve abordar gratidão, aprendizados e como o dia contribuiu para os objetivos de longo prazo. Tom de voz: calmo e introspectivo.");
    }
    addMicButtonTo('#wrapper-daily-reflection', 'daily-reflection');

    // Initial Load
    if(datePicker) {
        datePicker.value = new Date().toISOString().split('T')[0];
        loadPlan(datePicker.value);
    }
}
