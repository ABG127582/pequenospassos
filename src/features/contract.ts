import { saveItems, loadItems } from '../shared/storage';
import { showToast } from './ui';

export function openContractModal() {
    const modal = document.getElementById('contract-modal');
    if (modal) {
        populateContractModal();
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('visible'), 10);
        modal.setAttribute('aria-hidden', 'false');
    }
}

export function closeContractModal() {
    const modal = document.getElementById('contract-modal');
    if (modal) {
        modal.classList.remove('visible');
        modal.setAttribute('aria-hidden', 'true');
        setTimeout(() => {
            if(modal) modal.style.display = 'none';
        }, 300);
    }
}

export function saveContractData() {
    const form = document.getElementById('contract-form');
    if (!form || !(form as HTMLFormElement).checkValidity()) {
        showToast('Por favor, preencha todos os campos obrigatórios do contrato.', 'warning');
        (form as HTMLFormElement).reportValidity();
        return;
    }
    const data = {
        name: (document.getElementById('contract-name') as HTMLInputElement).value,
        cpf: (document.getElementById('contract-cpf') as HTMLInputElement).value,
        birthdate: (document.getElementById('contract-birthdate') as HTMLInputElement).value,
        address: (document.getElementById('contract-address') as HTMLInputElement).value,
        commitment: (document.getElementById('contract-commitment') as HTMLTextAreaElement).value,
        period: (document.getElementById('contract-period') as HTMLInputElement).value,
        goals: (document.getElementById('contract-goals') as HTMLTextAreaElement).value,
        signature: (document.getElementById('contract-signature') as HTMLInputElement).value,
        date: (document.getElementById('contract-date') as HTMLInputElement).value,
    };
    saveItems('contractData', data);
    showToast('Contrato salvo com sucesso!', 'success');
    closeContractModal();
}

export function loadContractData() {
    return loadItems('contractData');
}

export function populateContractModal() {
    const data = loadContractData();
    const nameInput = document.getElementById('contract-name') as HTMLInputElement;
    const cpfInput = document.getElementById('contract-cpf') as HTMLInputElement;
    const birthdateInput = document.getElementById('contract-birthdate') as HTMLInputElement;
    const addressInput = document.getElementById('contract-address') as HTMLInputElement;
    const commitmentInput = document.getElementById('contract-commitment') as HTMLTextAreaElement;
    const periodInput = document.getElementById('contract-period') as HTMLInputElement;
    const goalsInput = document.getElementById('contract-goals') as HTMLTextAreaElement;
    const signatureInput = document.getElementById('contract-signature') as HTMLInputElement;
    const dateInput = document.getElementById('contract-date') as HTMLInputElement;

    if (data) {
        if (nameInput) nameInput.value = data.name || '';
        if (cpfInput) cpfInput.value = data.cpf || '';
        if (birthdateInput) birthdateInput.value = data.birthdate || '';
        if (addressInput) addressInput.value = data.address || '';
        if (commitmentInput) commitmentInput.value = data.commitment || '';
        if (periodInput) periodInput.value = data.period || '';
        if (goalsInput) goalsInput.value = data.goals || '';
        if (signatureInput) signatureInput.value = data.signature || '';
        if (dateInput) dateInput.value = data.date || new Date().toISOString().split('T')[0];
    } else {
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
    }
}

export function printContract() {
    window.print();
}
