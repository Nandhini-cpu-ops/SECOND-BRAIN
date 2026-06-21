export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0D1B2A',
        'background-end': '#1B3A5C',
        card: '#F8F9FA',
        'accent-teal': '#2A9D8F',
        'label-teal': '#2A9D8F',
        navy: '#1d3a6e',
        softblue: '#3b5a99',
        warm: '#f9f5ef',
        'path-blue': '#1B6CA8',
        'path-teal': '#2A9D8F',
        'path-amber': '#E8A838',
      },
      boxShadow: {
        soft: '0 18px 40px rgba(13, 27, 42, 0.12)',
      },
    },
  },
  plugins: [],
}
