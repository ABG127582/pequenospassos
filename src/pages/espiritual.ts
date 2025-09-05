import { setupListManagement } from '../features/list-management';
import { addAIButtonListener } from '../features/ai-helpers';
import { generateAndDisplayWebResources } from '../api/gemini';
import { loadItems, saveItems } from '../shared/storage';
import { showToast } from '../features/ui';

export function initEspiritualPage() {
    setupListManagement({ sectionKey: 'espiritual', listId: 'espiritual-metas-list', formId: 'espiritual-metas-form', textInputId: 'espiritual-meta-input', storageKey: 'espiritualGoals', itemType: 'goal' });

    const generateBtn = document.getElementById('generate-spiritual-resources-btn') as HTMLElement;
    const loadingEl = document.getElementById('spiritual-resources-loading') as HTMLElement;
    const outputEl = document.getElementById('spiritual-resources-output') as HTMLElement;
    if (generateBtn && loadingEl && outputEl) {
        generateBtn.addEventListener('click', () => {
            const prompt = "Sugira livros, textos filosóficos e comunidades online (fóruns, grupos) para aprofundar a saúde espiritual e encontrar propósito. Forneça um resumo dos tipos de recursos encontrados e os links diretos.";
            generateAndDisplayWebResources(generateBtn, loadingEl, outputEl, prompt);
        });
    }

    const practices = [
        { id: 'gratidao', text: 'Gratidão Diária' },
        { id: 'proposito', text: 'Propósito Diário' },
        { id: 'busca', text: 'Busca do Sagrado, filosófico e correto' },
        { id: 'natureza', text: 'Conexão com a natureza' }
    ];

    const practicesListEl = document.getElementById('espiritual-praticas-list');
    if (practicesListEl) {
        const today = new Date().toISOString().split('T')[0];
        const storageKey = `espiritualPractices-${today}`;
        let completedPractices: string[] = loadItems(storageKey) || [];

        const renderPractices = () => {
            practicesListEl.innerHTML = '';
            if (practices.length === 0) {
                const emptyLi = document.createElement('li');
                emptyLi.textContent = 'Nenhuma prática diária definida.';
                emptyLi.className = 'empty-list-placeholder';
                practicesListEl.appendChild(emptyLi);
                return;
            }

            practices.forEach(practice => {
                const li = document.createElement('li');
                const isChecked = completedPractices.includes(practice.id);
                li.innerHTML = `
                    <label>
                        <input type="checkbox" data-id="${practice.id}" ${isChecked ? 'checked' : ''} aria-labelledby="practice-label-${practice.id}">
                        <span id="practice-label-${practice.id}">${practice.text}</span>
                    </label>
                `;
                practicesListEl.appendChild(li);
            });
        };

        practicesListEl.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            if (target.type === 'checkbox') {
                const practiceId = target.dataset.id;
                if (practiceId) {
                    if (target.checked) {
                        if (!completedPractices.includes(practiceId)) {
                            completedPractices.push(practiceId);
                        }
                    } else {
                        completedPractices = completedPractices.filter(id => id !== practiceId);
                    }
                    saveItems(storageKey, completedPractices);
                    showToast('Progresso diário salvo!', 'success');
                }
            }
        });

        renderPractices();
    }

    addAIButtonListener('espiritual-meta-input-ai-btn', 'espiritual-meta-input', "Sugira uma meta SMART e concisa para a Saúde Espiritual. Exemplo: 'Praticar 5 minutos de meditação de gratidão todas as manhãs' ou 'Ler um capítulo de um livro filosófico por semana'.");
}
