import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { CamelotProvider } from './state/CamelotContext.jsx';

// Theme layers, in order: tokens -> base -> pixel kit -> component styles.
import './styles/theme.css';
import './styles/global.css';
import './styles/pixel.css';
import './styles/components.css';

// Custom pixel cursor (settings.customCursor can turn it off later).
document.body.setAttribute('data-cursor', 'sword');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <CamelotProvider>
        <App />
      </CamelotProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
