import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { api } from "./api.js";
import { AuthProvider, useAuth } from "./auth.jsx";
import { findPrompt, prompts } from "./data/prompts.js";
import { FullPageMessage, LockedPromptDialog } from "./components/ui.jsx";
import { SiteNav } from "./components/site.jsx";
import { navigate, safeNext, useRoute } from "./router.js";
import LandingPage from "./pages/Landing.jsx";
import LibraryPage from "./pages/Library.jsx";
import OnboardingPage from "./pages/Onboarding.jsx";
import ProfilePage from "./pages/Profile.jsx";
import SignInPage from "./pages/SignIn.jsx";

const WorkspaceRoute = lazy(() => import("./workspace/Workspace.jsx"));
const loadingScreen = <FullPageMessage title="Loading…"><LoaderCircle size={18} className="spin" /></FullPageMessage>;

export default function App() {
  return (
    <AuthProvider>
      <Routes />
    </AuthProvider>
  );
}

function Routes() {
  const { path, params, raw } = useRoute();
  const auth = useAuth();
  const [lockedPromptId, setLockedPromptId] = useState(null);

  // Section deep links ("/?s=pricing") scroll themselves; every other route starts at the top.
  useEffect(() => { if (!params.get("s")) window.scrollTo(0, 0); }, [path]);

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
    return <SignInPage next={params.get("next")} />;
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

  let page;
  if (path === "/library") page = <LibraryPage onStart={startPrompt} initialTrack={params.get("track")} />;
  else if (path === "/profile") page = <ProfilePage onStart={startPrompt} />;
  else if (path === "/") page = <LandingPage onStart={startPrompt} section={params.get("s")} />;
  else page = <NotFound />;

  return (
    <div className="site-shell site">
      <SiteNav />
      {page}
      {lockedPromptId && <LockedPromptDialog prompt={findPrompt(lockedPromptId)} alternative={freeAlternative(lockedPromptId)} onStart={startPrompt} onClose={() => setLockedPromptId(null)} />}
    </div>
  );
}

// A free round from the same discipline (falling back to any free round).
function freeAlternative(promptId) {
  const locked = findPrompt(promptId);
  return prompts.find((prompt) => prompt.access === "free" && prompt.track === locked?.track) ?? prompts.find((prompt) => prompt.access === "free");
}

function NotFound() {
  return (
    <main className="not-found wrap">
      <span className="kicker">404</span>
      <h1>This page doesn't exist.</h1>
      <p>The link may be out of date, or the address may have a typo.</p>
      <div className="hero-ctas">
        <button className="btn btn-primary btn-lg" onClick={() => navigate("/")}>Go to the home page</button>
        <button className="btn btn-ghost btn-lg" onClick={() => navigate("/library")}>Browse all designs</button>
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
