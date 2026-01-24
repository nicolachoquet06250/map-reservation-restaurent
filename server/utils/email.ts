import nodemailer from 'nodemailer'
import { render } from '@vue-email/render'
import WelcomeEmail from '../emails/WelcomeEmail.vue'

type MailEnv = {
  SMTP_HOST?: string
  SMTP_PORT?: string
  SMTP_USER?: string
  SMTP_PASS?: string
  SMTP_SECURE?: string
  MAIL_FROM?: string
  APP_NAME?: string
}

export const useEmail = () => {
  const env: MailEnv = process.env as any

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: env.SMTP_SECURE === 'true',
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  })

  const sendWelcomeEmail = async (to: string, props: { name: string; restaurantName: string; activationLink: string }) => {
    try {
      const html = await render(WelcomeEmail, props)
      const text = await render(WelcomeEmail, props, {
        plainText: true
      })

      const env: MailEnv = process.env as any
      const appName = env.APP_NAME || 'RestauBuilder'
      const from = env.MAIL_FROM ? `${appName}<${env.MAIL_FROM}>` : `${appName} <no-reply@localhost>`

      await transporter.sendMail({
        from, to,
        subject: 'Bienvenue chez RestauBuilder !',
        html, text
      })
    } catch (error) {
      console.error('Failed to send welcome email:', error)
    }
  }

  const sendPasswordCodeEmail = async (to: string, props: { name: string; code: string }) => {
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>Votre code de validation</h2>
        <p>Bonjour ${props.name},</p>
        <p>Voici le code nécessaire pour modifier votre mot de passe :</p>
        <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; margin: 16px 0;">
          ${props.code}
        </div>
        <p>Ce code est valable pendant 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
      </div>
    `

    const env: MailEnv = process.env as any
    const appName = env.APP_NAME || 'RestauBuilder'
    const from = env.MAIL_FROM ? `${appName}<${env.MAIL_FROM}>` : `${appName} <no-reply@localhost>`


    await transporter.sendMail({
      from, to,
      subject: 'Votre code de validation RestauBuilder',
      html,
    })
  }

  return {
    sendWelcomeEmail,
    sendPasswordCodeEmail
  }
}
