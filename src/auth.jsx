import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, cancelHumanWaiters, readStoredHumanPass, setHumanPass, setHumanPassListener, setHumanRequiredHandler } from "./api.js";

const AuthContext = createContext(null);

// Renew the human-check pass this long before it expires, invisibly, so a request
// is never refused for an expired pass during normal use.
const RENEW_BEFORE_MS = 2 * 60 * 60_000;
const RENEW_TICK_MS = 10 * 60_000;
// A renewal that fails while the pass is still valid waits this long before trying again.
const RENEW_RETRY_MS = 30 * 60_000;

function hydratePassFromStorage() {
  const stored = readStoredHumanPass();
  if (stored.launch) setHumanPass(stored.launch, stored.validUntil);
  return stored;
}

export function AuthProvider({ children, initialStatus = "loading" }) {
  const [state, setState] = useState({ status: initialStatus, user: null, error: null });
  const [googleAuth, setGoogleAuth] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState(null);
  const [humanCheckRequired, setHumanCheckRequired] = useState(false);
  const [humanPass, setHumanPassState] = useState(() => hydratePassFromStorage());
  // The visible check page is a fallback: shown only when the invisible check couldn't pass.
  const [humanVisible, setHumanVisible] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [renewRetryAt, setRenewRetryAt] = useState(0);

  const noteLaunch = useCallback((id, validUntil = "") => {
    setHumanPass(id, validUntil);
    setHumanPassState({ launch: id || "", validUntil: id ? validUntil || "" : "" });
    if (id) {
      setHumanCheckRequired(true);
      setHumanVisible(false);
    }
  }, []);

  // The server refused the pass (missing or expired): drop it, which starts the invisible check.
  const requireHuman = useCallback(() => {
    setHumanPass("");
    setHumanPassState({ launch: "", validUntil: "" });
  }, []);

  // The invisible check couldn't pass. Without a valid pass the visible check takes over;
  // with one still valid, nobody is interrupted: try again later.
  const passValid = Boolean(humanPass.launch && (!humanPass.validUntil || Date.parse(humanPass.validUntil) > Date.now()));
  const escalateHuman = useCallback(() => {
    if (passValid) setRenewRetryAt(Date.now() + RENEW_RETRY_MS);
    else setHumanVisible(true);
  }, [passValid]);

  const refresh = useCallback(async () => {
    try {
      const { user, googleAuth: google, turnstileSiteKey: siteKey, humanCheckRequired: required, launchId, humanValidUntil } = await api.session();
      setGoogleAuth(Boolean(google));
      setTurnstileSiteKey(siteKey || null);
      setHumanCheckRequired(Boolean(required));
      if (launchId) noteLaunch(launchId, humanValidUntil);
      else if (!user) noteLaunch("");
      else if (required) {
        // The server confirms a stored pass by returning its expiry; anything else means renew.
        const stored = readStoredHumanPass();
        if (stored.launch && humanValidUntil) noteLaunch(stored.launch, humanValidUntil);
        else if (stored.launch) requireHuman();
      }
      setState({ status: user ? "signed-in" : "signed-out", user, error: null });
    } catch (error) {
      setState({ status: "signed-out", user: null, error });
    }
  }, [noteLaunch, requireHuman]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => setHumanRequiredHandler(requireHuman), [requireHuman]);

  // Another tab renewed or cleared the shared pass.
  useEffect(() => {
    setHumanPassListener(({ launch, validUntil }) => {
      setHumanPassState({ launch, validUntil });
      if (launch) setHumanVisible(false);
    });
    return () => setHumanPassListener(null);
  }, []);

  // Re-evaluate "renewal due" now and then, and whenever the tab comes back into view.
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    const timer = window.setInterval(tick, RENEW_TICK_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const renewalDue = Boolean(humanPass.launch && humanPass.validUntil && Date.parse(humanPass.validUntil) - now < RENEW_BEFORE_MS && now >= renewRetryAt);
  // The invisible check runs when signed in without a current pass, or when it's about to expire.
  const humanBackgroundCheck = Boolean(state.status === "signed-in" && humanCheckRequired && turnstileSiteKey && !humanVisible && (!humanPass.launch || renewalDue));

  const confirmHuman = useCallback(async (token) => {
    const { launchId, humanValidUntil } = await api.confirmHuman(token);
    noteLaunch(launchId, humanValidUntil);
  }, [noteLaunch]);

  const value = useMemo(() => ({
    ...state,
    googleAuth,
    turnstileSiteKey,
    humanCheckRequired,
    humanLaunch: humanPass.launch,
    humanVisible,
    humanBackgroundCheck,
    noteLaunch,
    confirmHuman,
    requireHuman,
    escalateHuman,
    setUser: (user) => setState({ status: user ? "signed-in" : "signed-out", user, error: null }),
    refresh,
    signOut: async () => {
      try { await api.signOut(); } finally {
        cancelHumanWaiters();
        noteLaunch("");
        setHumanVisible(false);
        setHumanCheckRequired(false);
        setState({ status: "signed-out", user: null, error: null });
      }
    },
  }), [state, googleAuth, turnstileSiteKey, humanCheckRequired, humanPass.launch, humanVisible, humanBackgroundCheck, noteLaunch, confirmHuman, requireHuman, escalateHuman, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Whether the user's Plus membership is active. The server already reports an
// expired membership as "free", so the plan alone is enough.
export const isPlus = (user) => user?.plan === "plus";

export function useAuth() {
  return useContext(AuthContext);
}
