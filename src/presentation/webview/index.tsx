import React from 'react';
import ReactDOM from 'react-dom/client';
import 'reactflow/dist/style.css';
import App from './canvas-app';

try {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
} catch (error) {
  document.body.innerHTML = `<div style="color: red; padding: 20px;">
    <h3>React initialization failed:</h3>
    <pre>${error}</pre>
  </div>`;
}