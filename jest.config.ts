import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/src/**/*.test.(ts|js)'],
  moduleFileExtensions: ['ts', 'js', 'json'],
};
export default config;
