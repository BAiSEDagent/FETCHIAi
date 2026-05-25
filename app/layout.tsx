import type { Metadata } from 'next'
import { Outfit, DM_Sans, DM_Serif_Display } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-dm-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Fetchi.ai — Find local buyers before your competitors do.',
  description:
    "Signal-based lead generation for service businesses. Tell us what your business sells — we'll find the buyers who need it this week.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#F45B3B',
          colorText: '#0A0A0A',
          colorTextSecondary: '#4B453C',
          colorBackground: '#F3EEDC',
          colorInputBackground: '#FAF6E8',
          colorInputText: '#0A0A0A',
          colorDanger: '#D94E45',
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          fontFamilyButtons: 'var(--font-dm-sans), system-ui, sans-serif',
          borderRadius: '12px',
        },
        elements: {
          rootBox: 'w-full max-w-[400px] mx-auto',
          card: 'bg-surface shadow-fetchi-card rounded-[20px] border border-border p-6 lg:p-7',
          headerTitle: 'font-outfit text-[22px] font-semibold text-text',
          headerSubtitle: 'text-[14px] text-text2',
          formButtonPrimary:
            'bg-coral hover:bg-coralDeep text-white rounded-xl h-11 text-[14px] font-semibold normal-case shadow-none',
          socialButtonsBlockButton:
            'bg-bg hover:bg-raised border border-border text-text rounded-xl h-11 text-[14px] font-medium normal-case',
          socialButtonsBlockButtonText: 'text-text font-medium',
          dividerLine: 'bg-border',
          dividerText: 'text-textMuted text-[12px]',
          formFieldLabel: 'text-[12.5px] font-semibold text-text',
          formFieldInput:
            'bg-bg border border-border rounded-xl h-11 text-[14px] text-text focus:border-coral focus:ring-2 focus:ring-coral/30',
          identityPreviewEditButton: 'text-coral hover:text-coralDeep',
          formFieldAction: 'text-blue hover:text-coral',
          footer: 'bg-transparent',
          footerActionText: 'text-text2 text-[13px]',
          footerActionLink: 'text-coral hover:text-coralDeep font-semibold',
          alert: 'bg-coral/8 border border-coral/20 text-text rounded-xl',
          alertText: 'text-text text-[13px]',
          otpCodeFieldInput: 'bg-bg border border-border rounded-xl text-text focus:border-coral',
          badge: 'bg-raised text-text2 border border-border',
        },
      }}
    >
      <html lang="en" className={`theme-light ${outfit.variable} ${dmSans.variable} ${dmSerif.variable}`}>
        <body className="min-h-screen bg-bg text-text antialiased">{children}</body>
      </html>
    </ClerkProvider>
  )
}
