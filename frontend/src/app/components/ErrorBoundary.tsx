import React from 'react';

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Client app render error', error, errorInfo);
  }

  public render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fafafa] px-6 py-16">
        <div className="max-w-md rounded-[2rem] border border-red-100 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>
            Something went wrong
          </h1>
          <p className="mt-3 text-sm text-gray-500">
            The portal hit a display error. Reload the page to try again.
          </p>
          <button
            className="mt-6 rounded-full bg-gray-900 px-5 py-3 text-sm text-white hover:bg-black"
            onClick={() => window.location.reload()}
            type="button"
          >
            Reload page
          </button>
        </div>
      </main>
    );
  }
}
