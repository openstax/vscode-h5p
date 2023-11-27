/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: './jest-environment.js',
  roots: ['src'],
  coverageDirectory: './coverage/',
  collectCoverage: true,
  coverageReporters: ['json'],
};
