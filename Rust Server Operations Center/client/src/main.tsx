import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handlers
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  console.error('Promise:', event.promise);
  
  // Prevent the default browser behavior that would log to console
  event.preventDefault();
  
  // You could also report this to an error tracking service
  // reportError(event.reason);
});

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  console.error('Message:', event.message);
  console.error('Source:', event.filename, 'Line:', event.lineno, 'Column:', event.colno);
});

createRoot(document.getElementById("root")!).render(<App />);
