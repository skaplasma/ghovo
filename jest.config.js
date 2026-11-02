module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/tests/**/*.ui.test.tsx'],
  clearMocks: true,
  testTimeout: 15000,
  moduleNameMapper: {
    '^@expo/vector-icons$': '<rootDir>/tests/mocks/vector-icons.js',
  },
};
