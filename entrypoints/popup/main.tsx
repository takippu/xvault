import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './App.css'; // Import the correct CSS file
import "~/assets/tailwind.css";
import { StorageProvider } from './contexts/StorageContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StorageProvider useIndexedDB={true}>
      <App />
    </StorageProvider>
  </React.StrictMode>,
);
