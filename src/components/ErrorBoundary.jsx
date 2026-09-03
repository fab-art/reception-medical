import { Component } from 'react';

// Wraps the whole app. Without this, any uncaught error thrown during render
// (a bad Supabase response, a null field from an old record, etc.) unmounts
// the entire React tree and leaves the browser showing a blank white page
// with nothing in the UI to explain why - the only trace is a console error
// most people never open. This turns that into a visible, recoverable screen.
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
    console.error('[RSSB Reception] Unhandled error:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9] p-6">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3 text-lg font-bold">!</div>
            <h1 className="font-semibold text-gray-800 mb-1">Something went wrong</h1>
            <p className="text-sm text-gray-500 mb-4">
              The app hit an unexpected error and couldn't continue. Reloading usually
              fixes it; if it keeps happening, check the browser console for details.
            </p>
            <p className="text-xs font-mono text-gray-400 bg-gray-50 rounded p-2 mb-4 break-words">
              {String(this.state.error?.message || this.state.error)}
            </p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              className="w-full bg-rssb-blue text-white rounded-lg py-2 text-sm font-medium"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
