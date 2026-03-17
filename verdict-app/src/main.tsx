import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { LocaleProvider } from './context/LocaleContext';
import { ThemeProvider } from './context/ThemeContext';
import { UserProvider } from './context/UserContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LocaleProvider>
        <UserProvider>
          <App />
        </UserProvider>
      </LocaleProvider>
    </ThemeProvider>
  </React.StrictMode>
);
