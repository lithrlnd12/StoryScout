import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

if (typeof globalThis !== 'undefined') {
  (globalThis as any).__STORY_SCOUT_ENV__ = import.meta.env;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
