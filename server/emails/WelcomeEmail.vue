<script setup lang="ts">
import {
  Html as EHtml,
  Head as EHead,
  Body as EBody,
  Container as EContainer,
  Section as ESection,
  Text as EText,
  Heading as EHeading,
  Button as EButton,
  Hr as EHr,
  Preview as EPreview,
} from '@vue-email/components';

interface Props {
  name: string;
  restaurantName: string;
  activationLink: string;
}

defineProps<Props>();
</script>

<template>
  <EHtml>
    <EHead />
    <EPreview>Bienvenue chez RestauBuilder ! Activez votre compte dès maintenant.</EPreview>
    <EBody style="background-color: #f8fafc; font-family: sans-serif; padding: 20px 0;">
      <EContainer style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 40px; margin: 0 auto; max-width: 600px;">
        <EHeading style="color: #0f172a; font-size: 24px; font-weight: 800; margin-bottom: 24px;">
          Bienvenue chez RestauBuilder, {{ name }} !
        </EHeading>
        <EText style="color: #475569; font-size: 16px; line-height: 24px; margin-bottom: 24px;">
          Nous sommes ravis de vous compter parmi nous. Votre espace restaurateur pour <strong>{{ restaurantName }}</strong> est presque prêt.
        </EText>
        <ESection style="text-align: center; margin-bottom: 32px;">
          <EButton
            :href="activationLink"
            style="background-color: #2563eb; border-radius: 8px; color: #ffffff; font-size: 16px; font-weight: 600; padding: 12px 24px; text-decoration: none;"
          >
            Activer mon compte
          </EButton>
        </ESection>
        <EHr style="border-color: #e2e8f0; margin-bottom: 32px;" />
        <EText style="color: #64748b; font-size: 14px; line-height: 20px;">
          Si le bouton ne fonctionne pas, copiez et collez le lien suivant dans votre navigateur :<br />
          <a :href="activationLink" style="color: #2563eb; text-decoration: underline;">{{ activationLink }}</a>
        </EText>
        <EText style="color: #94a3b8; font-size: 12px; margin-top: 32px; text-align: center;">
          © 2025 RestauBuilder. Tous droits réservés.
        </EText>
      </EContainer>
    </EBody>
  </EHtml>
</template>
