// Jest setup file for jsdom environment tests
// This file runs before each test in the jsdom environment

import '@testing-library/jest-dom';
import React from 'react';

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

// Mock Next.js router
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/'),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
}));

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    return React.createElement('img', props);
  },
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return React.createElement('a', { href }, children);
  };
});

