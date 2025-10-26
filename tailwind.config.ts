import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        windows: {
          bg: '#c0c0c0',
          border: '#808080',
          'border-light': '#dfdfdf',
          'border-dark': '#404040',
          text: '#000000',
          button: '#c0c0c0',
          blue: '#000080',
          'blue-light': '#4080ff',
        },
      },
      fontFamily: {
        sans: ['MS Sans Serif', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
