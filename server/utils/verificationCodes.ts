const CODE_TTL_MS = 10 * 60 * 1000

type VerificationEntry = {
  code: string
  expiresAt: number
}

const codeStore = new Map<number, VerificationEntry>()

const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export const createVerificationCode = (userId: number) => {
  const code = generateCode()
  const expiresAt = Date.now() + CODE_TTL_MS
  codeStore.set(userId, { code, expiresAt })
  return { code, expiresAt }
}

export const verifyVerificationCode = (userId: number, code: string) => {
  const entry = codeStore.get(userId)
  if (!entry) return false
  if (Date.now() > entry.expiresAt) {
    codeStore.delete(userId)
    return false
  }
  const matches = entry.code === code
  if (matches) {
    codeStore.delete(userId)
  }
  return matches
}

export const getVerificationExpiry = (userId: number) => {
  return codeStore.get(userId)?.expiresAt ?? null
}
