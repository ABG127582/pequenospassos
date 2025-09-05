import { showToast } from '../features/ui';

export function saveItems(storageKey: string, items: any) {
    try {
        localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (e) {
        console.error(`Failed to save items for key "${storageKey}" to localStorage`, e);
        showToast('Erro ao salvar dados.', 'error');
    }
}

export function loadItems(storageKey: string) {
    try {
        const storedItems = localStorage.getItem(storageKey);
        if (storedItems === null) {
            return null;
        }
        return JSON.parse(storedItems);
    } catch (e) {
        console.error(`Failed to load items for key "${storageKey}" from localStorage`, e);
        showToast('Erro ao carregar dados.', 'error');
        return null;
    }
}
