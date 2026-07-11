import { Component, type ReactNode } from 'react';

/**
 * Stage 8 hardening: if anything unexpected breaks, the user sees a calm
 * explanation instead of a blank page, and their data stays safe on disk.
 */
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main>
        <h1>Something went wrong on this screen</h1>
        <p>
          Your work is safe. Everything you have entered is saved on this
          computer the moment you submit it, and nothing is lost when a
          screen misbehaves.
        </p>
        <p>
          Reload the page to continue. If this keeps happening, use
          "Export this project" from the project screen to keep your own
          copy, and note what you were doing when it occurred.
        </p>
        <button className="primary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </main>
    );
  }
}
