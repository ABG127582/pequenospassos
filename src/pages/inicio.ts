import { showPage } from '../core/router';
import { openContractModal } from '../features/contract';

export function initInicioPage() {
    document.querySelectorAll('#page-inicio .saude-card').forEach(card => {
        card.addEventListener('click', (e: Event) => {
            const cardElement = e.currentTarget as HTMLElement;

            if (cardElement.classList.contains('video-livro')) {
                return;
            }

            e.preventDefault();

            const pageId = cardElement.dataset.page;
            if (pageId) {
                if (pageId === 'avaliacao-card') {
                    openContractModal();
                } else {
                    showPage(pageId);
                }
                return;
            }

            const classMap: { [key: string]: string } = {
                'fisica': 'fisica',
                'mental': 'mental',
                'financeira': 'financeira',
                'familiar': 'familiar',
                'profissional': 'profissional',
                'social': 'social',
                'espiritual': 'espiritual',
                'preventiva': 'preventiva',
            };

            for (const className in classMap) {
                if (cardElement.classList.contains(className)) {
                    showPage(classMap[className]);
                    return;
                }
            }
        });
    });
}
