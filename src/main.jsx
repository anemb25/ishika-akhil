import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HashRouter, Routes, Route } from "react-router-dom";

import Intro from "./Intro.jsx";     // 👈 NEW
import App from "./App.jsx";         // game
import Proposal from "./Proposal.jsx";

import "./styles.css";
import "./proposal.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
 <HashRouter>
  <Routes>
    <Route path="/" element={<App />} />
    <Route path="/proposal" element={<Proposal />} />
  </Routes>
</HashRouter>
  </React.StrictMode>
);