import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("app") as HTMLElement).render(
  <React.StrictMode>
    <App rioPreview={import.meta.env.DEV && new URLSearchParams(window.location.search).has('rio-v005')} />
  </React.StrictMode>
);
