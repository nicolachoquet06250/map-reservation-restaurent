import vue from '@vitejs/plugin-vue'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  future: {
    compatibilityVersion: 4,
  },
  runtimeConfig: {
    dbHost: process.env.DB_HOST,
    dbUser: process.env.DB_USER,
    dbPassword: process.env.DB_PASSWORD,
    dbDatabase: process.env.DB_DATABASE,
    authSecret: process.env.AUTH_SECRET,
    authTokenTtlSeconds: process.env.AUTH_TOKEN_TTL_SECONDS,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    smtpSecure: process.env.SMTP_SECURE,
    emailFrom: process.env.EMAIL_FROM,
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  },

  nitro: {
    rollupConfig: {
      plugins: [vue()]
    },
  }
})
