/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}', './*.tsx'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      colors: {
        // Core Background Colors (from reference #14181B)
        'app-bg': '#0f1419',
        'card-bg': '#1a1f2e',
        'card-hover': '#242937',
        'sidebar-bg': '#141821',

        // Accent Colors (Premium Streaming Vibe)
        'accent-primary': '#6366f1',    // Indigo
        'accent-secondary': '#8b5cf6',  // Purple
        'accent-success': '#10b981',    // Emerald
        'accent-warning': '#f59e0b',    // Amber
        'accent-error': '#ef4444',      // Red
        'accent-info': '#3b82f6',       // Blue

        // Text Colors
        'text-primary': '#f8fafc',
        'text-secondary': '#94a3b8',
        'text-muted': '#64748b',

        // Border & Divider
        'border-subtle': '#2d3548',
        'border-active': '#4f46e5',

        // Glass Effect
        'glass-bg': 'rgba(26, 31, 46, 0.8)',
        'glass-border': 'rgba(255, 255, 255, 0.1)',
      },
      borderRadius: {
        'card': '16px',
        'button': '12px',
        'badge': '8px',
        'pill': '9999px',
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 32px rgba(99, 102, 241, 0.2)',
        'glow': '0 0 20px rgba(99, 102, 241, 0.4)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
      backdropBlur: {
        'glass': '12px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(99, 102, 241, 0.5)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
};
