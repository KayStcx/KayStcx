/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#0ea5e9',
        dark: {
          bg: '#020617',
          card: '#0f172a',
          border: '#1e293b',
          text: '#f1f5f9',
          muted: '#94a3b8'
        },
        light: {
          bg: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
          text: '#0f172a',
          muted: '#64748b'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        serif: ['Merriweather', 'ui-serif', 'Georgia']
      },
      backgroundColor: {
        'glass-dark': 'rgba(2, 6, 23, 0.7)',
        'glass-light': 'rgba(248, 250, 252, 0.7)'
      },
      transitionDuration: {
        250: '250ms'
      }
    }
  },
  plugins: []
};
