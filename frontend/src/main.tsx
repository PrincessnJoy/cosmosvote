import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { WalletProvider } from './WalletContext';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </StrictMode>
);
