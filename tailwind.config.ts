import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 16-bit retro palette
        'retro-green': '#00cc88',
        'retro-teal': '#00aa99',
        'retro-blue': '#0088cc',
        'retro-purple': '#8866cc',
        'retro-red': '#cc6666',
        'retro-yellow': '#cccc66',
        'retro-gray': '#666666',
        'retro-dark': '#333333',
        'retro-light': '#cccccc',
        'retro-white': '#f0f0f0',
        'poker-table': '#006600',
        'poker-felt': '#00aa55',
        'chip-red': '#cc2222',
        'chip-blue': '#2222cc',
        'chip-black': '#333333',
        'chip-white': '#eeeeee',
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        'retro-sans': ['"Courier New"', 'monospace'],
      },
      boxShadow: {
        'retro-inset': 'inset 4px 4px 8px rgba(0,0,0,0.5), inset -4px -4px 8px rgba(255,255,255,0.1)',
        'retro-outset': '4px 4px 0px rgba(0,0,0,0.8), 8px 8px 0px rgba(0,0,0,0.4)',
      },
      borderRadius: {
        'retro': '8px',
      },
      borderWidth: {
        'retro': '4px',
      },
      animation: {
        'pulse-retro': 'pulse 1s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00cc88' },
          '100%': { boxShadow: '0 0 20px #00cc88, 0 0 30px #0088cc' },
        },
      },
    },
  },
  plugins: [],
}
export default config