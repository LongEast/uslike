import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.jsx";
import { TutorialPositionProvider } from "./components/TutorialPositionContext.jsx";
import "./styles.css";

const router = createBrowserRouter([
  {
    path: "*",
    element: <App />,
  },
]);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <TutorialPositionProvider>
      <RouterProvider router={router} />
    </TutorialPositionProvider>
  </React.StrictMode>,
);
