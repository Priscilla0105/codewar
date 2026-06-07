// tailwind.config.ts
// Enhanced Cyber Arena design system with anti-cheating indicators and premium effects

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
      
      // Shadows & Glows - Enhanced for premium feel
      boxShadow: {
        // Primary Gold Glow
        'glow-primary': '0 0 20px rgba(255, 220, 161, 0.3), 0 0 0 2px rgba(255, 220, 161, 0.1)',
        'glow-primary-intense': '0 0 30px rgba(255, 220, 161, 0.5), 0 0 60px rgba(255, 220, 161, 0.2)',
        
        // Success Green Glow
        'glow-success': '0 0 20px rgba(39, 255, 151, 0.3), 0 0 0 2px rgba(39, 255, 151, 0.1)',
        'glow-success-intense': '0 0 30px rgba(39, 255, 151, 0.4), 0 0 60px rgba(39, 255, 151, 0.15)',
        
        // Error Red Glow
        'glow-error': '0 0 20px rgba(255, 177, 171, 0.3), 0 0 0 2px rgba(255, 177, 171, 0.1)',
        'glow-error-intense': '0 0 30px rgba(255, 114, 94, 0.5), 0 0 60px rgba(255, 114, 94, 0.2)',
        
        // Warning Amber Glow
        'glow-warning': '0 0 20px rgba(251, 191, 36, 0.3), 0 0 0 2px rgba(251, 191, 36, 0.1)',
        'glow-warning-intense': '0 0 30px rgba(251, 191, 36, 0.4), 0 0 60px rgba(251, 191, 36, 0.15)',
        
        // Inner glow for cards
        'inner-glow': 'inset 0 0 8px rgba(255, 220, 161, 0.05)',
        'inner-glow-success': 'inset 0 0 8px rgba(39, 255, 151, 0.05)',
        'inner-glow-error': 'inset 0 0 8px rgba(255, 114, 94, 0.05)',
        
        // Elevation shadows
        'elevation-1': '0 2px 4px rgba(0, 0, 0, 0.3)',
        'elevation-2': '0 4px 8px rgba(0, 0, 0, 0.4)',
        'elevation-3': '0 8px 16px rgba(0, 0, 0, 0.5)',
      },
      
      // Animation - Enhanced contest and violation animations
      keyframes: {
        // Subtle pulse
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        
        // Glow pulse
        'glow': {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(255, 220, 161, 0.3), 0 0 0 2px rgba(255, 220, 161, 0.1)',
          },
          '50%': {
            boxShadow: '0 0 30px rgba(255, 220, 161, 0.5), 0 0 60px rgba(255, 220, 161, 0.2)',
          },
        },
        
        // Danger pulse (for violations)
        'pulse-danger': {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(255, 114, 94, 0.7)',
          },
          '50%': {
            boxShadow: '0 0 0 10px rgba(255, 114, 94, 0)',
          },
        },
        
        // Warning pulse
        'pulse-warning': {
          '0%, 100%': {
            opacity: '1',
            boxShadow: '0 0 20px rgba(251, 191, 36, 0.3)',
          },
          '50%': {
            opacity: '0.8',
            boxShadow: '0 0 30px rgba(251, 191, 36, 0.5)',
          },
        },
        
        // Success pulse
        'pulse-success': {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(39, 255, 151, 0.3)',
          },
          '50%': {
            boxShadow: '0 0 30px rgba(39, 255, 151, 0.5)',
          },
        },
        
        // Shimmer for loading
        'shimmer': {
          '0%': {
            backgroundPosition: '-1000px 0',
          },
          '100%': {
            backgroundPosition: '1000px 0',
          },
        },
        
        // Slide in from top (timer)
        'slide-in-top': {
          '0%': {
            transform: 'translateY(-100%)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1',
          },
        },
        
        // Bounce alert
        'bounce-alert': {
          '0%, 100%': {
            transform: 'translateY(0)',
          },
          '50%': {
            transform: 'translateY(-4px)',
          },
        },
        
        // Spin code (for running)
        'spin-code': {
          '0%': {
            transform: 'rotate(0deg)',
          },
          '100%': {
            transform: 'rotate(360deg)',
          },
        },
        
        // Fade in with scale
        'fade-in-scale': {
          '0%': {
            opacity: '0',
            transform: 'scale(0.95)',
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)',
          },
        },
      },
      
      animation: {
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-intense': 'glow 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        
        // Violation indicators
        'pulse-danger': 'pulse-danger 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-warning': 'pulse-warning 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-success': 'pulse-success 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        
        // Loading and movement
        'shimmer': 'shimmer 2s infinite',
        'slide-in-top': 'slide-in-top 0.3s ease-out',
        'bounce-alert': 'bounce-alert 0.5s ease-in-out 2',
        'spin-code': 'spin-code 1s linear infinite',
        'fade-in-scale': 'fade-in-scale 0.3s ease-out',
      },
      
      // Transitions - Smooth and responsive
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
        'slower': '500ms',
      },
      
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'sharp': 'cubic-bezier(0.6, 0, 0.4, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      
      // Gradients for premium look
      backgroundImage: {
        'gradient-gold': 'linear-gradient(135deg, #ffdca1 0%, #ffba20 100%)',
        'gradient-green': 'linear-gradient(135deg, #27ff97 0%, #00e383 100%)',
        'gradient-danger': 'linear-gradient(135deg, #ff7a5e 0%, #ff5842 100%)',
        'gradient-cyber': 'linear-gradient(135deg, #131313 0%, #1c1b1b 100%)',
        'gradient-premium': 'linear-gradient(135deg, rgba(255, 220, 161, 0.1) 0%, rgba(39, 255, 151, 0.05) 100%)',
      },
      
      // Backdrop filters for glassmorphism
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
      },
    },
  },
  plugins: [],
}

export default config