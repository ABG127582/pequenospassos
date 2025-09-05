import { loadItems, saveItems } from '../shared/storage';
import { GenericItem, ListManagementConfig } from '../shared/types';

export function setupListManagement(config: ListManagementConfig) {
    const list = document.getElementById(config.listId) as HTMLUListElement;
    const form = document.getElementById(config.formId) as HTMLFormElement;

    if (!list || !form) {
        console.error(`List or form not found for ${config.sectionKey}.`);
        return;
    }

    let items: GenericItem[] = loadItems(config.storageKey) || [];

    const renderItems = () => {
        list.innerHTML = '';
        if (items.length === 0) {
            const emptyLi = document.createElement('li');
            emptyLi.textContent = 'Nenhum item adicionado ainda.';
            emptyLi.className = 'empty-list-item';
            list.appendChild(emptyLi);
            return;
        }

        items.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'lista-planejamento-item';
            li.dataset.index = index.toString();

            const textSpan = document.createElement('span');
            textSpan.className = 'item-text';

            if ('text' in item) { // GoalItem
                textSpan.textContent = item.text;
            } else { // ActivityPracticeItem
                textSpan.textContent = `${item.name}${item.duration ? ` (${item.duration})` : ''}`;
            }

            if (item.completed) {
                li.classList.add('completed');
            }
            li.appendChild(textSpan);

            const buttonsWrapper = document.createElement('div');
            buttonsWrapper.className = 'item-actions';

            const completeButton = document.createElement('button');
            completeButton.innerHTML = `<i class="fas ${item.completed ? 'fa-undo' : 'fa-check'}"></i>`;
            completeButton.className = `complete-btn ${item.completed ? 'completed' : ''}`;
            completeButton.setAttribute('aria-label', item.completed ? 'Desmarcar' : 'Marcar como concluído');
            completeButton.onclick = () => {
                items[index].completed = !items[index].completed;
                saveItems(config.storageKey, items);
                renderItems();
            };
            buttonsWrapper.appendChild(completeButton);

            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
            deleteButton.className = 'delete-btn';
            deleteButton.setAttribute('aria-label', 'Remover item');
            deleteButton.onclick = () => {
                items.splice(index, 1);
                saveItems(config.storageKey, items);
                renderItems();
            };
            buttonsWrapper.appendChild(deleteButton);
            li.appendChild(buttonsWrapper);
            list.appendChild(li);
        });
    };

    form.onsubmit = (e) => {
        e.preventDefault();
        let newItem: GenericItem;
        if (config.itemType === 'goal' && config.textInputId) {
            const textInput = document.getElementById(config.textInputId) as HTMLInputElement;
            if (textInput) {
                const text = textInput.value.trim();
                if (text) {
                    newItem = { text, completed: false };
                    items.push(newItem);
                    textInput.value = '';
                }
            }
        } else if (config.itemType === 'activity' && config.nameInputId) {
            const nameInput = document.getElementById(config.nameInputId) as HTMLInputElement;
            const durationInput = config.durationInputId ? document.getElementById(config.durationInputId) as HTMLInputElement : null;
            if (nameInput) {
                const name = nameInput.value.trim();
                const duration = durationInput ? durationInput.value.trim() : '';
                if (name) {
                    newItem = { name, duration, completed: false };
                    items.push(newItem);
                    nameInput.value = '';
                    if (durationInput) durationInput.value = '';
                }
            }
        }

        saveItems(config.storageKey, items);
        renderItems();
    };

    renderItems();
}
