import { loadItems, saveItems } from '../shared/storage';
import { showToast } from '../features/ui';
import { addAIButtonListener } from '../features/ai-helpers';

interface Task {
    id: string;
    title: string;
    description: string;
    dueDate: string;
    priority: 'low' | 'medium' | 'high';
    category: string;
    completed: boolean;
}

export function initTarefasPage() {
    // State variables
    let tasks: Task[] = [];
    let categories: string[] = [];
    let editingTaskId: string | null = null;
    let currentPage = 1;
    const tasksPerPage = 10;
    let currentFilter = 'all';
    let currentSearch = '';
    let activeCategory = 'all';
    let currentView = 'checklist';

    // Get all DOM elements safely
    const taskList = document.getElementById('task-list');
    const checklistContainer = document.getElementById('checklist-view-container');
    const tableWrapper = document.querySelector<HTMLElement>('.table-wrapper');
    const emptyState = document.getElementById('empty-state-message');
    const paginationContainer = document.querySelector<HTMLElement>('.pagination');
    const paginationInfo = document.querySelector<HTMLElement>('.page-info');
    const prevPageBtn = document.getElementById('prev-page-btn') as HTMLButtonElement | null;
    const nextPageBtn = document.getElementById('next-page-btn') as HTMLButtonElement | null;
    const currentPageEl = document.getElementById('current-page');
    const totalPagesEl = document.getElementById('total-pages');
    const categoryList = document.getElementById('categories-list');
    const modal = document.getElementById('task-modal-gerenciar-tarefas');
    const modalTitle = document.getElementById('modal-title-tarefas');
    const taskForm = document.getElementById('task-form-gerenciar-tarefas') as HTMLFormElement | null;
    const cancelBtn = document.getElementById('cancel-task-btn-gerenciar-tarefas');
    const modalCloseBtn = document.getElementById('task-modal-close-btn');
    const quickTaskInput = document.getElementById('quick-task-input') as HTMLInputElement | null;
    const addTaskBtn = document.getElementById('add-task-btn') as HTMLButtonElement | null;
    const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
    const filterSelect = document.getElementById('filter-select') as HTMLSelectElement | null;
    const addCategoryBtn = document.getElementById('add-category-btn') as HTMLButtonElement | null;
    const totalCountEl = document.getElementById('total-count');
    const completedCountEl = document.getElementById('completed-count');
    const pendingCountEl = document.getElementById('pending-count');
    const checklistViewBtn = document.getElementById('checklist-view-btn') as HTMLButtonElement | null;
    const tableViewBtn = document.getElementById('table-view-btn') as HTMLButtonElement | null;

    function loadTasks() {
        tasks = loadItems('tasks') || [];
        categories = loadItems('taskCategories') || ['Pessoal', 'Trabalho', 'Estudos'];
        currentView = localStorage.getItem('taskView') || 'checklist';
    }

    function saveTasks() {
        saveItems('tasks', tasks);
        saveItems('taskCategories', categories);
    }

    function renderAll() {
        if (!categoryList || !taskList || !checklistContainer) return;
        renderCategories();
        renderTasks();
        renderChecklist();
        updateCounts();
        updateView();
    }

    function updateView() {
        if (!checklistContainer || !tableWrapper || !checklistViewBtn || !tableViewBtn) return;
        if (currentView === 'checklist') {
            checklistContainer.style.display = 'flex';
            tableWrapper.style.display = 'none';
            checklistViewBtn.classList.add('active');
            checklistViewBtn.setAttribute('aria-pressed', 'true');
            tableViewBtn.classList.remove('active');
            tableViewBtn.setAttribute('aria-pressed', 'false');
        } else {
            checklistContainer.style.display = 'none';
            tableWrapper.style.display = 'block';
            tableViewBtn.classList.add('active');
            tableViewBtn.setAttribute('aria-pressed', 'true');
            checklistViewBtn.classList.remove('active');
            checklistViewBtn.setAttribute('aria-pressed', 'false');
        }
    }

    function renderCategories() {
        if (!categoryList || !addCategoryBtn) return;
        categoryList.innerHTML = '';

        const allTag = document.createElement('button');
        allTag.className = 'category-tag';
        allTag.textContent = 'Todas';
        allTag.dataset.category = 'all';
        if (activeCategory === 'all') allTag.classList.add('active');
        allTag.addEventListener('click', () => {
            activeCategory = 'all';
            currentPage = 1;
            renderAll();
        });
        categoryList.appendChild(allTag);

        categories.forEach(cat => {
            const tag = document.createElement('button');
            tag.className = 'category-tag';
            tag.textContent = cat;
            tag.dataset.category = cat;
            if (activeCategory === cat) tag.classList.add('active');
            tag.addEventListener('click', () => {
                activeCategory = cat;
                currentPage = 1;
                renderAll();
            });
            categoryList.appendChild(tag);
        });
        categoryList.appendChild(addCategoryBtn);
    }

    function getFilteredTasks() {
        let filtered = tasks;
        if (activeCategory !== 'all') {
            filtered = filtered.filter(task => task.category === activeCategory);
        }
        if (currentSearch) {
            const searchLower = currentSearch.toLowerCase();
            filtered = filtered.filter(task =>
                task.title.toLowerCase().includes(searchLower) ||
                task.description.toLowerCase().includes(searchLower)
            );
        }
        switch (currentFilter) {
            case 'pending':
                filtered = filtered.filter(task => !task.completed);
                break;
            case 'completed':
                filtered = filtered.filter(task => task.completed);
                break;
            case 'overdue':
                const today = new Date();
                today.setHours(0,0,0,0);
                filtered = filtered.filter(task => !task.completed && task.dueDate && new Date(task.dueDate + 'T00:00:00') < today);
                break;
            case 'high':
                filtered = filtered.filter(task => task.priority === 'high');
                break;
            case 'medium':
                filtered = filtered.filter(task => task.priority === 'medium');
                break;
            case 'low':
                filtered = filtered.filter(task => task.priority === 'low');
                break;
        }
        return filtered;
    }

    function renderTasks() {
        if (!taskList || !emptyState || !tableWrapper || !paginationContainer) return;

        const filteredTasks = getFilteredTasks();
        taskList.innerHTML = '';

        if (filteredTasks.length === 0) {
            emptyState.style.display = 'block';
            paginationContainer.style.display = 'none';
            if (currentView === 'table') tableWrapper.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            if (currentView === 'table') tableWrapper.style.display = 'block';
            paginationContainer.style.display = 'flex';
        }

        const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);
        const paginatedTasks = filteredTasks.slice((currentPage - 1) * tasksPerPage, currentPage * tasksPerPage);

        paginatedTasks.forEach(task => {
            const row = document.createElement('tr');
            row.dataset.taskId = task.id;
            if (task.completed) row.classList.add('completed');

            const priorityClasses: { [key: string]: string } = { low: 'priority-low', medium: 'priority-medium', high: 'priority-high' };
            const priorityText: { [key: string]: string } = { low: 'Baixa', medium: 'Média', high: 'Alta' };

            row.innerHTML = `
                <td><input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}></td>
                <td>
                    <span class="task-title">${task.title}</span>
                    <span class="task-description-preview">${task.description}</span>
                </td>
                <td>${task.dueDate ? new Date(task.dueDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</td>
                <td><span class="priority-tag ${priorityClasses[task.priority]}">${priorityText[task.priority]}</span></td>
                <td>${task.category ? `<span class="task-category-badge">${task.category}</span>` : 'Nenhuma'}</td>
                <td class="task-actions-cell">
                    <button class="action-btn edit" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" title="Excluir"><i class="fas fa-trash"></i></button>
                </td>
            `;
            row.querySelector('.task-checkbox')?.addEventListener('change', () => toggleTaskCompletion(task.id));
            row.querySelector('.edit')?.addEventListener('click', () => openTaskModal(task));
            row.querySelector('.delete')?.addEventListener('click', () => deleteTask(task.id));
            taskList.appendChild(row);
        });

        updatePaginationControls(filteredTasks.length, totalPages);
    }

    function renderChecklist() {
        if (!checklistContainer) return;
        const filteredTasks = getFilteredTasks();
        checklistContainer.innerHTML = '';

        if (filteredTasks.length === 0) return;

        const groupedTasks = filteredTasks.reduce((acc, task) => {
            const category = task.category || 'Geral';
            if (!acc[category]) acc[category] = [];
            acc[category].push(task);
            return acc;
        }, {} as Record<string, Task[]>);

        for (const categoryName in groupedTasks) {
            const categoryGroup = document.createElement('div');
            categoryGroup.className = 'checklist-category-group';

            const categoryTitle = document.createElement('h2');
            categoryTitle.className = 'checklist-category-title';
            categoryTitle.textContent = categoryName;
            categoryGroup.appendChild(categoryTitle);

            const tasksForCategory = groupedTasks[categoryName];
            tasksForCategory.sort((a, b) => (a.completed === b.completed) ? 0 : a.completed ? 1 : -1);

            tasksForCategory.forEach(task => {
                const item = document.createElement('div');
                item.className = 'checklist-item';
                if (task.completed) item.classList.add('completed');
                item.dataset.taskId = task.id;

                const priorityDots: { [key: string]: string } = {
                    low: '<div class="priority-dot priority-dot-low" title="Prioridade Baixa"></div>',
                    medium: '<div class="priority-dot priority-dot-medium" title="Prioridade Média"></div>',
                    high: '<div class="priority-dot priority-dot-high" title="Prioridade Alta"></div>',
                };

                const dueDateText = task.dueDate
                    ? `<div title="Vencimento"><i class="fas fa-calendar-alt"></i> ${new Date(task.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</div>`
                    : '';

                item.innerHTML = `
                    <input type="checkbox" class="checklist-item-checkbox" ${task.completed ? 'checked' : ''} aria-labelledby="title-${task.id}">
                    <div class="checklist-item-content">
                        <span class="checklist-item-title" id="title-${task.id}">${task.title}</span>
                        <div class="checklist-item-details">
                            <div class="checklist-item-priority">${priorityDots[task.priority]}</div>
                            ${dueDateText}
                        </div>
                    </div>
                    <div class="checklist-item-actions">
                        <button class="action-btn edit" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete" title="Excluir"><i class="fas fa-trash"></i></button>
                    </div>
                `;

                item.querySelector('.checklist-item-checkbox')?.addEventListener('change', () => toggleTaskCompletion(task.id));
                item.querySelector('.edit')?.addEventListener('click', () => openTaskModal(task));
                item.querySelector('.delete')?.addEventListener('click', () => deleteTask(task.id));

                categoryGroup.appendChild(item);
            });
            checklistContainer.appendChild(categoryGroup);
        }
    }

    function updatePaginationControls(filteredCount: number, totalPages: number) {
        if (!paginationInfo || !currentPageEl || !totalPagesEl || !prevPageBtn || !nextPageBtn) return;
        const startItem = filteredCount > 0 ? (currentPage - 1) * tasksPerPage + 1 : 0;
        const endItem = Math.min(currentPage * tasksPerPage, filteredCount);

        paginationInfo.innerHTML = `Mostrando ${startItem}-${endItem} de ${filteredCount}`;
        currentPageEl.textContent = currentPage.toString();
        totalPagesEl.textContent = totalPages > 0 ? totalPages.toString() : "1";

        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    }

    function updateCounts() {
        if (!totalCountEl || !completedCountEl || !pendingCountEl) return;
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        totalCountEl.textContent = total.toString();
        completedCountEl.textContent = completed.toString();
        pendingCountEl.textContent = (total - completed).toString();
    }

    function toggleTaskCompletion(taskId: string) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            saveTasks();
            renderAll();
        }
    }

    function deleteTask(taskId: string) {
        if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
            tasks = tasks.filter(t => t.id !== taskId);
            saveTasks();
            renderAll();
            showToast('Tarefa excluída!', 'info');
        }
    }

    function openTaskModal(task: Task | null = null) {
        if (!modal || !modalTitle || !taskForm) return;
        editingTaskId = task ? task.id : null;
        modalTitle.textContent = task ? 'Editar Tarefa' : 'Adicionar Tarefa';

        const categoryDropdown = document.getElementById('modal-task-category') as HTMLSelectElement;
        if (categoryDropdown) {
            categoryDropdown.innerHTML = '<option value="">Nenhuma</option>';
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                categoryDropdown.appendChild(option);
            });
        }

        const titleInput = document.getElementById('modal-task-title') as HTMLInputElement;
        const descriptionInput = document.getElementById('modal-task-description') as HTMLTextAreaElement;
        const dueDateInput = document.getElementById('modal-task-due-date') as HTMLInputElement;
        const priorityInput = document.getElementById('modal-task-priority') as HTMLSelectElement;

        if (task) {
            if (titleInput) titleInput.value = task.title;
            if (descriptionInput) descriptionInput.value = task.description;
            if (dueDateInput) dueDateInput.value = task.dueDate;
            if (priorityInput) priorityInput.value = task.priority;
            if (categoryDropdown) categoryDropdown.value = task.category;
        } else {
            taskForm.reset();
        }

        addAIButtonListener('modal-task-title-ai-btn', 'modal-task-title', "Sugira um título claro e conciso para uma tarefa de gerenciamento de projetos ou pessoal.");
        addAIButtonListener('modal-task-description-ai-btn', 'modal-task-description', () => {
            const currentTitle = titleInput?.value || '';
            return `Para a tarefa com o título '${currentTitle}', sugira uma descrição detalhada, incluindo possíveis subtarefas, critérios de conclusão ou pontos de atenção.`;
        });

        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('visible'), 10);
    }

    function closeTaskModal() {
        if (!modal) return;
        modal.classList.remove('visible');
        setTimeout(() => { if (modal) modal.style.display = 'none'; }, 300);
    }

    function handleFormSubmit(e: Event) {
        e.preventDefault();
        if (!taskForm) return;

        const formData = new FormData(taskForm);
        const taskData: Task = {
            id: editingTaskId || `task-${Date.now()}`,
            title: formData.get('title') as string,
            description: formData.get('description') as string,
            dueDate: formData.get('dueDate') as string,
            priority: formData.get('priority') as 'low' | 'medium' | 'high',
            category: formData.get('category') as string,
            completed: editingTaskId ? (tasks.find(t => t.id === editingTaskId)?.completed ?? false) : false
        };

        if (editingTaskId) {
            tasks = tasks.map(t => t.id === editingTaskId ? taskData : t);
            showToast('Tarefa atualizada com sucesso!', 'success');
        } else {
            tasks.unshift(taskData);
            showToast('Tarefa adicionada com sucesso!', 'success');
        }

        saveTasks();
        renderAll();
        closeTaskModal();
    }

    function handleQuickTaskAdd() {
        if (!quickTaskInput) return;
        const title = quickTaskInput.value.trim();
        if (!title) {
            showToast('Por favor, digite um título para a tarefa.', 'warning');
            return;
        }
        const newTask: Task = {
            id: `task-${Date.now()}`,
            title,
            description: '',
            dueDate: '',
            priority: 'medium',
            category: activeCategory !== 'all' ? activeCategory : '',
            completed: false
        };
        tasks.unshift(newTask);
        saveTasks();
        renderAll();
        quickTaskInput.value = '';
        showToast('Tarefa rápida adicionada!', 'success');
    }

    function handleAddCategory() {
        const newCategory = prompt('Digite o nome da nova categoria:');
        if (newCategory && newCategory.trim()) {
            const trimmedCategory = newCategory.trim();
            if (!categories.includes(trimmedCategory)) {
                categories.push(trimmedCategory);
                saveTasks();
                activeCategory = trimmedCategory;
                renderAll();
            } else {
                showToast('Essa categoria já existe.', 'warning');
            }
        }
    }

    function initEventListeners() {
        if (taskForm) taskForm.addEventListener('submit', handleFormSubmit);
        if (cancelBtn) cancelBtn.addEventListener('click', closeTaskModal);
        if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeTaskModal);
        if (modal) modal.addEventListener('click', (e) => {
            if (e.target === modal) closeTaskModal();
        });

        if (addTaskBtn) addTaskBtn.addEventListener('click', handleQuickTaskAdd);
        if (quickTaskInput) quickTaskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleQuickTaskAdd();
        });

        if (searchInput) searchInput.addEventListener('input', () => {
            currentSearch = searchInput.value;
            currentPage = 1;
            renderTasks();
            renderChecklist();
        });

        if (filterSelect) filterSelect.addEventListener('change', () => {
            currentFilter = filterSelect.value;
            currentPage = 1;
            renderTasks();
            renderChecklist();
        });

        if (addCategoryBtn) addCategoryBtn.addEventListener('click', handleAddCategory);

        if (prevPageBtn) prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTasks();
            }
        });

        if (nextPageBtn) nextPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(getFilteredTasks().length / tasksPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderTasks();
            }
        });

        if (checklistViewBtn) checklistViewBtn.addEventListener('click', () => {
            currentView = 'checklist';
            localStorage.setItem('taskView', 'checklist');
            updateView();
        });

        if (tableViewBtn) tableViewBtn.addEventListener('click', () => {
            currentView = 'table';
            localStorage.setItem('taskView', 'table');
            updateView();
        });

        addAIButtonListener('quick-task-input-ai-btn', 'quick-task-input', "Sugira um título para uma nova tarefa comum de produtividade pessoal ou profissional.");

    }

    loadTasks();
    renderAll();
    initEventListeners();
}
