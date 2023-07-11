/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['src'],
  coverageDirectory: './coverage/',
  collectCoverage: true,
  coverageReporters: ['json'],
};
