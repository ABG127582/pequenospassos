import { setupListManagement } from '../features/list-management';
import { addAIButtonListener } from '../features/ai-helpers';

export function initFisicaPage() {
    setupListManagement({ sectionKey: 'fisica', storageKey: 'fisicaGoals', listId: 'fisica-metas-list', formId: 'fisica-metas-form', textInputId: 'fisica-meta-input', itemType: 'goal' });

    const pesoInputMapa = document.getElementById('peso-corporal-hidratacao-mapa') as HTMLInputElement;
    const calcBtnMapa = document.getElementById('btn-calcular-hidratacao-mapa');
    const resultadoSpanMapa = document.getElementById('resultado-hidratacao-mapa');
    if (calcBtnMapa && pesoInputMapa && resultadoSpanMapa) {
        calcBtnMapa.addEventListener('click', () => {
            const peso = parseFloat(pesoInputMapa.value);
            if (!isNaN(peso) && peso > 0) {
                resultadoSpanMapa.textContent = `${((peso * 35) / 1000).toFixed(2)} L/dia`;
            } else {
                resultadoSpanMapa.textContent = 'Peso inválido';
            }
        });
    }

    addAIButtonListener('fisica-meta-input-ai-btn', 'fisica-meta-input', "Sugira uma meta SMART concisa para a Saúde Física. Exemplo: 'Correr 5km sem parar em 3 meses' ou 'Dormir 7-8 horas por noite, 6 dias por semana'.");
}
