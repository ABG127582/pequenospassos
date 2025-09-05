import { setupListManagement } from '../features/list-management';
import { addAIButtonListener } from '../features/ai-helpers';

export function initMentalPage() {
    setupListManagement({ sectionKey: 'mental', listId: 'mental-metas-list', formId: 'mental-metas-form', textInputId: 'mental-meta-input', storageKey: 'mentalGoals', itemType: 'goal' });

    addAIButtonListener('mental-meta-input-ai-btn', 'mental-meta-input', "Sugira uma meta SMART e concisa para a Saúde Mental. Exemplo: 'Praticar 10 minutos de meditação mindfulness 5 dias por semana' ou 'Escrever um diário de gratidão 3 vezes por semana'.");
}
