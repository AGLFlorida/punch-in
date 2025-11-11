// Jest setup file for node environment tests
// This file runs before each test in the node environment

// Disable console.log and console.info during tests
const originalLog = console.log;
const originalInfo = console.info;

beforeAll(() => {
  console.log = jest.fn();
  console.info = jest.fn();
});

afterAll(() => {
  console.log = originalLog;
  console.info = originalInfo;
});

