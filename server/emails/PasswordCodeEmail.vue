<script setup lang="ts">
import {
  Html as EHtml,
  Head as EHead,
  Body as EBody,
  Container as EContainer,
  Section as ESection,
  Text as EText,
  Heading as EHeading,
  Hr as EHr,
  Preview as EPreview,
} from '@vue-email/components';

interface Props {
  name: string;
  code: string;
}

defineProps<Props>();
</script>

<template>
  <EHtml>
    <EHead />
    <EPreview>Votre code de validation RestauBuilder</EPreview>
    <EBody style="background-color: #f8fafc; font-family: sans-serif; padding: 20px 0;">
      <EContainer style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 40px; margin: 0 auto; max-width: 600px;">
        <EHeading style="color: #0f172a; font-size: 24px; font-weight: 800; margin-bottom: 16px;">
          Votre code de validation
        </EHeading>
        <EText style="color: #475569; font-size: 16px; line-height: 24px; margin-bottom: 24px;">
          Bonjour {{ name }},
        </EText>
        <EText style="color: #475569; font-size: 16px; line-height: 24px; margin-bottom: 24px;">
          Utilisez le code ci-dessous pour modifier votre mot de passe.
        </EText>
        <ESection style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background-color: #eff6ff; border-radius: 12px; padding: 16px 24px; border: 1px solid #dbeafe;">
            <span style="color: #1e3a8a; font-size: 28px; font-weight: 800; letter-spacing: 6px;">
              {{ code }}
            </span>
          </div>
        </ESection>
        <EHr style="border-color: #e2e8f0; margin-bottom: 24px;" />
        <EText style="color: #64748b; font-size: 14px; line-height: 20px;">
          Ce code est valable pendant 10 minutes. Si vous n'êtes pas à l'origine de cette demande,
          vous pouvez ignorer cet e-mail en toute sécurité.
        </EText>
        <EText style="color: #94a3b8; font-size: 12px; margin-top: 32px; text-align: center;">
          © 2025 RestauBuilder. Tous droits réservés.
        </EText>
      </EContainer>
    </EBody>
  </EHtml>
</template>
