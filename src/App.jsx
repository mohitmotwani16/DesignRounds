import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { api } from "./api.js";
import { AuthProvider, useAuth } from "./auth.jsx";
import { findPrompt, prompts, tracks } from "./data/prompts.js";
import { LEARN_PATH, topicMeta } from "./learn/catalog.js";
import { FullPageMessage, LockedPromptDialog } from "./components/ui.jsx";
import { SiteNav } from "./components/site.jsx";
import { Link, navigate, safeNext, useRoute } from "./router.js";
import { applyMeta, routeMeta } from "./seo.js";
import AboutPage from "./pages/About.jsx";
import PrivacyPage from "./pages/Privacy.jsx";
import TermsPage from "./pages/Terms.jsx";
import { LearnHubPage, LearnTopicPage } from "./pages/Learn.jsx";
import LandingPage from "./pages/Landing.jsx";
import LibraryPage from "./pages/Library.jsx";
import OnboardingPage from "./pages/Onboarding.jsx";
import ProfilePage from "./pages/Profile.jsx";
import RoundPage from "./pages/RoundPage.jsx";
import SignInPage from "./pages/SignIn.jsx";

const WorkspaceRoute = lazy(() => import("./workspace/Workspace.jsx"));
const loadingScreen = <FullPageMessage title="Loading…"><LoaderCircle size={18} className="spin" /></FullPageMessage>;

// `authStatus` lets the prerenderer render public pages as a signed-out visitor.
export default function App({ authStatus }) {
  return (
    <AuthProvider initialStatus={authStatus}>
      <Routes />
    </AuthProvider>
  );
}

function Routes() {
  const { path, params, raw, hash } = useRoute();
  const auth = useAuth();
  const [lockedPromptId, setLockedPromptId] = useState(null);

  // Title, description, canonical and structured data follow the route.
  useEffect(() => { applyMeta(routeMeta(path)); }, [path]);
  // A new page starts at the top; "/#section" links scroll themselves (Landing).
  useEffect(() => { if (!hash) window.scrollTo(0, 0); }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  // Practicing requires an account; browsing the catalog does not.
  const startPrompt = useCallback((promptId) => {
    const prompt = findPrompt(promptId);
    if (!prompt) return;
    if (prompt.access === "paid" && auth.user?.plan !== "plus") {
      setLockedPromptId(promptId);
      return;
    }
    navigate(`/start/${promptId}`);
  }, [auth.user]);

  if (path === "/signin") {
    if (auth.status === "signed-in") {
      return <Redirect to={params.get("next") || "/library"} />;
    }
    return <SignInPage next={params.get("next")} error={params.get("error")} />;
  }

  const needsAuth = path === "/welcome" || path === "/profile" || path.startsWith("/workspace/") || path.startsWith("/start/");
  if (needsAuth) {
    if (auth.status === "loading") return loadingScreen;
    if (auth.status !== "signed-in") {
      if (auth.error) {
        return <FullPageMessage title="Can't reach DesignRounds" action={<button className="button button-dark" onClick={auth.refresh}>Try again</button>}>{auth.error.message}</FullPageMessage>;
      }
      return <Redirect to={`/signin?next=${encodeURIComponent(raw)}`} />;
    }
    if (!auth.user.onboarded && path !== "/welcome") {
      return <Redirect to={`/welcome?next=${encodeURIComponent(raw)}`} />;
    }
  }

  if (path === "/welcome") return <OnboardingPage next={params.get("next")} />;
  if (path.startsWith("/start/")) return <StartRound promptId={path.slice("/start/".length)} />;
  if (path.startsWith("/workspace/")) return <Suspense fallback={loadingScreen}><WorkspaceRoute sessionId={path.slice("/workspace/".length)} /></Suspense>;
  if (path === "/workspace") return <Redirect to="/library" />;

  return (
    <div className="site-shell site">
      <SiteNav />
      <Page path={path} onStart={startPrompt} />
      {lockedPromptId && <LockedPromptDialog prompt={findPrompt(lockedPromptId)} alternative={freeAlternative(lockedPromptId)} onStart={startPrompt} onClose={() => setLockedPromptId(null)} />}
    </div>
  );
}

// Public pages (all prerendered) plus the profile.
function Page({ path, onStart }) {
  if (path === "/") return <LandingPage onStart={onStart} />;
  if (path === "/library") return <LibraryPage key="all" onStart={onStart} track="all" />;
  if (path === "/profile") return <ProfilePage onStart={onStart} />;
  if (path === "/about") return <AboutPage />;
  if (path === "/privacy") return <PrivacyPage />;
  if (path === "/terms") return <TermsPage />;

  const track = /^\/library\/([a-z-]+)$/.exec(path)?.[1];
  if (track && tracks.some((item) => item.id === track)) return <LibraryPage key={track} onStart={onStart} track={track} />;

  const round = /^\/system-design\/([a-z0-9-]+)$/.exec(path)?.[1];
  if (round && findPrompt(round)) return <RoundPage key={round} id={round} onStart={onStart} />;

  if (path === LEARN_PATH) return <LearnHubPage />;
  const topic = /^\/learn\/([a-z0-9-]+)$/.exec(path)?.[1];
  if (topic && topicMeta(topic)) return <LearnTopicPage key={topic} slug={topic} />;
  // The old guide URLs moved to /learn (the host also redirects them permanently).
  const guide = /^\/guide\/([a-z0-9-]+)$/.exec(path)?.[1];
  if (guide && topicMeta(guide)) return <Redirect to={`${LEARN_PATH}/${guide}`} />;

  return <NotFound />;
}

// A free round from the same discipline (falling back to any free round).
function freeAlternative(promptId) {
  const locked = findPrompt(promptId);
  return prompts.find((prompt) => prompt.access === "free" && prompt.track === locked?.track) ?? prompts.find((prompt) => prompt.access === "free");
}

export function NotFound() {
  return (
    <main className="not-found wrap">
      <span className="kicker">404</span>
      <h1>This page doesn't exist.</h1>
      <p>The link may be out of date, or the address may have a typo.</p>
      <div className="hero-ctas">
        <Link className="btn btn-primary btn-lg" to="/">Go to the home page</Link>
        <Link className="btn btn-ghost btn-lg" to="/library">Browse all designs</Link>
      </div>
    </main>
  );
}

function Redirect({ to }) {
  useEffect(() => { navigate(safeNext(to), { replace: true }); }, [to]);
  return null;
}

// Creates or resumes the learner's round on the server, then opens the workspace.
function StartRound({ promptId }) {
  const [error, setError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    api.startSession(promptId)
      .then(({ session }) => { if (!cancelled) navigate(`/workspace/${session.id}`, { replace: true }); })
      .catch((startError) => { if (!cancelled) setError(startError); });
    return () => { cancelled = true; };
  }, [promptId]);

  if (error) {
    const title = error.code === "PLAN_REQUIRED" ? "This is a Plus round" : error.code === "NOT_FOUND" ? "Design round not found" : "Couldn't start the round";
    return <FullPageMessage title={title} action={<button className="button button-dark" onClick={() => navigate("/library")}>Back to library</button>}>{error.message}</FullPageMessage>;
  }
  return <FullPageMessage title="Preparing your round…"><LoaderCircle size={18} className="spin" /></FullPageMessage>;
}
