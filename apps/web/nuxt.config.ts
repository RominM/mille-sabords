// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  // Jeu piloté côté client (dés aléatoires, timers) → SPA, pas de SSR.
  ssr: false,
  devtools: { enabled: true },
  devServer: { port: 5173 },

  // Design system global (portable : app/assets/scss/).
  css: ['~/assets/scss/main.scss'],

  /**
   * Adresse du serveur de jeu. Publique — elle part dans le navigateur — et
   * surchargeable à l'exécution par `NUXT_PUBLIC_WS_URL`, sans reconstruire :
   * changer d'hébergeur ne demande donc qu'une variable d'environnement.
   *
   * Vide par défaut : on retombe alors sur l'hôte qui sert la page, ce qui est
   * le cas quand front et serveur vivent derrière le même domaine.
   */
  runtimeConfig: {
    public: {
      wsUrl: ''
    }
  },

  vite: {
    css: {
      preprocessorOptions: {
        scss: { api: 'modern-compiler' },
      },
    },
  },

  app: {
    head: {
      title: 'Reckless Fathoms',
      htmlAttrs: { lang: 'fr' },
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Pirata+One&family=Spectral:wght@400;600&family=Cutive+Mono&display=swap',
        },
      ],
    },
  },
})
