import { getAISuggestionForInput } from '../api/gemini';

export const addAIButtonListener = (buttonId: string, inputId: string, prompt: string | (() => string)) => {
    const button = document.getElementById(buttonId) as HTMLButtonElement;
    const input = document.getElementById(inputId) as HTMLInputElement | HTMLTextAreaElement;
    if (button && input) {
        button.addEventListener('click', () => {
            const finalPrompt = typeof prompt === 'function' ? prompt() : prompt;
            getAISuggestionForInput(finalPrompt, input, button);
        });
    }
};
