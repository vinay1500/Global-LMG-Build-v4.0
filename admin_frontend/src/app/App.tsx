import React from 'react';
import { BrowserRouter } from 'react-router';
import { AdminSessionProvider } from './providers/AdminSessionProvider';
import { AdminRoutes } from './router';

type AdminRuntimeGuardState = {
  error: Error | null;
};

class AdminRuntimeGuard extends React.Component<
  { children: React.ReactNode },
  AdminRuntimeGuardState
> {
  state: AdminRuntimeGuardState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AdminRuntimeGuardState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('admin_frontend.runtime_error', {
      componentStack: errorInfo.componentStack,
      message: error.message,
      stack: error.stack,
    });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#FCFBF8] text-[#2C2B29] flex items-center justify-center px-6">
          <div className="w-full max-w-2xl rounded-2xl border border-[#E6E4DD] bg-white p-8 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8C8981]">
              Global LMG
            </p>
            <h1 className="mt-3 text-3xl" style={{ fontFamily: "'Playfair Display', serif" }}>
              Admin frontend failed to render
            </h1>
            <p className="mt-3 text-sm text-[#5C5953]">
              The admin shell hit a runtime error before the page could load.
            </p>
            <div className="mt-6 rounded-xl border border-[#F5C2C7] bg-[#FDE8EC] p-4 text-sm text-[#8B1E2D]">
              <p className="font-semibold">{this.state.error.message}</p>
              {this.state.error.stack ? (
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs">
                  {this.state.error.stack}
                </pre>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => {
  return (
    <AdminRuntimeGuard>
      <AdminSessionProvider>
        <BrowserRouter>
          <AdminRoutes />
        </BrowserRouter>
      </AdminSessionProvider>
    </AdminRuntimeGuard>
  );
};

export default App;
