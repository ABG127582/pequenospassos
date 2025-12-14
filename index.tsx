// This file is the main entry point for the application.
// It handles initialization, routing, and global helper functions.

import type { GoogleGenAI } from "@google/genai";
import { setupEspiritualPage, showEspiritualPage } from './espiritual';
import { setupPreventivaPage, showPreventivaPage } from './preventiva';
import { setupFisicaPage, showFisicaPage } from './fisica';
import { setupMentalPage, showMentalPage } from './mental';
import { setupFinanceiraPage, showFinanceiraPage } from './financeira';
import { setupFamiliarPage, showFamiliarPage } from './familiar';
import { setupProfissionalPage, showProfissionalPage } from './profissional';
import { setupSocialPage, showSocialPage } from './social';
import { setupPlanejamentoDiarioPage, showPlanejamentoDiarioPage } from './planejamento-diario';
import { setupTarefasPage, showTarefasPage } from './tarefas';
import { setupAlongamentoPage, showAlongamentoPage } from './alongamento';
import { setupInicioPage, showInicioPage } from './inicio';
import DOMPurify from 'dompurify';

// Re-declare the global window interface to inform TypeScript about global functions
// that we are defining and attaching to the window object.
declare global {
    interface Window {
        showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
        saveItems: (storageKey: string, items: any) => void;
        loadItems: (storageKey: string) => any;
        getAISuggestionForInput: (prompt: string, targetInput: HTMLInputElement | HTMLTextAreaElement, button: HTMLButtonElement) => Promise<void>;
        getAITextResponse: (prompt: string, button?: HTMLButtonElement) => Promise<string | null>;
        Chart: any; // Make Chart.js globally available
        openImageViewer: (src: string, alt?: string) => void; // New function
        APP_LOADED: boolean; // Module load safety check
    }
}

// --- Gemini AI Initialization ---
let ai: GoogleGenAI;
// Dynamically imported class constructor
let GoogleGenAIConstructor: any;

// --- Text-to-Speech (TTS) Reader ---
const ttsReader = {
    isSelectionMode: false,
    isSpeaking: false,
    elements: [] as HTMLElement[],
    currentIndex: 0,
    highlightedElement: null as HTMLElement | null,
    keepAliveInterval: undefined as number | undefined,
    ptBrVoice: null as SpeechSynthesisVoice | null,
    textToSpeak: null as string | null,
    speakingSessionId: null as number | null,
    settingsModal: null as HTMLElement | null,
    mainContentListener: null as ((e: MouseEvent) => void) | null,
    
    // User-configurable settings
    voiceURI: null as string | null,
    rate: 1.2,
    pitch: 1.0,
    
    openSettings() {
        if(this.settingsModal) this.settingsModal.style.display = 'flex';
    },

    closeSettings() {
        if(this.settingsModal) this.settingsModal.style.display = 'none';
    },

    init() {
        this.settingsModal = document.getElementById('tts-settings-modal');
        this.loadSettings();

        const findVoiceAndPopulateDropdown = () => {
            const voices = speechSynthesis.getVoices();
            const ptBrVoices = voices.filter(v => v.lang === 'pt-BR');
            const voiceSelect = document.getElementById('tts-voice-select') as HTMLSelectElement;

            if (!voiceSelect) return;
            const currentVal = voiceSelect.value;
            voiceSelect.innerHTML = '';

            if (ptBrVoices.length === 0) {
                voiceSelect.innerHTML = '<option value="">Nenhuma voz em Português encontrada</option>';
                this.ptBrVoice = null;
                return;
            }

            ptBrVoices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.voiceURI;
                option.textContent = `${voice.name} (${voice.lang.replace('-', '_')})`;
                if (voice.localService) option.textContent += ' - Local';
                voiceSelect.appendChild(option);
            });
            
            // Sort voices to find the best default
            const sortedVoices = [...ptBrVoices].sort((a, b) => {
                let scoreA = 0, scoreB = 0;
                if (!a.localService) scoreA += 10;
                if (!b.localService) scoreB += 10;
                if (a.name.includes('Google')) scoreA += 5;
                if (b.name.includes('Google')) scoreB += 5;
                if (a.name.includes('Microsoft')) scoreA += 3;
                if (b.name.includes('Microsoft')) scoreB += 3;
                if (/Luciana|Felipe/i.test(a.name)) scoreA += 3;
                if (/Luciana|Felipe/i.test(b.name)) scoreB += 3;
                if (a.default) scoreA += 1;
                if (b.default) scoreB += 1;
                return scoreB - scoreA;
            });

            const bestVoice = sortedVoices[0] || null;
            const savedVoiceURI = this.voiceURI;
            const preselectedVoice = ptBrVoices.find(v => v.voiceURI === savedVoiceURI) || bestVoice;

            if (preselectedVoice) {
                this.ptBrVoice = preselectedVoice;
                this.voiceURI = preselectedVoice.voiceURI;
                voiceSelect.value = preselectedVoice.voiceURI;
            } else {
                this.ptBrVoice = bestVoice;
                 if(bestVoice) {
                    this.voiceURI = bestVoice.voiceURI;
                    voiceSelect.value = bestVoice.voiceURI;
                 }
            }
        };

        findVoiceAndPopulateDropdown();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = findVoiceAndPopulateDropdown;
        }

        const playBtn = document.getElementById('tts-play-btn');
        const stopBtn = document.getElementById('tts-stop-btn');
        playBtn?.addEventListener('click', () => this.openSettings());
        stopBtn?.addEventListener('click', () => this.stop());
        
        // --- Settings UI Listeners ---
        const settingsCloseBtn = document.getElementById('tts-settings-close-btn');
        const startReadingBtn = document.getElementById('tts-start-reading-btn');
        const voiceSelect = document.getElementById('tts-voice-select') as HTMLSelectElement;
        const rateSlider = document.getElementById('tts-rate-slider') as HTMLInputElement;
        const rateValue = document.getElementById('tts-rate-value') as HTMLSpanElement;
        const pitchSlider = document.getElementById('tts-pitch-slider') as HTMLInputElement;
        const pitchValue = document.getElementById('tts-pitch-value') as HTMLSpanElement;
        const testBtn = document.getElementById('tts-settings-test-btn');

        settingsCloseBtn?.addEventListener('click', () => this.closeSettings());
        startReadingBtn?.addEventListener('click', () => {
            this.closeSettings();
            this.activateSelectionMode();
        });

        voiceSelect?.addEventListener('change', () => {
            this.voiceURI = voiceSelect.value;
            this.ptBrVoice = speechSynthesis.getVoices().find(v => v.voiceURI === this.voiceURI) || this.ptBrVoice;
            this.saveSettings();
        });

        rateSlider?.addEventListener('input', () => {
            this.rate = parseFloat(rateSlider.value);
            if (rateValue) rateValue.textContent = this.rate.toFixed(1);
            this.saveSettings();
        });

        pitchSlider?.addEventListener('input', () => {
            this.pitch = parseFloat(pitchSlider.value);
            if (pitchValue) pitchValue.textContent = this.pitch.toFixed(1);
            this.saveSettings();
        });

        testBtn?.addEventListener('click', () => this.testVoice());
    },

    loadSettings() {
        const saved = window.loadItems('ttsReaderSettings');
        if (saved) {
            this.voiceURI = saved.voiceURI || null;
            this.rate = saved.rate || 1.2;
            this.pitch = saved.pitch || 1.0;
        }
        
        const rateSlider = document.getElementById('tts-rate-slider') as HTMLInputElement;
        const rateValue = document.getElementById('tts-rate-value') as HTMLSpanElement;
        const pitchSlider = document.getElementById('tts-pitch-slider') as HTMLInputElement;
        const pitchValue = document.getElementById('tts-pitch-value') as HTMLSpanElement;

        if (rateSlider) rateSlider.value = String(this.rate);
        if (rateValue) rateValue.textContent = this.rate.toFixed(1);
        if (pitchSlider) pitchSlider.value = String(this.pitch);
        if (pitchValue) pitchValue.textContent = this.pitch.toFixed(1);
    },

    saveSettings() {
        window.saveItems('ttsReaderSettings', {
            voiceURI: this.voiceURI,
            rate: this.rate,
            pitch: this.pitch,
        });
    },
    
    testVoice() {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("Olá, esta é uma amostra da voz e das configurações selecionadas.");
        utterance.lang = 'pt-BR';
        if (this.ptBrVoice) utterance.voice = this.ptBrVoice;
        utterance.rate = this.rate;
        utterance.pitch = this.pitch;
        speechSynthesis.speak(utterance);
    },

    activateSelectionMode() {
        if (this.isSpeaking) return;
        this.isSelectionMode = true;
        document.body.classList.add('tts-selection-mode');
        window.showToast("Clique em um parágrafo para começar a leitura.", 'info');

        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;

        // This is a new, specific listener that only activates when selection mode is on.
        this.mainContentListener = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const interactiveSelector = 'a, button, input, select, textarea, summary, [data-page], [data-page-parent]';
            
            // If the user clicks an interactive element, their intent is no longer to read.
            // Deactivate selection mode and let the event bubble up to the main navigation handler.
            if (target.closest(interactiveSelector)) {
                this.deactivateSelectionMode();
                return;
            }

            // Otherwise, check if it's a readable target.
            const readableTarget = target.closest('p, h1, h2, h3, h4, h5, h6, li, .stretch-card h5, .stretch-card p');

            if (readableTarget) {
                // This is a valid click for the TTS reader. 
                // Prevent it from bubbling up to other handlers and start reading.
                e.preventDefault();
                e.stopPropagation();
                this.startReadingFromElement(readableTarget as HTMLElement);
            } else {
                // If the user clicks on empty space, just cancel selection mode.
                this.deactivateSelectionMode();
            }
        };
        
        // Attach with capture to ensure it runs before the body's bubbling navigation listener.
        mainContent.addEventListener('click', this.mainContentListener, true);
    },

    deactivateSelectionMode() {
        if (!this.isSelectionMode) return; // Prevent redundant calls
        this.isSelectionMode = false;
        document.body.classList.remove('tts-selection-mode');
        
        // Remove the specific listener from the main content area.
        const mainContent = document.getElementById('main-content');
        if (mainContent && this.mainContentListener) {
            mainContent.removeEventListener('click', this.mainContentListener, true);
            this.mainContentListener = null;
        }
    },
    
    startReadingFromElement(readableTarget: HTMLElement) {
        if (this.isSelectionMode) {
            this.deactivateSelectionMode();
        }
        
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;

        const selection = window.getSelection();
        let textToStartWith = readableTarget.innerText.trim();

        if (selection && selection.rangeCount > 0 && selection.toString().length > 1) {
             const range = selection.getRangeAt(0);
             if (readableTarget.contains(range.commonAncestorContainer)) {
                const fullText = readableTarget.innerText;
                const selectedText = selection.toString();
                const startIndex = fullText.indexOf(selectedText);
                if(startIndex !== -1) {
                    textToStartWith = fullText.substring(startIndex).trim();
                }
             }
        }
        
        this.textToSpeak = textToStartWith;
        
        this.elements = Array.from(mainContent.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, .stretch-card h5, .stretch-card p'));
        const clickedIndex = this.elements.indexOf(readableTarget);
        if (clickedIndex !== -1) {
            this.start(clickedIndex);
        }
    },

    start(startIndex: number) {
        if (this.isSpeaking) {
            speechSynthesis.cancel();
        }

        this.isSpeaking = true;
        this.currentIndex = startIndex;
        this.speakingSessionId = Date.now();
        
        const playBtn = document.getElementById('tts-play-btn');
        const stopBtn = document.getElementById('tts-stop-btn');
        if (playBtn) playBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'block';

        this.speakNext();
        this.startKeepAlive();
    },

    stop() {
        if (!this.isSpeaking && !this.isSelectionMode) return;
        
        this.isSpeaking = false;
        this.speakingSessionId = null;
        if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
        
        speechSynthesis.resume();
        speechSynthesis.cancel();
        
        this.cleanupUI();
    },

    cleanupUI() {
        this.deactivateSelectionMode();
        if (this.highlightedElement) {
            this.highlightedElement.classList.remove('tts-reading-highlight');
            this.highlightedElement = null;
        }
        
        const playBtn = document.getElementById('tts-play-btn');
        const stopBtn = document.getElementById('tts-stop-btn');
        if (playBtn) playBtn.style.display = 'block';
        if (stopBtn) stopBtn.style.display = 'none';
    },

    speakNext() {
        const sessionId = this.speakingSessionId;
        if (!this.isSpeaking || this.currentIndex >= this.elements.length || sessionId !== this.speakingSessionId) {
            this.stop();
            return;
        }

        const element = this.elements[this.currentIndex];
        let text: string;

        if (this.textToSpeak) {
            text = this.textToSpeak;
            this.textToSpeak = null;
        } else {
            text = element.innerText.trim();
        }

        if (!text) {
            this.currentIndex++;
            this.speakNext();
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        if (this.ptBrVoice) {
            utterance.voice = this.ptBrVoice;
        }

        utterance.rate = this.rate;
        utterance.pitch = this.pitch;

        utterance.onstart = () => {
            if (sessionId !== this.speakingSessionId) return;
            if (this.highlightedElement) {
                this.highlightedElement.classList.remove('tts-reading-highlight');
            }
            element.classList.add('tts-reading-highlight');
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            this.highlightedElement = element;
        };

        utterance.onend = () => {
            if (sessionId !== this.speakingSessionId) return;
            this.currentIndex++;
            setTimeout(() => this.speakNext(), 500);
        };
        
        utterance.onerror = (event) => {
            if (sessionId !== this.speakingSessionId) return;
            if (event.error === 'interrupted') {
                return;
            }
            console.error("Speech synthesis error:", event.error);
            window.showToast("Ocorreu um erro na leitura.", "error");
            this.stop();
        };

        speechSynthesis.speak(utterance);
    },
    
    startKeepAlive() {
        if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = setInterval(() => {
            if (speechSynthesis.speaking) {
                speechSynthesis.resume();
            } else if (!this.isSpeaking) {
                 clearInterval(this.keepAliveInterval);
            }
        }, 10000);
    }
};

// --- Contract Modal Logic ---
interface ContractData {
    name: string;
    cpf: string;
    birthdate: string;
    address: string;
    commitment: string;
    period: string;
    goals: string;
    signature: string;
    date: string;
}

const CONTRACT_STORAGE_KEY = 'userContractData';

function loadContract() {
    const data: ContractData | null = window.loadItems(CONTRACT_STORAGE_KEY);
    if (data) {
        (document.getElementById('contract-name') as HTMLInputElement).value = data.name || '';
        (document.getElementById('contract-cpf') as HTMLInputElement).value = data.cpf || '';
        (document.getElementById('contract-birthdate') as HTMLInputElement).value = data.birthdate || '';
        (document.getElementById('contract-address') as HTMLInputElement).value = data.address || '';
        (document.getElementById('contract-commitment') as HTMLTextAreaElement).value = data.commitment || '';
        (document.getElementById('contract-period') as HTMLInputElement).value = data.period || '';
        (document.getElementById('contract-goals') as HTMLTextAreaElement).value = data.goals || '';
        (document.getElementById('contract-signature') as HTMLInputElement).value = data.signature || '';
        (document.getElementById('contract-date') as HTMLInputElement).value = data.date || '';
    }
}

function saveContract() {
    const data: ContractData = {
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

    if (!data.name || !data.signature || !data.date) {
        window.showToast('Por favor, preencha pelo menos seu nome, a assinatura e a data.', 'warning');
        return;
    }

    window.saveItems(CONTRACT_STORAGE_KEY, data);
    window.showToast('Contrato salvo com sucesso!', 'success');
    closeContractModal();
}

function printContract() {
    const form = document.getElementById('contract-form') as HTMLFormElement;
    if (!form) return;
    
    // Create print-only spans with content for better formatting
    const inputs = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
    inputs.forEach(input => {
        let displaySpan = input.nextElementSibling as HTMLElement;
        if (!displaySpan || !displaySpan.classList.contains('print-only-value')) {
            displaySpan = document.createElement('span');
            displaySpan.className = 'print-only-value';
            input.parentNode?.insertBefore(displaySpan, input.nextSibling);
        }

        if (input.type === 'date' && input.value) {
            displaySpan.textContent = new Date(input.value + 'T00:00:00').toLocaleDateString('pt-BR');
        } else {
            displaySpan.textContent = input.value;
        }
    });
    
    document.body.classList.add('printing-contract');
    window.print();
    document.body.classList.remove('printing-contract');
}

function openContractModal() {
    const modal = document.getElementById('contract-modal');
    if (modal) {
        loadContract();
        modal.style.display = 'flex';
    }
}

function closeContractModal() {
    const modal = document.getElementById('contract-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// --- Image Viewer Modal Logic ---
function setupImageViewerModal() {
    const modal = document.getElementById('image-viewer-modal');
    const imgEl = document.getElementById('image-viewer-img') as HTMLImageElement;
    const closeBtn = document.getElementById('image-viewer-close-btn');

    const close = () => {
        if (modal) modal.style.display = 'none';
        if (imgEl) {
            imgEl.src = ''; // Clear src to avoid showing old image briefly on next open
            imgEl.alt = '';
        }
    };

    closeBtn?.addEventListener('click', close);
    modal?.addEventListener('click', (e) => {
        // Close if clicking on the background overlay
        if (e.target === modal) {
            close();
        }
    });

    // Make the function globally available
    window.openImageViewer = (src: string, alt: string = 'Imagem ampliada') => {
        if (modal && imgEl) {
            imgEl.src = src;
            imgEl.alt = alt;
            modal.style.display = 'flex';
        }
    };
}


// --- Page Hierarchy for Breadcrumbs and Active State ---
const pageHierarchy: { [key: string]: { parent: string | null; title: string } } = {
    'inicio': { parent: null, title: 'Início' },
    'fisica': { parent: 'inicio', title: 'Saúde Física' },
    'leitura-guia-fisica': { parent: 'fisica', title: 'Guia de Leitura' },
    'alongamento': { parent: 'fisica', title: 'Guia de Alongamento' },
    'alimentacao-forte': { parent: 'fisica', title: 'Guia de Alimentação Forte' },
    'mental': { parent: 'inicio', title: 'Saúde Mental' },
    'leitura-guia-mental': { parent: 'mental', title: 'Guia de Leitura' },
    'pdca-mental-autoregulacao': { parent: 'mental', title: 'Termômetro das Emoções' },
    'pdca-mental-resiliencia': { parent: 'mental', title: 'Desenvolvimento da Resiliência' },
    'pdca-mental-gestao-estresse-ansiedade': { parent: 'mental', title: 'Gestão do Estresse' },
    'pdca-mental-mindfulness': { parent: 'mental', title: 'Atenção Plena' },
    'pdca-mental-organizacao-tarefas': { parent: 'mental', title: 'Organização de Tarefas' },
    'pdca-mental-reducao-distracoes': { parent: 'mental', title: 'Redução de Distrações' },
    'pdca-mental-busca-proposito': { parent: 'mental', title: 'Busca por Propósito' },
    'pdca-mental-autocuidado': { parent: 'mental', title: 'Autocuidado' },
    'pdca-mental-granularidade': { parent: 'mental', title: 'Granularidade Emocional' },
    'pdca-mental-dicotomia': { parent: 'mental', title: 'Dicotomia do Controle' },
    'financeira': { parent: 'inicio', title: 'Saúde Financeira' },
    'leitura-guia-financeira': { parent: 'financeira', title: 'Guia de Leitura' },
    'planejamento-trocas': { parent: 'financeira', title: 'Planejamento de Trocas de Bens' },
    'familiar': { parent: 'inicio', title: 'Saúde Familiar' },
    'leitura-guia-familiar': { parent: 'familiar', title: 'Guia de Leitura' },
    'profissional': { parent: 'inicio', title: 'Saúde Profissional' },
    'social': { parent: 'inicio', title: 'Saúde Social' },
    'espiritual': { parent: 'inicio', title: 'Saúde Espiritual' },
    'leitura-guia-espiritual': { parent: 'espiritual', title: 'Guia de Leitura' },
    'preventiva': { parent: 'inicio', title: 'Saúde Preventiva' },
    'planejamento-diario': { parent: 'inicio', title: 'Planejamento Diário' },
    'tarefas': { parent: 'inicio', title: 'Lista de Tarefas' },
    'jejum-verde': { parent: 'fisica', title: 'Jejum Verde' },
    'food-gengibre': { parent: 'fisica', title: 'Gengibre' },
    'food-alho': { parent: 'fisica', title: 'Alho' },
    'food-brocolis': { parent: 'fisica', title: 'Brócolis' },
    'food-couveflor': { parent: 'fisica', title: 'Couve-flor' },
    'food-shitake': { parent: 'fisica', title: 'Shitake' },
    'food-lentilha': { parent: 'fisica', title: 'Lentilha' },
    'food-azeite': { parent: 'fisica', title: 'Azeite' },
    'food-morango': { parent: 'fisica', title: 'Morango' },
    'food-laranja': { parent: 'fisica', title: 'Laranja' },
    'food-maca': { parent: 'fisica', title: 'Maçã' },
    'food-cenoura': { parent: 'fisica', title: 'Cenoura' },
    'food-pimenta': { parent: 'fisica', title: 'Pimenta' },
    'food-ovo': { parent: 'fisica', title: 'Ovo' },
    'food-vinagremaca': { parent: 'fisica', title: 'Vinagre de Maçã' },
    'food-whey': { parent: 'fisica', title: 'Whey Protein' },
    'food-creatina': { parent: 'fisica', title: 'Creatina' },
    'food-curcuma': { parent: 'fisica', title: 'Cúrcuma' },
    'food-chaverde': { parent: 'fisica', title: 'Chá Verde' },
    'food-canela': { parent: 'fisica', title: 'Canela' },
    'food-linhaca': { parent: 'fisica', title: 'Linhaça' },
    'food-couve': { parent: 'fisica', title: 'Couve' },
    'food-rucula': { parent: 'fisica', title: 'Rúcula' },
    'food-agriao': { parent: 'fisica', title: 'Agrião' },
    'food-espinafre': { parent: 'fisica', title: 'Espinafre' },
    'food-folhasbeterraba': { parent: 'fisica', title: 'Folhas de Beterraba' },
    'food-almeirao': { parent: 'fisica', title: 'Almeirão' },
    'food-denteleao': { parent: 'fisica', title: 'Dente-de-Leão' },
};


function updateBreadcrumbs(pageKey: string) {
    const nav = document.getElementById('breadcrumb-nav');
    if (!nav) return;

    if (pageKey === 'inicio' || !pageHierarchy[pageKey]) {
        nav.innerHTML = '';
        return;
    }

    const trail: { key: string; title: string }[] = [];
    let currentKey: string | null = pageKey;

    while (currentKey && pageHierarchy[currentKey]) {
        trail.unshift({ key: currentKey, title: pageHierarchy[currentKey].title });
        currentKey = pageHierarchy[currentKey].parent;
    }
    
    const ol = document.createElement('ol');
    trail.forEach((item, index) => {
        const li = document.createElement('li');
        if (index === trail.length - 1) {
            li.textContent = item.title;
            li.setAttribute('aria-current', 'page');
            li.className = 'breadcrumb-current';
        } else {
            const a = document.createElement('a');
            a.href = `#${item.key}`;
            a.dataset.page = item.key;
            a.textContent = item.title;
            li.appendChild(a);
        }
        ol.appendChild(li);
    });

    nav.innerHTML = '';
    nav.appendChild(ol);
}

function updateActiveNav(pageKey: string) {
    const navLinks = document.querySelectorAll<HTMLElement>('.sidebar-links a');
    const navSummaries = document.querySelectorAll<HTMLElement>('.sidebar-links summary');

    navLinks.forEach(link => link.classList.remove('active'));
    navSummaries.forEach(summary => summary.classList.remove('active'));

    const activeLink = document.querySelector(`.sidebar-links a[href="#${pageKey}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
        const parentDetails = activeLink.closest('details');
        if (parentDetails) {
            const parentSummary = parentDetails.querySelector('summary');
            parentSummary?.classList.add('active');
            if (!parentDetails.open) {
                parentDetails.open = true;
            }
        }
    } else {
        const hierarchy = pageHierarchy[pageKey];
        if (hierarchy && hierarchy.parent) {
            const parentSummary = document.querySelector(`summary[data-page-parent="${hierarchy.parent}"]`) as HTMLElement;
            if (parentSummary) {
                parentSummary.classList.add('active');
                const parentDetails = parentSummary.closest('details');
                if (parentDetails && !parentDetails.open) {
                    parentDetails.open = true;
                }
            }
        }
    }
}


// --- Global Helper Functions ---

/**
 * Displays a toast notification.
 * @param message The message to display.
 * @param type The type of toast (info, success, warning, error).
 */
function showToast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const toastContainer = document.getElementById('toast-notification-container');
    if (!toastContainer) {
        console.warn('Toast container not found.');
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 5000);
}

/**
 * Saves items to localStorage.
 * @param storageKey The key to save under.
 * @param items The items to save.
 */
function saveItems(storageKey: string, items: any): void {
    try {
        localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (error) {
        console.error(`Error saving to localStorage with key "${storageKey}":`, error);
        showToast('Não foi possível salvar os dados.', 'error');
    }
}

/**
 * Loads items from localStorage.
 * @param storageKey The key to load from.
 * @returns The parsed items or null if not found or on error.
 */
function loadItems(storageKey: string): any {
    try {
        const items = localStorage.getItem(storageKey);
        return items ? JSON.parse(items) : null;
    } catch (error) {
        console.error(`Error loading from localStorage with key "${storageKey}":`, error);
        showToast('Não foi possível carregar os dados.', 'error');
        return null;
    }
}


/**
 * Gets an AI suggestion for an input field using the Gemini API.
 * @param prompt The prompt to send to the AI.
 * @param targetInput The input element to populate with the suggestion.
 * @param button The button that triggered the action, used for loading state.
 */
async function getAISuggestionForInput(prompt: string, targetInput: HTMLInputElement | HTMLTextAreaElement, button: HTMLButtonElement): Promise<void> {
    if (!ai) {
        showToast("AI service is not available due to configuration error.", 'error');
        return;
    }

    const originalButtonContent = button.innerHTML;
    button.classList.add('loading');
    button.disabled = true;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
        });

        const suggestion = response.text;
        
        if (suggestion) {
            targetInput.value = suggestion.trim();
            targetInput.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            showToast('A IA não retornou uma sugestão.', 'warning');
        }
    } catch (error) {
        console.error('Error getting AI suggestion:', error);
        showToast('Ocorreu um erro ao obter a sugestão da IA.', 'error');
    } finally {
        button.innerHTML = originalButtonContent;
        button.classList.remove('loading');
        button.disabled = false;
    }
}

/**
 * Gets a text-only response from the Gemini API.
 * @param prompt The prompt to send to the AI.
 * @param button Optional button to show a loading state on.
 * @returns The AI-generated text or null on error.
 */
async function getAITextResponse(prompt: string, button?: HTMLButtonElement): Promise<string | null> {
    if (!ai) {
        showToast("AI service is not available due to configuration error.", 'error');
        return null;
    }

    let originalButtonContent: string | undefined;
    if (button) {
        originalButtonContent = button.innerHTML;
        button.classList.add('loading');
        button.disabled = true;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
        });
        const text = response.text;
        return text.trim();
    } catch (error) {
        console.error('Error getting AI text response:', error);
        showToast('Ocorreu um erro ao obter a resposta da IA.', 'error');
        return null;
    } finally {
        if (button && originalButtonContent) {
            button.innerHTML = originalButtonContent;
            button.classList.remove('loading');
            button.disabled = false;
        }
    }
}

// --- App Initialization & Routing ---

// Map page keys to their setup/show functions for a cleaner router
const pageModules: { [key: string]: { setup: () => void; show: () => void; } } = {
    'espiritual': { setup: setupEspiritualPage, show: showEspiritualPage },
    'preventiva': { setup: setupPreventivaPage, show: showPreventivaPage },
    'fisica': { setup: setupFisicaPage, show: showFisicaPage },
    'mental': { setup: setupMentalPage, show: showMentalPage },
    'financeira': { setup: setupFinanceiraPage, show: showFinanceiraPage },
    'familiar': { setup: setupFamiliarPage, show: showFamiliarPage },
    'profissional': { setup: setupProfissionalPage, show: showProfissionalPage },
    'social': { setup: setupSocialPage, show: showSocialPage },
    'planejamento-diario': { setup: setupPlanejamentoDiarioPage, show: showPlanejamentoDiarioPage },
    'tarefas': { setup: setupTarefasPage, show: showTarefasPage },
    'alongamento': { setup: setupAlongamentoPage, show: showAlongamentoPage },
    'inicio': { setup: setupInicioPage, show: showInicioPage },
};


document.addEventListener('DOMContentLoaded', async () => {
    // Mark app as loaded to prevent safety timeout
    window.APP_LOADED = true;

    // Initialize the Gemini AI SDK via Dynamic Import.
    // This prevents the entire app from crashing if the library has load-time side effects.
    try {
        const module = await import("@google/genai");
        GoogleGenAIConstructor = module.GoogleGenAI;
        const apiKey = process.env.API_KEY;
        if (apiKey && GoogleGenAIConstructor) {
             ai = new GoogleGenAIConstructor({ apiKey });
        }
    } catch (error) {
        console.error("Failed to initialize GoogleGenAI. AI features will be disabled.", error);
    }

    // Make global helpers available on the window object
    window.showToast = showToast;
    window.saveItems = saveItems;
    window.loadItems = loadItems;
    window.getAISuggestionForInput = getAISuggestionForInput;
    window.getAITextResponse = getAITextResponse;
    
    const sidebar = document.getElementById('sidebar-menu');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const detailsElements = document.querySelectorAll<HTMLDetailsElement>('.sidebar-links details');
    const pageContentWrapper = document.getElementById('page-content-wrapper');

    // --- Initialize TTS Reader ---
    ttsReader.init();

    // --- Initialize Image Viewer ---
    setupImageViewerModal();

    // --- NEW, SIMPLIFIED GLOBAL NAVIGATION HANDLER (Bubbling Phase) ---
    document.body.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;

        // If TTS selection mode is active, its specific handler (on #main-content) runs first.
        // This body handler will only catch events that bubble up (i.e., navigation clicks).

        // Handle contract modal links
        if (target.closest('#open-contract-sidebar') || target.closest('#open-contract-home')) {
            e.preventDefault();
            openContractModal();
            return;
        }

        // Handle standard page navigation
        const pageLink = target.closest<HTMLElement>('button[data-page], a[data-page]');
        if (pageLink && pageLink.dataset.page) {
            e.preventDefault();
            ttsReader.stop(); // Stop any ongoing speech before navigating
            window.location.hash = pageLink.dataset.page;
            // The 'hashchange' event listener will trigger the router
        }
    });


    // --- Contract Modal Setup ---
    const contractModal = document.getElementById('contract-modal');
    const closeContractBtn = document.getElementById('contract-modal-close-btn');
    const cancelContractBtn = document.getElementById('contract-modal-cancel-btn');
    const saveContractBtn = document.getElementById('contract-modal-save-btn');
    const printContractBtn = document.getElementById('contract-modal-print-btn');
    const commitmentAIBtn = document.getElementById('contract-commitment-ai-btn');
    const goalsAIBtn = document.getElementById('contract-goals-ai-btn');

    closeContractBtn?.addEventListener('click', closeContractModal);
    cancelContractBtn?.addEventListener('click', closeContractModal);
    saveContractBtn?.addEventListener('click', saveContract);
    printContractBtn?.addEventListener('click', printContract);

    contractModal?.addEventListener('click', (e) => {
        if (e.target === contractModal) {
            closeContractModal();
        }
    });

    commitmentAIBtn?.addEventListener('click', () => {
        const prompt = "Sugira um parágrafo de compromisso pessoal para um contrato de autocuidado, focando em paciência, consistência e celebração de pequenas vitórias.";
        const target = document.getElementById('contract-commitment') as HTMLTextAreaElement;
        window.getAISuggestionForInput(prompt, target, commitmentAIBtn as HTMLButtonElement);
    });

    goalsAIBtn?.addEventListener('click', () => {
        const prompt = "Sugira 3 metas SMART (Específicas, Mensuráveis, Atingíveis, Relevantes, Temporais) para um contrato de desenvolvimento pessoal, cobrindo saúde física, financeira e mental. Formate como uma lista numerada.";
        const target = document.getElementById('contract-goals') as HTMLTextAreaElement;
        window.getAISuggestionForInput(prompt, target, goalsAIBtn as HTMLButtonElement);
    });

    // --- Sidebar State Persistence ---
    const restoreMenuState = () => {
        detailsElements.forEach(details => {
            if (details.id && localStorage.getItem(details.id) === 'open') {
                details.open = true;
            }
        });
    };

    const setupMenuStatePersistence = () => {
        detailsElements.forEach(details => {
            details.addEventListener('toggle', () => {
                if (details.id) {
                    localStorage.setItem(details.id, details.open ? 'open' : 'closed');
                }
            });
        });
    };
    
    const pageCache: { [key: string]: string } = {};

    const router = async () => {
        ttsReader.stop();
        const hash = window.location.hash.substring(1) || 'inicio';
    
        let pageToLoad = 'inicio';
        let anchorId: string | null = null;
    
        // FIX: New, more robust logic to determine the page to load vs. an anchor.
        // This prevents misidentifying main pages as anchors on the home page.
        
        // 1. Is it a known page with a module (e.g., 'fisica', 'tarefas')?
        if (pageModules[hash]) {
            pageToLoad = hash;
        } 
        // 2. Is it a static content page with a specific pattern?
        else if (hash.startsWith('leitura-guia-') || hash.startsWith('food-') || hash === 'jejum-verde' || hash === 'alimentacao-forte') {
            pageToLoad = hash;
        } 
        // 3. If not a direct page, assume it's an anchor within another page.
        else {
            const hierarchyEntry = pageHierarchy[hash];
            if (hierarchyEntry && hierarchyEntry.parent) {
                // It's a known anchor. Load its parent page.
                pageToLoad = hierarchyEntry.parent;
                anchorId = hash;
            } else {
                // Fallback for unknown hashes.
                console.warn(`Hash "${hash}" not found or has no parent. Defaulting to inicio.`);
                pageToLoad = 'inicio';
            }
        }
    
        // Handle breadcrumbs and active nav state
        const navKeyForStyle = pageToLoad.startsWith('food-') ? 'fisica' : pageToLoad;
        updateBreadcrumbs(hash); // Breadcrumbs are based on the full hash/trail
        updateActiveNav(navKeyForStyle); // Active sidebar item is based on the loaded page
    
        if (!pageContentWrapper) {
            console.error('#page-content-wrapper not found!');
            return;
        }
    
        pageContentWrapper.innerHTML = '<p style="text-align:center; padding: 40px;">Carregando...</p>';
    
        try {
            let pageHtml = pageCache[pageToLoad];
            if (!pageHtml) {
                // Add timestamp to prevent caching of HTML fragments during development/updates
                const response = await fetch(`${pageToLoad}.html?v=${new Date().getTime()}`);
                if (!response.ok) {
                    throw new Error(`Page not found: ${pageToLoad}.html (Status: ${response.status})`);
                }
                pageHtml = await response.text();
                pageCache[pageToLoad] = pageHtml;
            }
    
            pageContentWrapper.innerHTML = DOMPurify.sanitize(pageHtml, {
                ADD_ATTR: ['target', 'data-page', 'data-page-parent', 'aria-label', 'aria-expanded', 'aria-controls']
            });
    
            // Call setup and show for the newly loaded page
            const pageModule = pageModules[pageToLoad];
            if (pageModule) {
                pageModule.setup();
                pageModule.show();
            } else if (pageToLoad.startsWith('food-') || pageToLoad.startsWith('leitura-guia-')) {
                // No specific setup needed for static content pages
            }
    
            // Scroll to anchor if it exists, after a short delay for rendering
            if (anchorId) {
                setTimeout(() => {
                    const element = document.getElementById(anchorId);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        // Highlight effect for better UX
                        const pageContainer = document.querySelector('#page-content-wrapper > .page-section, #page-content-wrapper > .page-container');
                        const sectionColorRgb = pageContainer ? getComputedStyle(pageContainer).getPropertyValue('--section-color-rgb').trim() : '0, 123, 255';
                        
                        element.style.transition = 'background-color 0.7s ease';
                        element.style.backgroundColor = `rgba(${sectionColorRgb || '0, 123, 255'}, 0.1)`;
                        setTimeout(() => {
                            element.style.backgroundColor = '';
                        }, 1500);
                    }
                }, 100);
            } else {
                pageContentWrapper.scrollTo(0, 0);
            }
    
        } catch (error) {
            console.error('Error loading page:', error);
            pageContentWrapper.innerHTML = `<div class="content-section" style="text-align: center;"><h2>Página não encontrada</h2><p>Ocorreu um erro ao carregar o conteúdo. Por favor, tente novamente.</p></div>`;
            updateBreadcrumbs('inicio');
            updateActiveNav('inicio');
        }
    };

    window.addEventListener('hashchange', router);
    window.addEventListener('popstate', router);
    
    // --- Initial App Setup ---
    
    restoreMenuState();
    setupMenuStatePersistence();
    router(); // Handle initial page load

    sidebarToggle?.addEventListener('click', () => {
        const isCollapsed = sidebar?.classList.toggle('collapsed');
        document.body.classList.toggle('sidebar-collapsed', isCollapsed);
        sidebarToggle.setAttribute('aria-expanded', String(!isCollapsed));
    });

    // When the sidebar is collapsed, clicking a category summary should navigate directly.
    const navSummaries = document.querySelectorAll<HTMLElement>('.sidebar-links summary[data-page-parent]');
    navSummaries.forEach(summary => {
        summary.addEventListener('click', (e) => {
            if (sidebar?.classList.contains('collapsed')) {
                e.preventDefault();
                const pageKey = summary.dataset.pageParent;
                if (pageKey) {
                    window.location.hash = pageKey;
                }
            }
        });
    });

    // Default sidebar state to collapsed
    sidebar?.classList.add('collapsed');
    document.body.classList.add('sidebar-collapsed');
    sidebarToggle?.setAttribute('aria-expanded', 'false');

    // --- Theme Toggle ---
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-toggle-icon');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (theme: 'dark' | 'light') => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark-mode');
            themeIcon?.classList.remove('fa-moon');
            themeIcon?.classList.add('fa-sun');
            themeToggle?.setAttribute('aria-label', 'Alternar para modo claro');
        } else {
            document.documentElement.classList.remove('dark-mode');
            themeIcon?.classList.remove('fa-sun');
            themeIcon?.classList.add('fa-moon');
            themeToggle?.setAttribute('aria-label', 'Alternar para modo escuro');
        }
    };

    const savedTheme = localStorage.getItem('theme');
    // Apply saved theme or system preference
    if (savedTheme === 'dark' || (!savedTheme && prefersDark.matches)) {
        applyTheme('dark');
    } else {
        applyTheme('light');
    }

    themeToggle?.addEventListener('click', () => {
        const isDark = document.documentElement.classList.contains('dark-mode');
        if (isDark) {
            applyTheme('light');
            localStorage.setItem('theme', 'light');
        } else {
            applyTheme('dark');
            localStorage.setItem('theme', 'dark');
        }
    });

    // --- Rain Sound ---
    const rainSoundToggle = document.getElementById('rain-sound-toggle');
    const rainSound = document.getElementById('rain-sound') as HTMLAudioElement;

    rainSoundToggle?.addEventListener('click', () => {
        if (!rainSound) return;
        if (rainSound.paused) {
            const playPromise = rainSound.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    // Playback has started.
                    rainSoundToggle.classList.add('playing');
                    rainSoundToggle.setAttribute('aria-label', 'Pausar som de chuva');
                }).catch(error => {
                    console.error("Error playing sound:", error);
                    // Handle interruption or loading errors gracefully.
                    if (error.name !== 'AbortError') { // Don't show toast if user intentionally paused.
                        window.showToast('Não foi possível tocar o som.', 'error');
                    }
                    rainSoundToggle.classList.remove('playing');
                    rainSoundToggle.setAttribute('aria-label', 'Tocar som de chuva');
                });
            }
        } else {
            rainSound.pause();
            rainSoundToggle.classList.remove('playing');
            rainSoundToggle.setAttribute('aria-label', 'Tocar som de chuva');
        }
    });
});