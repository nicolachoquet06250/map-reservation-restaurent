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

  return {
    sendWelcomeEmail,
  }
}
