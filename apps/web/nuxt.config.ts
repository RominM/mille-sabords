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
   * Les composants sont RANGÉS par domaine (plateau, surcouches, panneaux…),
   * mais gardent leur nom court : `pathPrefix: false` empêche Nuxt de préfixer
   * par le dossier. `components/board/DieCube.vue` reste `<DieCube>`.
   *
   * Sans cela, ranger un composant obligerait à renommer chacun de ses usages —
   * le classement coûterait plus cher qu'il ne rapporte.
   */
  components: [{ path: '~/components', pathPrefix: false }],

  // Même logique pour les composables : ils se rangent par domaine sans perdre
  // l'import automatique, que Nuxt limite au premier niveau par défaut.
  imports: {
    dirs: ['composables/**'],
  },

  /**
   * Le labo (`/lab`) sert à régler la perspective et l'animation des dés à
   * l'œil : il n'a rien à faire en production. `ignore` l'exclut de la
   * compilation, donc la route n'existe pas et le code n'est même pas
   * empaqueté — un simple garde à l'exécution laisserait les deux.
   *
   * Aucun lien n'y mène, en développement non plus : on y va par l'URL.
   */
  // Le chemin est relatif à la RACINE du projet, pas à `srcDir` : `pages/lab.vue`
  // ne filtrerait rien, silencieusement — vérifié sur le build.
  ignore: process.env.NODE_ENV === 'production' ? ['app/pages/lab.vue'] : [],

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

  // `preprocessorOptions.scss.api` a disparu des options : depuis Vite 7,
  // `modern-compiler` est le seul mode et n'a plus à être demandé.

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
          href: 'https://fonts.googleapis.com/css2?family=Pirata+One&family=Spectral:wght@400;600&family=Cutive+Mono&display=swap'
        },
        {
          rel: 'icon',
          href: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">☠️</text></svg>'
        }
      ]
    }
  }
})
