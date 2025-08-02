# Pequenos Passos para uma Vida Extraordinária

> Um dashboard completo para planejamento e acompanhamento de saúde e bem-estar em todas as áreas da vida, com funcionalidades de IA para auxiliar no processo.

Este projeto é um dashboard de bem-estar holístico construído com TypeScript e Vite, utilizando a API do Google Gemini para recursos inteligentes.

## Funcionalidades

- Dashboard abrangente cobrindo 8 áreas da saúde: Física, Mental, Financeira, Familiar, Profissional, Social, Espiritual e Preventiva.
- Planejamento diário e sistema de gerenciamento de tarefas.
- Acompanhamento de indicadores de saúde, vacinas e diagnósticos.
- Geração de metas, reflexões e outros conteúdos com IA (Google Gemini).
- Ditado por voz para campos de texto.
- Tema claro e escuro.
- E muito mais!

## Rodar Localmente

**Pré-requisitos:** [Node.js](https://nodejs.org/) (versão 18 ou superior recomendada).

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/your-username/repository-name.git
    cd repository-name
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configure as variáveis de ambiente:**
    Crie um arquivo chamado `.env` na raiz do projeto e adicione sua chave da API do Gemini:
    ```
    GEMINI_API_KEY=SUA_CHAVE_API_AQUI
    ```
    Substitua `SUA_CHAVE_API_AQUI` pela sua chave real do [Google AI Studio](https://aistudio.google.com/app/apikey).

4.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```
    O aplicativo estará disponível em `http://localhost:5173` (ou em outra porta se a 5173 estiver em uso).

## Publicar no GitHub Pages

Este projeto está configurado para ser facilmente publicado no GitHub Pages.

1.  **Crie um repositório no GitHub:**
    Crie um novo repositório público na sua conta do GitHub. Anote o nome do repositório.

2.  **Atualize a configuração do Vite:**
    Abra o arquivo `vite.config.ts` e atualize a propriedade `base`. Substitua `'repository-name'` pelo nome exato do seu repositório no GitHub.

    ```typescript
    // vite.config.ts
    export default defineConfig({
      // ...
      base: '/seu-nome-de-repositorio/', 
      // ...
    });
    ```

3.  **Execute o script de deploy:**
    No seu terminal, execute o seguinte comando. Ele irá construir o projeto e publicá-lo em uma branch `gh-pages` no seu repositório.
    ```bash
    npm run deploy
    ```

4.  **Configure o GitHub Pages:**
    - No seu repositório do GitHub, vá para `Settings` > `Pages`.
    - Na seção "Build and deployment", em "Source", selecione `Deploy from a branch`.
    - Em "Branch", selecione `gh-pages` e a pasta `/ (root)`. Clique em `Save`.

    Após alguns minutos, seu site estará ativo no endereço `https://<seu-usuario>.github.io/<seu-repositorio>/`.

## Solução de Problemas

*   **Funcionalidades de IA não funcionam / Erros de "API key not valid":**
    *   Certifique-se de que você criou um arquivo `.env` na raiz do projeto.
    *   Verifique se a variável no arquivo `.env` é exatamente `GEMINI_API_KEY=...` e que você substituiu o placeholder pela sua chave de API real.
    *   Reinicie o servidor de desenvolvimento (`npm run dev`) após criar ou modificar o arquivo `.env`.
