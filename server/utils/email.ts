import nodemailer from 'nodemailer'
import { render } from '@vue-email/render'
import WelcomeEmail from '../emails/WelcomeEmail.vue'

export const useEmail = () => {
  const config = useRuntimeConfig()

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: Number(config.smtpPort),
    secure: config.smtpSecure === 'true',
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  })

  const sendWelcomeEmail = async (to: string, props: { name: string; restaurantName: string; activationLink: string }) => {
    try {
      const html = await render(WelcomeEmail, props)

      await transporter.sendMail({
        from: config.emailFrom || '"RestauBuilder" <noreply@restaubuilder.com>',
        to,
        subject: 'Bienvenue chez RestauBuilder !',
        html,
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

    await transporter.sendMail({
      from: config.emailFrom || '"RestauBuilder" <noreply@restaubuilder.com>',
      to,
      subject: 'Votre code de validation RestauBuilder',
      html,
    })
  }

  return {
    sendWelcomeEmail,
    sendPasswordCodeEmail
  }
}
