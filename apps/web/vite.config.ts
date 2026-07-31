import { defineConfig } from 'vite'

export default defineConfig({
  // Utilise le compilateur Sass moderne (l'API legacy est dépréciée en Dart Sass 2).
  css: {
    preprocessorOptions: {
      scss: { api: 'modern-compiler' },
    },
  },
})
