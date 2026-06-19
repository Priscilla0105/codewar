import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'surface': '#050505',
        'surface-dim': '#000000',
        'surface-bright': '#2a2a2a',
        'surface-container-lowest': '#000000',
        'surface-container-low': '#0D0D0D',
        'surface-container': '#111111',
        'surface-container-high': '#2e2e2e',
        'surface-container-highest': '#383838',
        'surface-variant': '#1e1e1e',
        
        'on-surface': '#ffffff',
        'on-surface-variant': '#F5F5F5',
        'inverse-surface': '#ffffff',
        'inverse-on-surface': '#050505',
        
        'outline': '#8A8A8A',
        'outline-variant': '#555555',
        'surface-tint': '#FFC107',
        
        'primary': '#FFC107',
        'on-primary': '#000000',
        'primary-container': '#FFD54F',
        'on-primary-container': '#0D0D0D',
        'inverse-primary': '#ffb600',
        'primary-fixed': '#FFD54F',
        'primary-fixed-dim': '#FFC107',
        'on-primary-fixed': '#000000',
        'on-primary-fixed-variant': '#332200',
        
        'secondary': '#f5fff3',
        'on-secondary': '#003300',
        'secondary-container': '#00cc44',
        'on-secondary-container': '#003300',
        'secondary-fixed': '#66ff99',
        'secondary-fixed-dim': '#00cc44',
        'on-secondary-fixed': '#000000',
        'on-secondary-fixed-variant': '#003300',
        
        'tertiary': '#ff6b35',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#ff5722',
        'on-tertiary-container': '#ffffff',
        'tertiary-fixed': '#ff8c5a',
        'tertiary-fixed-dim': '#ff6b35',
        'on-tertiary-fixed': '#ffffff',
        'on-tertiary-fixed-variant': '#4d2200',
        
        'error': '#ff6b6b',
        'on-error': '#ffffff',
        'error-container': '#cc0000',
        'on-error-container': '#ffffff',
        
        'background': '#050505',
        'on-background': '#ffffff',
      },
      
      borderRadius: {
        'sm': '0.125rem',
        'DEFAULT': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        'full': '9999px',
      },
      
      fontFamily: {
        'grotesk': ['Space Grotesk', 'sans-serif'],
        'space': ['Space Grotesk', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
        'jetbrains': ['JetBrains Mono', 'monospace'],
      },
      
      fontSize: {
        'headline-lg': ['32px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.02em' }],
        'headline-md': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'label-caps': ['12px', { lineHeight: '1', letterSpacing: '0.1em', fontWeight: '700' }],
        'code-sm': ['13px', { lineHeight: '1.4', fontWeight: '400' }],
      },
      
      boxShadow: {
        'glow-primary': '0 0 20px rgba(255, 199, 0, 0.3), 0 0 0 2px rgba(255, 199, 0, 0.1)',
        'glow-primary-intense': '0 0 30px rgba(255, 199, 0, 0.5), 0 0 60px rgba(255, 199, 0, 0.2)',
        'glow-success': '0 0 20px rgba(0, 204, 68, 0.3), 0 0 0 2px rgba(0, 204, 68, 0.1)',
        'glow-error': '0 0 20px rgba(255, 107, 107, 0.3), 0 0 0 2px rgba(255, 107, 107, 0.1)',
        'elevation-1': '0 2px 4px rgba(0, 0, 0, 0.5)',
        'elevation-2': '0 4px 8px rgba(0, 0, 0, 0.6)',
        'elevation-3': '0 8px 16px rgba(0, 0, 0, 0.7)',
      },
      
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 199, 0, 0.3), 0 0 0 2px rgba(255, 199, 0, 0.1)' },
          '50%': { boxShadow: '0 0 30px rgba(255, 199, 0, 0.5), 0 0 60px rgba(255, 199, 0, 0.2)' },
        },
        'pulse-danger': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 107, 107, 0.7)' },
          '50%': { boxShadow: '0 0 0 10px rgba(255, 107, 107, 0)' },
        },
        'fade-in-scale': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      
      animation: {
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-danger': 'pulse-danger 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in-scale': 'fade-in-scale 0.3s ease-out',
      },
      
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
      },
      
      backgroundImage: {
        'gradient-gold': 'linear-gradient(135deg, #FFC107 0%, #FFD54F 100%)',
        'gradient-cyber': 'linear-gradient(135deg, #050505 0%, #0D0D0D 100%)',
      },
    },
  },
  plugins: [],
}

export default config