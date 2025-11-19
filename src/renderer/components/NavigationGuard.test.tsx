import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NavigationGuardProvider, useNavigationGuard } from './NavigationGuard';

// Test component that uses the guard
function TestComponent({ onGuardCall }: { onGuardCall?: (href: string) => void }) {
  const { registerGuard, unregisterGuard, checkGuard } = useNavigationGuard();

  React.useEffect(() => {
    const guard = async (href?: string) => {
      onGuardCall?.(href || '');
      return href !== '/blocked';
    };
    registerGuard(guard);
    return () => unregisterGuard();
  }, [registerGuard, unregisterGuard, onGuardCall]);

  return (
    <div>
      <button onClick={() => checkGuard('/allowed')}>Test Allowed</button>
      <button onClick={() => checkGuard('/blocked')}>Test Blocked</button>
    </div>
  );
}

describe('NavigationGuard', () => {
  test('provides guard context to children', () => {
    render(
      <NavigationGuardProvider>
        <TestComponent />
      </NavigationGuardProvider>
    );

    expect(screen.getByText('Test Allowed')).toBeInTheDocument();
    expect(screen.getByText('Test Blocked')).toBeInTheDocument();
  });

  test('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useNavigationGuard must be used within NavigationGuardProvider');

    console.error = originalError;
  });

  test('allows navigation when no guard is registered', async () => {
    function NoGuardComponent() {
      const { checkGuard } = useNavigationGuard();
      const [result, setResult] = React.useState<boolean | null>(null);

      React.useEffect(() => {
        checkGuard('/test').then(setResult);
      }, [checkGuard]);

      return <div>{result === null ? 'Checking...' : result ? 'Allowed' : 'Blocked'}</div>;
    }

    render(
      <NavigationGuardProvider>
        <NoGuardComponent />
      </NavigationGuardProvider>
    );

    await screen.findByText('Allowed');
  });

  test('calls guard function with href', async () => {
    const guardCall = jest.fn(() => Promise.resolve(true));

    function GuardComponent() {
      const { registerGuard, unregisterGuard, checkGuard } = useNavigationGuard();
      const [result, setResult] = React.useState<boolean | null>(null);

      React.useEffect(() => {
        registerGuard(guardCall);
        checkGuard('/test-href').then(setResult);
        return () => unregisterGuard();
      }, [registerGuard, unregisterGuard, checkGuard]);

      return <div>{result === null ? 'Checking...' : result ? 'Allowed' : 'Blocked'}</div>;
    }

    render(
      <NavigationGuardProvider>
        <GuardComponent />
      </NavigationGuardProvider>
    );

    await screen.findByText('Allowed');
    expect(guardCall).toHaveBeenCalledWith('/test-href');
  });

  test('blocks navigation when guard returns false', async () => {
    const guardCall = jest.fn(() => Promise.resolve(false));

    function GuardComponent() {
      const { registerGuard, unregisterGuard, checkGuard } = useNavigationGuard();
      const [result, setResult] = React.useState<boolean | null>(null);

      React.useEffect(() => {
        registerGuard(guardCall);
        checkGuard('/blocked-href').then(setResult);
        return () => unregisterGuard();
      }, [registerGuard, unregisterGuard, checkGuard]);

      return <div>{result === null ? 'Checking...' : result ? 'Allowed' : 'Blocked'}</div>;
    }

    render(
      <NavigationGuardProvider>
        <GuardComponent />
      </NavigationGuardProvider>
    );

    await screen.findByText('Blocked');
    expect(guardCall).toHaveBeenCalledWith('/blocked-href');
  });

  test('handles synchronous guard functions', async () => {
    const guardCall = jest.fn(() => true); // Synchronous return

    function GuardComponent() {
      const { registerGuard, unregisterGuard, checkGuard } = useNavigationGuard();
      const [result, setResult] = React.useState<boolean | null>(null);

      React.useEffect(() => {
        registerGuard(guardCall);
        checkGuard('/sync-href').then(setResult);
        return () => unregisterGuard();
      }, [registerGuard, unregisterGuard, checkGuard]);

      return <div>{result === null ? 'Checking...' : result ? 'Allowed' : 'Blocked'}</div>;
    }

    render(
      <NavigationGuardProvider>
        <GuardComponent />
      </NavigationGuardProvider>
    );

    await screen.findByText('Allowed');
    expect(guardCall).toHaveBeenCalledWith('/sync-href');
  });

  test('unregisterGuard clears the guard', async () => {
    const guardCall1 = jest.fn(() => Promise.resolve(false));

    function GuardComponent() {
      const { registerGuard, unregisterGuard, checkGuard } = useNavigationGuard();
      const [result, setResult] = React.useState<boolean | null>(null);
      const [step, setStep] = React.useState(0);

      React.useEffect(() => {
        if (step === 0) {
          registerGuard(guardCall1);
          checkGuard('/test').then((allowed) => {
            setResult(allowed);
            setStep(1);
          });
        } else if (step === 1) {
          unregisterGuard();
          checkGuard('/test').then(setResult);
        }
        return () => unregisterGuard();
      }, [registerGuard, unregisterGuard, checkGuard, step]);

      return <div>{result === null ? 'Checking...' : result ? 'Allowed' : 'Blocked'}</div>;
    }

    render(
      <NavigationGuardProvider>
        <GuardComponent />
      </NavigationGuardProvider>
    );

    // First check should be blocked
    await screen.findByText('Blocked');
    
    // After unregister, should allow (no guard)
    await screen.findByText('Allowed');
  });
});

