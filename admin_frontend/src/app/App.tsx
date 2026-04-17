import React from 'react';
import { BrowserRouter } from 'react-router';
import { AdminSessionProvider } from './providers/AdminSessionProvider';
import { AdminRoutes } from './router';

const App = () => {
  return (
    <AdminSessionProvider>
      <BrowserRouter>
        <AdminRoutes />
      </BrowserRouter>
    </AdminSessionProvider>
  );
};

export default App;
