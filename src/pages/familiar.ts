import { setupListManagement } from '../features/list-management';
import { addAIButtonListener } from '../features/ai-helpers';

export function initFamiliarPage() {
    setupListManagement({ sectionKey: 'familiar', listId: 'familiar-metas-list', formId: 'familiar-metas-form', textInputId: 'familiar-meta-input', storageKey: 'familiarGoals', itemType: 'goal' });

    addAIButtonListener('familiar-meta-input-ai-btn', 'familiar-meta-input', "Sugira uma meta SMART e concisa para a Saúde Familiar. Exemplo: 'Realizar um jantar em família sem celulares 3 vezes por semana' ou 'Planejar uma atividade de lazer em família por mês'.");
}
