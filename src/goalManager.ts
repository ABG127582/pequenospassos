
import DOMPurify from 'dompurify';
import { storageService } from './storage';
import { showToast, showMedalAnimation, awardMedalForCategory, getDragAfterElement } from './utils';
import { ai } from './ai';
import { loadingManager } from './loadingManager';

export interface Goal {
    id: string;
    text: string;
    completed: boolean;
    time?: string;
}

export class GoalManager {
    private goals: Goal[] = [];
    private listEl: HTMLUListElement | null = null;
    private formEl: HTMLFormElement | null = null;
    private inputEl: HTMLInputElement | null = null;
    private aiBtnEl: HTMLButtonElement | null = null;

    constructor(
        private pageId: string,
        private storageKey: string,
        private listId: string,
        private formId: string,
        private inputId: string,
        private defaultGoals: Goal[],
        private categoryName: string
    ) {}

    setup() {
        const page = document.getElementById(this.pageId);
        if (!page) return;

        this.listEl = page.querySelector(`#${this.listId}`);
        this.formEl = page.querySelector(`#${this.formId}`);
        this.inputEl = page.querySelector(`#${this.inputId}`);
        this.aiBtnEl = this.formEl?.querySelector('.ai-suggestion-btn') || null;

        this.formEl?.addEventListener('submit', (e) => this.handleSubmit(e));
        this.listEl?.addEventListener('click', (e) => this.handleListClick(e));
        this.aiBtnEl?.addEventListener('click', () => this.handleAiSuggestion());

        this.setupDragAndDrop();
    }

    show() {
        const saved = storageService.get<Goal[]>(this.storageKey);
        this.goals = (saved && saved.length > 0) ? saved : [...this.defaultGoals];
        this.render();
    }

    private render() {
        if (!this.listEl) return;
        
        const currentlyEditingId = this.listEl.querySelector('.item-edit-input')?.closest('li')?.dataset.id;
        this.listEl.innerHTML = '';

        if (this.goals.length === 0) {
            this.listEl.innerHTML = '<li class="empty-list-placeholder">Nenhuma meta definida.</li>';
            return;
        }

        this.goals.forEach(goal => {
            const li = document.createElement('li');
            li.className = goal.completed ? 'completed' : '';
            li.dataset.id = goal.id;
            li.draggable = true;
            li.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${goal.completed ? 'checked' : ''} id="task-${goal.id}" aria-label="Concluir meta">
                <label for="task-${goal.id}" class="item-text">${DOMPurify.sanitize(goal.text)}</label>
                <div class="item-actions">
                    <button class="action-btn edit-btn edit" aria-label="Editar meta"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete-btn delete" aria-label="Apagar meta"><i class="fas fa-trash"></i></button>
                </div>
            `;
            this.listEl!.appendChild(li);
        });

        if (currentlyEditingId) {
            const liToEdit = this.listEl.querySelector(`li[data-id="${currentlyEditingId}"]`) as HTMLLIElement;
            if (liToEdit) this.enterEditMode(liToEdit);
        }
    }

    private handleSubmit(e: Event) {
        e.preventDefault();
        if (!this.inputEl) return;
        
        const text = this.inputEl.value.trim();
        if (text) {
            this.addGoal(text);
            this.inputEl.value = '';
        }
    }

    private addGoal(text: string) {
        this.goals.unshift({ id: Date.now().toString(), text, completed: false });
        this.save();
        this.render();
    }

    private handleListClick(e: Event) {
        const target = e.target as HTMLElement;
        const li = target.closest('li');
        if (!li || !li.dataset.id || li.classList.contains('editing')) return;

        const goalId = li.dataset.id;
        const goalIndex = this.goals.findIndex(g => g.id === goalId);
        if (goalIndex === -1) return;

        if (target.closest('.edit-btn')) {
            this.enterEditMode(li);
        } else if (target.closest('.delete-btn')) {
            this.goals.splice(goalIndex, 1);
            this.save();
            this.render();
        } else if (target.matches('.task-checkbox') || target.closest('.item-text')) {
            this.toggleComplete(goalIndex, li);
        }
    }

    private toggleComplete(index: number, li: HTMLElement) {
        const goal = this.goals[index];
        const wasCompleted = goal.completed;
        goal.completed = !goal.completed;

        if (goal.completed && !wasCompleted) {
            showMedalAnimation(li);
            awardMedalForCategory(this.categoryName.toLowerCase());
        }

        this.save();
        this.render();
    }

    private enterEditMode(li: HTMLLIElement) {
        li.classList.add('editing');
        li.draggable = false;
        
        const label = li.querySelector('.item-text') as HTMLElement;
        const currentText = this.goals.find(g => g.id === li.dataset.id)?.text || '';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'item-edit-input';
        input.value = currentText;
        
        label.style.display = 'none';
        const checkbox = li.querySelector('.task-checkbox');
        checkbox?.parentElement?.insertBefore(input, label);

        input.focus();

        const saveEdit = () => {
            const newText = input.value.trim();
            const goalId = li.dataset.id;
            if (newText && goalId) {
                const goal = this.goals.find(g => g.id === goalId);
                if (goal) {
                    goal.text = newText;
                    this.save();
                }
            }
            this.render();
        };

        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            } else if (e.key === 'Escape') {
                input.removeEventListener('blur', saveEdit);
                this.render();
            }
        });
    }

    private async handleAiSuggestion() {
        if (!this.inputEl) return;
        
        loadingManager.start('ai-goal');
        this.aiBtnEl?.classList.add('loading');
        
        try {
            const prompt = `Gere uma única meta curta, prática e acionável (máximo 12 palavras) relacionada à ${this.categoryName} para melhorar o bem-estar diário. Responda apenas com o texto da meta, sem aspas.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            
            const suggestion = response.text.trim();
            if (suggestion) {
                this.inputEl.value = suggestion;
                this.inputEl.focus();
                showToast('Sugestão gerada! Pressione Enter para adicionar.', 'success');
            }
        } catch (error) {
            console.error('Erro ao gerar sugestão:', error);
            showToast('Não foi possível gerar uma sugestão no momento.', 'error');
        } finally {
            loadingManager.stop('ai-goal');
            this.aiBtnEl?.classList.remove('loading');
        }
    }

    private setupDragAndDrop() {
        if (!this.listEl) return;

        this.listEl.addEventListener('dragstart', (e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'LI') {
                setTimeout(() => target.classList.add('dragging'), 0);
            }
        });

        this.listEl.addEventListener('dragend', (e) => {
            (e.target as HTMLElement).classList.remove('dragging');
        });

        this.listEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingItem = this.listEl!.querySelector('.dragging');
            if (!draggingItem) return;

            const afterElement = getDragAfterElement(this.listEl!, e.clientY);
            if (afterElement == null) {
                this.listEl!.appendChild(draggingItem);
            } else {
                this.listEl!.insertBefore(draggingItem, afterElement);
            }
        });

        this.listEl.addEventListener('drop', (e) => {
            e.preventDefault();
            const draggingItem = this.listEl!.querySelector('.dragging') as HTMLElement;
            if (!draggingItem) return;

            // Reorder array based on DOM
            const newOrderIds = Array.from(this.listEl!.querySelectorAll('li')).map(li => li.dataset.id);
            this.goals.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
            this.save();
        });
    }

    private save() {
        storageService.set(this.storageKey, this.goals);
    }
}
