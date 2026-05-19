import disposableDomains from 'disposable-email-domains'

const domainSet = new Set<string>(disposableDomains as string[])

export function isDisposableEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const at = email.lastIndexOf('@')
  if (at < 0) return false
  const domain = email.slice(at + 1).trim().toLowerCase()
  if (!domain) return false
  return domainSet.has(domain)
}
