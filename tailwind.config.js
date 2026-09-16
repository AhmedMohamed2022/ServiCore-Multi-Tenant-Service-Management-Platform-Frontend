/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        // Every colour resolves through a CSS custom property so the Angular
        // Material theme and Tailwind utilities are driven by one source.
        surface: {
          DEFAULT: 'var(--sc-surface)',
          muted: 'var(--sc-surface-muted)',
          sunken: 'var(--sc-surface-sunken)',
          inverse: 'var(--sc-surface-inverse)',
        },
        line: {
          DEFAULT: 'var(--sc-border)',
          strong: 'var(--sc-border-strong)',
        },
        ink: {
          DEFAULT: 'var(--sc-text)',
          muted: 'var(--sc-text-muted)',
          subtle: 'var(--sc-text-subtle)',
          inverse: 'var(--sc-text-inverse)',
        },
        brand: {
          50: 'var(--sc-brand-50)',
          100: 'var(--sc-brand-100)',
          200: 'var(--sc-brand-200)',
          500: 'var(--sc-brand-500)',
          600: 'var(--sc-brand-600)',
          700: 'var(--sc-brand-700)',
          900: 'var(--sc-brand-900)',
        },
        success: {
          50: 'var(--sc-success-50)',
          200: 'var(--sc-success-200)',
          600: 'var(--sc-success-600)',
          700: 'var(--sc-success-700)',
        },
        warn: {
          50: 'var(--sc-warn-50)',
          200: 'var(--sc-warn-200)',
          600: 'var(--sc-warn-600)',
          700: 'var(--sc-warn-700)',
        },
        danger: {
          50: 'var(--sc-danger-50)',
          200: 'var(--sc-danger-200)',
          600: 'var(--sc-danger-600)',
          700: 'var(--sc-danger-700)',
        },
      },
      borderRadius: {
        sc: 'var(--sc-radius)',
        'sc-lg': 'var(--sc-radius-lg)',
      },
      boxShadow: {
        sc: 'var(--sc-shadow)',
        'sc-md': 'var(--sc-shadow-md)',
        'sc-pop': 'var(--sc-shadow-pop)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      zIndex: {
        shell: '30',
        overlay: '60',
      },
    },
  },
  corePlugins: {
    // Angular Material ships its own normalisation; Tailwind's preflight on top
    // of it fights over button/input resets inside mat-* components.
    preflight: false,
  },
  plugins: [],
};
