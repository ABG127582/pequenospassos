import { GenerateContentResponse } from "@google/genai";
import { showToast } from '../features/ui';

declare var DOMPurify: any;

async function getAISuggestionForInput(prompt: string, targetInput: HTMLInputElement | HTMLTextAreaElement, button: HTMLButtonElement): Promise<void> {
    if (!window.ai) {
        showToast("Funcionalidade de IA não está disponível. Verifique a chave da API.", "error");
        return;
    }

    button.classList.add('loading');
    button.disabled = true;
    targetInput.disabled = true;

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const response: GenerateContentResponse = await window.ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
            });

            const suggestion = response.text.trim();
            targetInput.value = suggestion;
            targetInput.dispatchEvent(new Event('input', { bubbles: true }));

            if (targetInput.tagName === 'TEXTAREA' && (targetInput.style.height || targetInput.scrollHeight > targetInput.clientHeight)) {
                targetInput.style.height = 'auto';
                targetInput.style.height = `${targetInput.scrollHeight}px`;
            }

            // Success, break the loop
            break;

        } catch (error: any) {
            attempt++;
            console.error(`Attempt ${attempt} failed for AI suggestion:`, error);

            // Do not retry for specific client-side errors like invalid API key
            const errorMessage = error.message || '';
            if (errorMessage.includes('API key not valid') || errorMessage.includes('403') || errorMessage.includes('400')) {
                showToast("Chave de API inválida ou requisição incorreta.", "error");
                break; // Stop retrying for these errors
            }

            if (attempt >= maxRetries) {
                showToast("Ocorreu um erro ao buscar a sugestão após várias tentativas.", "error");
            } else {
                const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
                showToast(`Falha na comunicação com a IA. Tentando novamente em ${delay / 1000}s...`, "warning");
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }

    button.classList.remove('loading');
    button.disabled = false;
    targetInput.disabled = false;
    targetInput.focus();
}

async function generateAndDisplayWebResources(button: HTMLElement, loadingEl: HTMLElement, outputEl: HTMLElement, prompt: string) {
    if (!window.ai) {
        showToast("Funcionalidade de IA não está disponível. Verifique a chave da API.", "error");
        return;
    }

    button.setAttribute('disabled', 'true');
    loadingEl.style.display = 'block';
    outputEl.innerHTML = '';

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const response: GenerateContentResponse = await window.ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            });

            let contentHtml = '<div class="ai-resources-container">';
            const sanitizedText = DOMPurify.sanitize(response.text.replace(/\n/g, '<br>'));
            contentHtml += `<p>${sanitizedText}</p>`;

            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (groundingChunks && groundingChunks.length > 0) {
                const uniqueSources = new Map<string, string>();
                groundingChunks.forEach((chunk: any) => {
                    if (chunk.web && chunk.web.uri) {
                        uniqueSources.set(chunk.web.uri, chunk.web.title || chunk.web.uri);
                    }
                });

                if (uniqueSources.size > 0) {
                    contentHtml += '<div class="ai-sources-list"><h5>Fontes:</h5><ul>';
                    uniqueSources.forEach((title, uri) => {
                        const sanitizedTitle = DOMPurify.sanitize(title);
                        contentHtml += `<li><a href="${uri}" target="_blank" rel="noopener noreferrer">${sanitizedTitle}</a></li>`;
                    });
                    contentHtml += '</ul></div>';
                }
            }

            contentHtml += '</div>';
            outputEl.innerHTML = contentHtml;
            break; // Success, break loop

        } catch (error: any) {
            attempt++;
            console.error(`Attempt ${attempt} failed for AI web resources:`, error);

            const errorMessage = error.message || '';
            if (errorMessage.includes('API key not valid') || errorMessage.includes('403') || errorMessage.includes('400')) {
                showToast("Chave de API inválida ou requisição incorreta.", "error");
                outputEl.innerHTML = '<div class="ai-resources-container"><p style="color: var(--color-error);">Falha ao carregar sugestões.</p></div>';
                break; // Stop retrying
            }

            if (attempt >= maxRetries) {
                showToast("Ocorreu um erro ao buscar recursos após várias tentativas.", "error");
                outputEl.innerHTML = '<div class="ai-resources-container"><p style="color: var(--color-error);">Falha ao carregar sugestões.</p></div>';
            } else {
                const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }

    loadingEl.style.display = 'none';
    button.removeAttribute('disabled');
}

export { getAISuggestionForInput, generateAndDisplayWebResources };
