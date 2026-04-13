import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Font imports via @fontsource
import "@fontsource/schibsted-grotesk/400.css";
import "@fontsource/schibsted-grotesk/500.css";
import "@fontsource/schibsted-grotesk/600.css";
import "@fontsource/schibsted-grotesk/700.css";
import "@fontsource-variable/inter";
import "@fontsource/noto-sans";
import "@fontsource/fustat/400.css";
import "@fontsource/fustat/500.css";
import "@fontsource/fustat/600.css";
import "@fontsource/fustat/700.css";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
