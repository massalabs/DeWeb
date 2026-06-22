module.exports = {
  extends: ['@massalabs'],
  overrides: [
    {
      files: ['src/**/*.ts'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
