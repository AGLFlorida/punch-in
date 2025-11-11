import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/src/**/*.test.(ts|tsx|js)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
  // Projects for different test environments
  projects: [
    {
      displayName: 'node',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['**/src/**/*.test.(ts|js)', '!**/src/renderer/**/*.test.tsx'],
      moduleFileExtensions: ['ts', 'js', 'json'],
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup-node.ts'],
    },
    {
      displayName: 'jsdom',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      testMatch: ['**/src/renderer/**/*.test.tsx'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
          },
        }],
      },
    },
  ],
};
export default config;
