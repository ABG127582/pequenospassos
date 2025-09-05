import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Define types for items to avoid 'any'
export interface GoalItem {
    text: string;
    completed: boolean;
}

export interface ActivityPracticeItem {
    name: string;
    duration?: string;
    completed: boolean;
}

export type GenericItem = GoalItem | ActivityPracticeItem;

export interface ListManagementConfig {
    sectionKey: string;
    storageKey: string;
    listId: string;
    formId: string;
    textInputId?: string;
    nameInputId?: string;
    durationInputId?: string;
    itemType: 'goal' | 'activity';
    fields?: string[];
}

export interface DailyTask {
    id: string;
    time: string;
    description: string;
    intention: string;
    isMIT: boolean;
    status: 'pending' | 'in-progress' | 'completed';
}

export interface DailyPlan {
    date: string;
    tasks: DailyTask[];
    reflection: string;
    hideCompleted: boolean;
}

export interface IndicatorConfig {
    id: string;
    name: string;
    unit: string;
    barMin: number;
    barMax: number;
    optimalMin: number;
    optimalMax: number;
    reversedGradient?: boolean;
    zones: {
        min: number;
        max: number;
        label: string;
        colorClass: string;
    }[];
}

export interface DiagnosticConfig {
    id: string;
    name: string;
    hasType?: boolean;
    hasSeverity?: boolean;
}


// Extend the Window interface for global functions and properties
declare global {
    interface Window {
        ai: GoogleGenAI;
        process: {
            env: {
                API_KEY?: string;
            }
        };
        showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
        saveItems: (storageKey: string, items: any) => void;
        loadItems: (storageKey: string) => any;
        showPage: (pageId: string, isInitialLoad?: boolean) => Promise<void>;
        toggleSidebar: (initialize?: boolean) => void;
        updateRainSoundButtonPosition: () => void;
        loadVaccineData: () => void;
        saveVaccineData: () => void;
        calculateNextDose: (lastDose: string, intervalYears?: number, intervalMonths?: number, isAnnual?: boolean) => string;
        updateVaccineStatus: (rowOrId: HTMLElement | string) => void;
        getIndicatorById: (id: string) => IndicatorConfig | undefined;
        getDiagnosticById: (id: string) => DiagnosticConfig | undefined;
        saveIndicatorData: (indicatorId: string, value: number, date: string) => void;
        loadIndicatorData: (indicatorId: string) => { value: number; date: string } | null;
        saveAllIndicatorData: () => void;
        loadAllIndicatorData: () => void;
        updateIndicatorUI: (config: IndicatorConfig, value: number | null, date: string | null) => void;
        saveDiagnosticData: () => void;
        loadDiagnosticData: () => void;
        logIndicatorEntry: (indicatorId: string, value: number, date: string, status: string) => void;
        updateIndicatorHistoryTable: () => void;
        updateThemeToggleButtonIcon: (isDark: boolean) => void;
        loadTheme: () => void;
        toggleRainSound: () => void;
        setupListManagement: (config: ListManagementConfig) => void;
        openContractModal: () => void;
        closeContractModal: () => void;
        saveContractData: () => void;
        loadContractData: () => any;
        populateContractModal: () => void;
        printContract: () => void;
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
        stopChattiListening: () => void;
        updateChattiMicButtonState: (isListening: boolean, button?: HTMLElement | null) => void;
        startFieldListening: (targetInputId: string, micButtonId: string) => void;
        addMicButtonTo: (wrapperSelector: string, targetInputId: string, sectionSpecificClass?: string) => void;
        initFisicaPage: () => void;
        initMentalPage: () => void;
        initFinanceiraPage: () => void;
        initFamiliarPage: () => void;
        initProfissionalPage: () => void;
        initSocialPage: () => void;
        initEspiritualPage: () => void;
        printDailyPlan: () => void;
        initPlanejamentoDiarioPage: () => void;
        initPreventivaPage: () => void;
        initTarefasPage: () => void;
        initInicioPage: () => void;
        generateAndDisplayWebResources: (button: HTMLElement, loadingEl: HTMLElement, outputEl: HTMLElement, prompt: string) => Promise<void>;
        getAISuggestionForInput: (prompt: string, targetInput: HTMLInputElement | HTMLTextAreaElement, button: HTMLButtonElement) => Promise<void>;
    }
}
