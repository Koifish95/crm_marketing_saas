export default [
  {
    files: ['**/*.ts', '**/*.vue', '**/*.mjs'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/martial_arts_template/**', 'martial_arts_template', '**/sales/**', '**/beauty/**'],
            message: 'Core must not import a vertical.',
          },
        ],
      }],
    },
  },
]
