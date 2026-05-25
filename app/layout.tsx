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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#58937E',
          colorText: '#2D2B2A',
          colorTextSecondary: '#3D6B5A',
          colorBackground: '#FAF8F2',
          colorInputBackground: '#F2EEDF',
          colorInputText: '#2D2B2A',
          colorDanger: '#D85A30',
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          fontFamilyButtons: 'var(--font-dm-sans), system-ui, sans-serif',
          borderRadius: '12px',
        },
        elements: {
          rootBox: 'w-full max-w-[400px] mx-auto',
          card: 'bg-brand-cream shadow-fetchi-card rounded-[20px] border border-brand-near-black/8 p-6 lg:p-7',
          headerTitle: 'font-outfit text-[22px] font-semibold text-brand-near-black',
          headerSubtitle: 'text-[14px] text-brand-near-black/65',
          formButtonPrimary:
            'bg-brand-near-black hover:bg-brand-green text-white rounded-xl h-11 text-[14px] font-semibold normal-case shadow-none',
          socialButtonsBlockButton:
            'bg-brand-cream-muted hover:bg-brand-light border border-brand-near-black/10 text-brand-near-black rounded-xl h-11 text-[14px] font-medium normal-case',
          socialButtonsBlockButtonText: 'text-brand-near-black font-medium',
          dividerLine: 'bg-brand-near-black/10',
          dividerText: 'text-brand-near-black/50 text-[12px]',
          formFieldLabel: 'text-[12.5px] font-semibold text-brand-near-black',
          formFieldInput:
            'bg-brand-cream-muted border border-brand-near-black/10 rounded-xl h-11 text-[14px] text-brand-near-black focus:border-brand-green focus:ring-2 focus:ring-brand-green/30',
          identityPreviewEditButton: 'text-brand-green hover:text-brand-dark',
          formFieldAction: 'text-brand-green hover:text-brand-dark',
          footer: 'bg-transparent',
          footerActionText: 'text-brand-near-black/65 text-[13px]',
          footerActionLink: 'text-brand-green hover:text-brand-dark font-semibold',
          alert: 'bg-brand-coral/8 border border-brand-coral/20 text-brand-near-black rounded-xl',
          alertText: 'text-brand-near-black text-[13px]',
          otpCodeFieldInput:
            'bg-brand-cream-muted border border-brand-near-black/10 rounded-xl text-brand-near-black focus:border-brand-green',
          badge: 'bg-brand-cream-muted text-brand-near-black/70 border border-brand-near-black/10',
        },
      }}
    >
      <html
        lang="en"
        className={`theme-light ${outfit.variable} ${dmSans.variable} ${dmSerif.variable}`}
      >
        <body className="min-h-screen bg-brand-parchment text-brand-near-black antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
