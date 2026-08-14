import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Tests du front, HORS Nuxt.
 *
 * On ne monte pas l'application : ces tests visent la logique qui se laisse
 * éprouver seule — mise en mots d'un décompte, géométrie du plateau, état
 * partagé des tiroirs, mémoire des mises en place. Le rendu, lui, se vérifie à
 * l'écran, et le moteur a déjà sa propre suite.
 *
 * Deux illusions à recréer, parce que Nuxt les fournit d'ordinaire :
 * l'alias `~`, et les imports automatiques de Vue — remis en variables globales
 * par `test/setup.ts`.
 */
export default defineConfig({
  resolve: {
    alias: { '~': fileURLToPath(new URL('./app', import.meta.url)) }
  },

  /**
   * `import.meta.client` distingue le navigateur du serveur chez Nuxt, qui le
   * remplace à la compilation. Ici tout s'exécute dans un DOM : les gardes qui
   * en dépendent doivent laisser passer.
   *
   * Un `define` ne suffit pas — il ne s'applique pas à la transformation
   * utilisée par les tests. On refait donc à la main ce que fait le
   * compilateur, exactement comme `test/setup.ts` refait ses imports
   * automatiques.
   */
  plugins: [
    {
      name: 'rf:import-meta-client',
      transform: (code: string) =>
        code.includes('import.meta.client')
          ? { code: code.replaceAll('import.meta.client', 'true'), map: null }
          : null
    }
  ],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts']
  }
})
