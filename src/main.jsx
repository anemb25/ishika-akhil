import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Intro from "./Intro.jsx";     // 👈 NEW
import App from "./App.jsx";         // game
import Proposal from "./Proposal.jsx";

import "./styles.css";
import "./proposal.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* INTRO PAGE (FIRST SCREEN) */}
        <Route path="/" element={<Intro />} />

        {/* GAME */}
        <Route path="/game" element={<App />} />

        {/* PROPOSAL */}
        <Route path="/proposal" element={<Proposal />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);