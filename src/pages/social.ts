import { setupListManagement } from '../features/list-management';
import { addAIButtonListener } from '../features/ai-helpers';
import { generateAndDisplayWebResources } from '../api/gemini';

export function initSocialPage() {
    setupListManagement({ sectionKey: 'social', listId: 'social-metas-list', formId: 'social-metas-form', textInputId: 'social-meta-input', storageKey: 'socialGoals', itemType: 'goal' });

    const generateBtn = document.getElementById('generate-social-resources-btn') as HTMLElement;
    const loadingEl = document.getElementById('social-resources-loading') as HTMLElement;
    const outputEl = document.getElementById('social-resources-output') as HTMLElement;
    if(generateBtn && loadingEl && outputEl) {
        generateBtn.addEventListener('click', () => {
            const prompt = "Sugira artigos, vídeos e cursos online sobre como desenvolver habilidades sociais e comunicação interpessoal. Forneça um resumo dos tipos de recursos encontrados e os links diretos.";
            generateAndDisplayWebResources(generateBtn, loadingEl, outputEl, prompt);
        });
    }

    addAIButtonListener('social-meta-input-ai-btn', 'social-meta-input', "Sugira uma meta SMART e concisa para a Saúde Social. Exemplo: 'Iniciar uma conversa com uma pessoa nova em um evento este mês' ou 'Ligar para um amigo uma vez por semana'.");
}
