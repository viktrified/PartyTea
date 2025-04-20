import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import CustomRainbowKitProvider from "./RainbowKit.jsx";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}
createRoot(rootElement).render(
  <StrictMode>
    <CustomRainbowKitProvider>
      <BrowserRouter>
        {/* <GameProvider> */}
          <App />
        {/* </GameProvider> */}
      </BrowserRouter>
    </CustomRainbowKitProvider>
  </StrictMode>
);
