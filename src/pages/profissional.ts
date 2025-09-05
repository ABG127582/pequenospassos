import { setupListManagement } from '../features/list-management';
import { addAIButtonListener } from '../features/ai-helpers';

export function initProfissionalPage() {
    setupListManagement({ sectionKey: 'profissional', listId: 'profissional-metas-list', formId: 'profissional-metas-form', textInputId: 'profissional-meta-input', storageKey: 'profissionalGoals', itemType: 'goal' });

    addAIButtonListener('profissional-meta-input-ai-btn', 'profissional-meta-input', "Sugira uma meta profissional SMART e concisa. Exemplo: 'Concluir o curso de especialização em Gestão de Projetos até dezembro' ou 'Atualizar meu portfólio com 3 novos projetos até o final do trimestre'.");
}
