import { setupListManagement } from '../features/list-management';
import { addAIButtonListener } from '../features/ai-helpers';

export function initFinanceiraPage() {
    setupListManagement({ sectionKey: 'financeira', listId: 'financeira-metas-list', formId: 'financeira-metas-form', textInputId: 'financeira-meta-input', storageKey: 'financeiraGoals', itemType: 'goal' });

    addAIButtonListener('financeira-meta-input-ai-btn', 'financeira-meta-input', "Sugira uma meta financeira SMART e concisa. Exemplo: 'Economizar R$ 500 para a reserva de emergência nos próximos 3 meses' ou 'Quitar o saldo do cartão de crédito em 6 meses'.");
}
