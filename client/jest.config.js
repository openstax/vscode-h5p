/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  // Some customizations on top of jsdom environment
  testEnvironment: './jest-environment.js',
  roots: ['src'],
  coverageDirectory: './coverage/',
  collectCoverage: true,
  coverageReporters: ['json'],
};
