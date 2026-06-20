/** @type {import('jest').Config} */
module.exports = {
  ...require('../jest.config.base.js'),
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts', '!src/**/*.test.ts'],
};