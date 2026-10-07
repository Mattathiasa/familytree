import { Component, type ErrorInfo, type ReactNode } from 'react';

/* A render error must not leave a blank screen — a frozen or empty screen is a
   bug, not a slow network (UI_UX.md §7). The message is written for a
   non-technical user: what happened, what to do next, and an id they can quote
   rather than a stack trace. */

interface Props { children: ReactNode }
interface State { error: Error | null; errorId: string | null }

function newErrorId(): string {
  return `err-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, errorId: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, errorId: newErrorId() };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Until real observability lands (ROADMAP Phase 13) the console is the sink.
    console.error(`[${this.state.errorId ?? 'error'}]`, error, info.componentStack);
  }

  private readonly retry = (): void => {
    this.setState({ error: null, errorId: null });
  };

  override render(): ReactNode {
    const { error, errorId } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="error-page" role="alert">
        <div className="error-page-inner">
          <div className="eyebrow" style={{ color: 'var(--color-danger)' }}>Something went wrong</div>
          <h1>This page didn't load</h1>
          <p className="muted">
            Nothing you've saved is lost. Try again — and if it keeps happening, the reference below
            helps us find out why.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'var(--space-4)' }}>
            <button className="ft-btn ft-btn--primary" onClick={this.retry}>Try again</button>
            <a className="ft-btn ft-btn--secondary" href="/">Go to the start</a>
          </div>
          {errorId && <p className="muted small" style={{ marginTop: 'var(--space-4)' }}>Reference: <code>{errorId}</code></p>}
        </div>
      </div>
    );
  }
}
