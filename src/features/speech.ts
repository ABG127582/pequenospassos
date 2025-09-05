import { showToast } from './ui';

let currentListeningInputId: string | null = null;
let recognitionInstance: any | null = null;
let recognitionTimeout: number | undefined;

export function stopChattiListening() {
    if (recognitionInstance) {
        recognitionInstance.stop();
    }
}

export function updateChattiMicButtonState(isListening: boolean, button: HTMLElement | null = null) {
    const micButton = button || (currentListeningInputId ? document.querySelector(`[data-mic-for="${currentListeningInputId}"]`) : null);
    if (micButton) {
        micButton.classList.toggle('listening', isListening);
        const icon = micButton.querySelector('i');
        if (icon) {
            icon.className = isListening ? 'fas fa-microphone-slash' : 'fas fa-microphone';
        }
    }
}

export function startFieldListening(targetInputId: string, micButtonId: string) {
    if (recognitionInstance) {
        stopChattiListening();
        return;
    }

    // Speech Recognition API is only available in secure contexts (HTTPS or localhost)
    if (!window.isSecureContext) {
        showToast("O reconhecimento de voz requer uma conexão segura (HTTPS).", "error");
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        showToast("Reconhecimento de voz não é suportado neste navegador.", "warning");
        return;
    }

    const targetInput = document.getElementById(targetInputId) as HTMLInputElement | HTMLTextAreaElement;
    if (!targetInput) return;

    const micButton = document.getElementById(micButtonId);

    currentListeningInputId = targetInputId;
    recognitionInstance = new SpeechRecognition();
    recognitionInstance.lang = 'pt-BR';
    recognitionInstance.interimResults = true;
    recognitionInstance.continuous = true;

    let finalTranscript = targetInput.value ? targetInput.value + ' ' : '';

    recognitionInstance.onstart = () => {
        updateChattiMicButtonState(true, micButton);
        recognitionTimeout = window.setTimeout(() => {
            if(recognitionInstance) {
                recognitionInstance.stop();
            }
        }, 15000);
    };

    recognitionInstance.onresult = (event: any) => {
        clearTimeout(recognitionTimeout);
        recognitionTimeout = window.setTimeout(() => {
            if(recognitionInstance) {
                recognitionInstance.stop();
            }
        }, 5000);

        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        targetInput.value = finalTranscript + interimTranscript;
    };

    recognitionInstance.onend = () => {
        targetInput.value = finalTranscript.trim();
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
        updateChattiMicButtonState(false, micButton);
        clearTimeout(recognitionTimeout);
        recognitionInstance = null;
        currentListeningInputId = null;
    };

    recognitionInstance.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error !== 'no-speech') {
            showToast(`Erro no reconhecimento de voz: ${event.error}`, "error");
        }
        clearTimeout(recognitionTimeout);
        if (recognitionInstance) recognitionInstance.stop();
    };

    recognitionInstance.start();
}

export function addMicButtonTo(wrapperSelector: string, targetInputId: string, sectionSpecificClass = '') {
    const wrapper = document.querySelector(wrapperSelector) as HTMLElement;
    const targetInput = document.getElementById(targetInputId) as HTMLElement;

    if (!wrapper || !targetInput || wrapper.querySelector('.mic-button')) {
        return;
    }

    const micButtonId = `mic-btn-${targetInputId}`;
    const micButton = document.createElement('button');
    micButton.type = 'button';
    micButton.id = micButtonId;
    micButton.className = `mic-button ${sectionSpecificClass}`;
    micButton.setAttribute('aria-label', `Ditar para ${targetInput.getAttribute('placeholder') || 'campo'}`);
    micButton.dataset.micFor = targetInputId;
    micButton.innerHTML = '<i class="fas fa-microphone"></i>';

    micButton.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentListeningInputId === targetInputId) {
             stopChattiListening();
        } else if (currentListeningInputId !== null) {
            stopChattiListening();
            setTimeout(() => startFieldListening(targetInputId, micButtonId), 200);
        } else {
            startFieldListening(targetInputId, micButtonId);
        }
    });

    wrapper.appendChild(micButton);
}
