import { Component } from 'react';

/**
 * Catches render/lifecycle errors in a routed view so a single broken page shows a
 * themed fallback instead of blanking the whole app. Reset it by keying it on the
 * route path (see App.jsx) so navigating away clears the error.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[camelot] a view crashed:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div className="page page--center">
          <div className="pixel-panel" style={{ padding: 28, maxWidth: 540, textAlign: 'center' }}>
            <h2>A shadow falls on this hall</h2>
            <p className="font-body">Something went awry while rendering this view.</p>
            <p className="font-body t-ghost" style={{ fontSize: 16, wordBreak: 'break-word' }}>
              {String(error && error.message ? error.message : error)}
            </p>
            <button
              type="button"
              className="pixel-btn pixel-btn--gold"
              style={{ marginTop: 8 }}
              onClick={() => window.location.reload()}
            >
              Reload Camelot
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
