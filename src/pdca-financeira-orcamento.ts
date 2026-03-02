// pdca-financeira-orcamento.ts
import { openModal as openScheduleModal, TaskCategory } from './planejamento-diario';

const handleActionHubClick = (e: Event) => {
    const target = e.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>('.add-to-plan-btn');
    if (!button) return;

    const routineBlock = button.closest<HTMLElement>('.routine-block');
    if (!routineBlock) return;

    const description = routineBlock.dataset.description;
    const category = routineBlock.dataset.category as TaskCategory;

    if (description && category) {
        openScheduleModal(undefined, { description, category });
    }
};

export function setup() {
    const page = document.getElementById('page-pdca-financeira-orcamento');
    if (!page) return;

    const actionHubContainer = page.querySelector('.action-hub');
    actionHubContainer?.addEventListener('click', handleActionHubClick);
}

export function show() {
    // Logic to show page if needed
}
