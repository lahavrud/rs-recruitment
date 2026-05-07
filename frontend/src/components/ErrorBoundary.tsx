import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Top-level error boundary. Catches render-phase errors that would otherwise
 * produce a blank white screen and shows a recoverable Hebrew message instead.
 * Must be a class component — React's error boundary API only supports classes.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-void px-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-copper">
            שגיאה
          </p>
          <h1 className="mt-4 text-xl font-semibold text-white/90">
            משהו השתבש
          </h1>
          <p className="mt-2 text-sm text-white/50">
            אירעה שגיאה בלתי צפויה. אנא רעננו את הדף.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-sm bg-copper px-6 py-2.5 text-sm font-medium text-white transition hover:bg-gold"
          >
            רענן דף
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
