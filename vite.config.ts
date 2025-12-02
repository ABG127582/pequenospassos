import path from 'path';
import { defineConfig, loadEnv, type ConfigEnv, type UserConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
    const env = loadEnv(mode, '.', '');

    return {
      base: './',
      plugins: [basicSsl()],
      define: {
        // Standardize on using API_KEY from the environment.
        'process.env.API_KEY': JSON.stringify(env.API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve('./'),
        }
      },
      build: {
        rollupOptions: {
          input: [
            'index.html',
            'alimentacao-forte.html',
            'alongamento.html',
            'espiritual.html',
            'familiar.html',
            'financeira.html',
            'fisica.html',
            'food-agriao.html',
            'food-alho.html',
            'food-almeirao.html',
            'food-azeite.html',
            'food-brocolis.html',
            'food-canela.html',
            'food-cenoura.html',
            'food-chaverde.html',
            'food-couve.html',
            'food-couveflor.html',
            'food-creatina.html',
            'food-curcuma.html',
            'food-denteleao.html',
            'food-espinafre.html',
            'food-folhasbeterraba.html',
            'food-gengibre.html',
            'food-laranja.html',
            'food-lentilha.html',
            'food-linhaca.html',
            'food-maca.html',
            'food-morango.html',
            'food-ovo.html',
            'food-pimenta.html',
            'food-rucula.html',
            'food-shitake.html',
            'food-vinagremaca.html',
            'food-whey.html',
            'inicio.html',
            'jejum-verde.html',
            'leitura-guia-espiritual.html',
            'leitura-guia-familiar.html',
            'leitura-guia-financeira.html',
            'leitura-guia-fisica.html',
            'leitura-guia-mental.html',
            'mental.html',
            'planejamento-diario.html',
            'preventiva.html',
            'profissional.html',
            'social.html',
            'tarefas.html'
          ]
        }
      }
    };
});