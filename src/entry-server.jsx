// Server entry for build-time prerendering (scripts/prerender.mjs): renders one URL
// of the app to HTML, as a signed-out visitor would see it.
import { renderToString } from "react-dom/server";
import App, { NotFound } from "./App.jsx";
import { setServerLocation } from "./router.js";
import { SiteFooter, SiteNav } from "./components/site.jsx";
import { AuthProvider } from "./auth.jsx";

export { publicPaths, routeMeta, metaHtml, SITE, TRACK_SEO, roundPath, trackPath } from "./seo.js";
export { prompts, tracks, getTrack } from "./data/prompts.js";
export { CATEGORIES, TOPICS, topicPath } from "./learn/catalog.js";
export { preloadAllTopics } from "./learn/topics.js";
export { setCommunityArticles, communityArticles } from "./learn/community.js";
export { aiLimits } from "./data/plans.js";

export function render(url) {
  setServerLocation(url);
  return renderToString(<App authStatus="signed-out" />);
}

export function renderNotFound() {
  setServerLocation("/404");
  return renderToString(
    <AuthProvider initialStatus="signed-out">
      <div className="site-shell site"><SiteNav /><NotFound /><SiteFooter /></div>
    </AuthProvider>,
  );
}
