// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    ignores: ['vault/.obsidian/**'],
  },
  {
    rules: {
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
    },
  },
  {
    files: ['../packages/crm-core/**/*.{ts,vue,mjs}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/martial_arts_template/**', 'martial-arts-acquisition', '**/sales_template/**', 'sales-crm'],
          message: 'Core must not import a vertical.',
        }],
      }],
    },
  },
)
