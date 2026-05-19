/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/index.ts'],
  coverageThreshold: {
    global: {
      lines: 80,
      statements: 80,
      branches: 70,
      functions: 80,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
};
