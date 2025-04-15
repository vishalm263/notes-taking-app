// Polyfill imports
import { Buffer } from 'buffer';
import process from 'process';

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Setup global objects needed by MongoDB
window.Buffer = Buffer;
window.process = process;
window.global = window;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
