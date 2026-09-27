import { defineConfig } from '@pandacss/dev';
import { createPreset } from '@park-ui/panda-preset';
import slate from '@park-ui/panda-preset/colors/slate';
import teal from '@park-ui/panda-preset/colors/teal';

const config = defineConfig({
  preflight: true,

  hash: {
    className: true,
    cssVar: true
  },

  presets: [
    '@pandacss/preset-base',
    createPreset({
      // Teal after the Virtual Singer / Project SEKAI logo color.
      accentColor: teal,
      grayColor: slate,
      radius: 'lg'
    })
  ],

  // Where to look for your css declarations
  include: ['./src/**/*.{js,jsx,ts,tsx,astro}'],

  // Files to exclude
  exclude: [],

  staticCss: {
    recipes: {
      // text: ['*']
    },
    css: [
      {
        properties: {
          listStyleType: ['none', 'disc', 'decimal'],
          fontWeight: ['bold'],
          fontSize: ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']
        }
      }
    ]
  },
  jsxFramework: 'react',

  // The output directory for your css system
  outdir: './styled-system',

  importMap: {
    css: 'styled-system/css',
    recipes: 'styled-system/recipes',
    patterns: 'styled-system/patterns',
    jsx: 'styled-system/jsx'
  },

  conditions: {
    extend: {
      dark: ['&.dark, .dark &'],
      light: ['&.light, .light &']
    }
  },

  lightningcss: true
});

export default config;
