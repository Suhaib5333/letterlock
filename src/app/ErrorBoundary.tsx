import { Component, type ErrorInfo, type ReactNode } from 'react';
import { clearSavedGame } from '../state/store';
import { reportError } from '../lib/crash';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/**
 * Top-level safety net. A blank/white screen means an uncaught error unmounted the
 * whole React tree. This boundary catches ANY render/reducer error and shows a
 * recoverable card instead of a blank, so the app can never strand the player on an
 * empty screen — whatever the trigger. Recovery clears the saved match and reloads to
 * a clean home state (so a bad persisted state can't loop the crash).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface for diagnostics; never rethrow (that would re-blank the screen).
    // reportError always logs, and additionally reaches Sentry when a DSN is set,
    // so a white screen in the wild is visible instead of silent.
    const frame = info.componentStack?.split(String.fromCharCode(10))[1]?.trim();
    reportError(error, frame ? `render:${frame}` : 'render');
  }

  private recover = () => {
    try {
      clearSavedGame();
    } catch {
      /* ignore */
    }
    // Reload to a CLEAN home: drop any query (so a bad persisted state or a deep-link
    // param can't immediately re-trigger the same crash).
    window.location.replace(window.location.pathname);
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="crash" role="alert" data-testid="crash-screen">
        <div className="crash-card">
          <div className="crash-icon" aria-hidden="true">🔧</div>
          <h2>Something hiccuped</h2>
          <p>The match hit an unexpected snag. Let’s get you back to a fresh start.</p>
          <button className="btn btn-primary" data-testid="crash-recover" onClick={this.recover}>
            Back to home
          </button>
        </div>
      </div>
    );
  }
}
