import React from "react";
import { createRoot } from "react-dom/client";
import { startAnalytics } from "./analytics.js";
import "@xyflow/react/dist/style.css";
import "./theme.js";
import "./styles/theme.css";
import "./styles.css";
import "./styles/library.css";
import "./styles/workspace.css";
import "./styles/account.css";
import "./styles/site.css";
import App from "./App.jsx";
import { loadTopic } from "./learn/topics.js";
import { topicMeta } from "./learn/catalog.js";
import { hydrateCommunityFromPage, loadCommunityArticle } from "./learn/community.js";

// A Learn topic's body is its own chunk: load it before the first render so the
// prerendered article is replaced by the same article, not a loading state.
hydrateCommunityFromPage();
const topic = /^\/learn\/([a-z0-9-]+)\/?$/.exec(window.location.pathname)?.[1];
const ready = !topic || topic === "write" ? Promise.resolve()
  : topicMeta(topic) ? loadTopic(topic).catch(() => null)
  : loadCommunityArticle(topic);

ready.then(() => {
  createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  startAnalytics();
});
