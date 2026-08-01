/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fdf9ec',
          100: '#faf0c8',
          200: '#f5df8e',
          300: '#efc84d',
          400: '#e8b428',
          500: '#d4981a',
          600: '#b87714',
          700: '#945613',
          800: '#794416',
          900: '#673a17',
          DEFAULT: '#c9a84c',
        },
        gem: {
          900: '#060810',
          800: '#0a0d14',
          700: '#0f1520',
          600: '#141b2d',
          500: '#1a2234',
          400: '#1e2940',
          300: '#243050',
          border: '#1f2d45',
          muted: '#4a5568',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gem-gradient': 'linear-gradient(135deg, #0a0d14 0%, #0f1520 50%, #060810 100%)',
        'gold-gradient': 'linear-gradient(135deg, #c9a84c 0%, #e8b428 50%, #b87714 100%)',
        'card-gradient': 'linear-gradient(145deg, #141b2d 0%, #1a2234 100%)',
      },
    },
  },
  plugins: [],
};
