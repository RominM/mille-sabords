// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  // Jeu piloté côté client (dés aléatoires, timers) → SPA, pas de SSR.
  ssr: false,
  devtools: { enabled: true },
  devServer: { port: 5173 },

  // Design system global (portable : app/assets/scss/).
  css: ['~/assets/scss/main.scss'],

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
