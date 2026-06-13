import { describe, expect, it } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary', () => {
  it('flips into the recoverable error state when a child throws', () => {
    // getDerivedStateFromError is what turns an uncaught render/reducer error into the
    // recovery card instead of a blank white screen.
    expect(ErrorBoundary.getDerivedStateFromError(new Error('boom'))).toEqual({ hasError: true });
  });
});
