import tailwindcss from "@tailwindcss/vite";
import Aura from "@primevue/themes/aura";

export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: { enabled: true },
  ssr: false,

  vite: {
    plugins: [tailwindcss()],
  },

  modules: ["@nuxtjs/supabase", "@pinia/nuxt", "@primevue/nuxt-module"],

  // Auto-import de componentes em subpastas do Atomic Design
  components: [
    { path: "~/components/atoms", prefix: "" },
    { path: "~/components/molecules", prefix: "" },
    { path: "~/components/organisms", prefix: "" },
    { path: "~/components/templates", prefix: "" },
  ],

  primevue: {
    autoImport: true,
    options: {
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: ".dark",
          cssLayer: false,
        },
      },
    },
  },

  supabase: {
    redirect: false,
  },

  runtimeConfig: {
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
    public: {
      appName: "SGO — Sistema de Gestão Operacional",
      appVersion: "1.0.0",
    },
  },

  typescript: { strict: false },

  css: ["primeicons/primeicons.css", "~/assets/main.css"],

  imports: {
    dirs: ["stores", "composables"],
  },
});
