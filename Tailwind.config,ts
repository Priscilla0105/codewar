// tailwind.config.ts
// Complete Cyber Arena design system Tailwind configuration

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
        // Surface Hierarchy (Black-based)
        'surface': '#131313',           // Level 0 - Main background
        'surface-dim': '#0e0e0e',       // Darker than surface
        'surface-bright': '#3a3939',    // Brighter than surface
        'surface-container-lowest': '#0e0e0e',
        'surface-container-low': '#1c1b1b',      // Level 1 - Panels
        'surface-container': '#201f1f',          // Level 2 - Cards
        'surface-container-high': '#2a2a2a',     // Level 3 - Elevated
        'surface-container-highest': '#353534',  // Level 4 - Most elevated
        'surface-variant': '#1c1c1c',
        
        // Text Colors
        'on-surface': '#e5e2e1',        // Primary text
        'on-surface-variant': '#d5c4ab', // Secondary text
        'inverse-surface': '#e5e2e1',
        'inverse-on-surface': '#313030',
        
        // Accents & Borders
        'outline': '#9e8f78',           // Borders, dividers
        'outline-variant': '#514532',   // Subtle borders
        'surface-tint': '#ffba20',      // Tint overlay
        
        // PRIMARY - Orange (Energy, Warmth, Ranked/Epic)
        'primary': '#ffdca1',           // Light orange (foreground)
        'on-primary': '#412d00',        // Text on primary
        'primary-container': '#ffb800', // Darker orange (background)
        'on-primary-container': '#6b4c00',
        'inverse-primary': '#7c5800',
        'primary-fixed': '#ffdea8',
        'primary-fixed-dim': '#ffba20', // Darker variant
        'on-primary-fixed': '#271900',
        'on-primary-fixed-variant': '#5e4200',
        
        // SECONDARY - Neon Green (Success, Active, Easy)
        'secondary': '#f5fff3',         // Light green
        'on-secondary': '#00391d',
        'secondary-container': '#27ff97', // Neon green (vivid)
        'on-secondary-container': '#00723f',
        'secondary-fixed': '#5bffa1',
        'secondary-fixed-dim': '#00e383', // Darker neon
        'on-secondary-fixed': '#00210e',
        'on-secondary-fixed-variant': '#00522c',
        
        // TERTIARY - Cyber Red (Hard difficulty, Errors, High Priority)
        'tertiary': '#ffd8d4',
        'on-tertiary': '#68000b',
        'tertiary-container': '#ffb1ab',
        'on-tertiary-container': '#a70018',
        'tertiary-fixed': '#ffdad7',
        'tertiary-fixed-dim': '#ffb3ae',
        'on-tertiary-fixed': '#410004',
        'on-tertiary-fixed-variant': '#930014',
        
        // ERROR - Red (Destructive, Alerts, Failures)
        'error': '#ffb4ab',
        'on-error': '#690005',
        'error-container': '#93000a',
        'on-error-container': '#ffdad6',
        
        // BACKGROUND
        'background': '#131313',
        'on-background': '#e5e2e1',
      },
      
      borderRadius: {
        'sm': '0.125rem',      // 2px
        'DEFAULT': '0.25rem',  // 4px (standard)
        'md': '0.375rem',      // 6px
        'lg': '0.5rem',        // 8px
        'xl': '0.75rem',       // 12px
        'full': '9999px',      // Pill shape
      },
      
      spacing: {
        'sidebar-left': '320px',
        'sidebar-right': '280px',
        'gutter': '1rem',
        'container-padding': '1.5rem',
      },
      
      fontFamily: {
        // Space Grotesk - UI, Headlines, Navigation
        'grotesk': ['Space Grotesk', 'sans-serif'],
        'space': ['Space Grotesk', 'sans-serif'],
        
        // JetBrains Mono - Code, Data, Technical Content
        'mono': ['JetBrains Mono', 'monospace'],
        'jetbrains': ['JetBrains Mono', 'monospace'],
      },
      
      fontSize: {
        // Headlines (Space Grotesk)
        'headline-lg': [
          '32px',
          {
            lineHeight: '1.2',
            fontWeight: '700',
            letterSpacing: '-0.02em',
          },
        ],
        'headline-md': [
          '24px',
          {
            lineHeight: '1.3',
            fontWeight: '600',
          },
        ],
        
        // Body Text (JetBrains Mono for code-related, Space Grotesk for UI)
        'body-lg': [
          '16px',
          {
            lineHeight: '1.6',
            fontWeight: '400',
          },
        ],
        'body-md': [
          '14px',
          {
            lineHeight: '1.5',
            fontWeight: '400',
          },
        ],
        
        // Labels (Space Grotesk, Uppercase)
        'label-caps': [
          '12px',
          {
            lineHeight: '1',
            letterSpacing: '0.1em',
            fontWeight: '700',
          },
        ],
        
        // Code (JetBrains Mono)
        'code-sm': [
          '13px',
          {
            lineHeight: '1.4',
            fontWeight: '400',
          },
        ],
      },
      
      // Shadows & Glows
      boxShadow: {
        // Subtle glow for active elements
        'glow-primary': '0 0 0 2px rgba(255, 220, 161, 0.1)',
        'glow-success': '0 0 0 2px rgba(39, 255, 151, 0.1)',
        'glow-error': '0 0 0 2px rgba(255, 177, 171, 0.1)',
        
        // Inner glow
        'inner-glow': 'inset 0 0 8px rgba(255, 220, 161, 0.05)',
      },
      
      // Animation
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'glow': {
          '0%, 100%': {
            boxShadow: '0 0 0 2px rgba(255, 220, 161, 0.1)',
          },
          '50%': {
            boxShadow: '0 0 0 2px rgba(255, 220, 161, 0.3)',
          },
        },
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      
      // Transitions
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
      },
      
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'sharp': 'cubic-bezier(0.6, 0, 0.4, 1)',
      },
    },
  },
  plugins: [],
}

export default config