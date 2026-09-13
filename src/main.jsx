import React from "react";
import ReactDOM from "react-dom/client";
import CoupleScoreboard from "../couple-scoreboard.jsx";
import "./index.css";

// stub window.storage for local dev
if (!window.storage) {
  window.storage = {
    _db: {},
    async get(key) {
      return { value: this._db[key] || null };
    },
    async set(key, value) {
      this._db[key] = value;
    },
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CoupleScoreboard />
  </React.StrictMode>
);
