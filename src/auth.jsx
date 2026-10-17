import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getHumanLaunch, setHumanLaunch, setHumanRequiredHandler } from "./api.js";

const AuthContext = createContext(null);

function transport(type) {
  if (!type || type === "unknown" || type === "none") return null;
  return type;
}

export function AuthProvider({ children, initialStatus = "loading" }) {
  const [state, setState] = useState({ status: initialStatus, user: null, error: null });
  const [googleAuth, setGoogleAuth] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState(null);
  const [humanCheckRequired, setHumanCheckRequired] = useState(false);
  const [humanLaunch, setHumanLaunchState] = useState("");
  const [humanReason, setHumanReason] = useState("launch");

  const noteLaunch = useCallback((id) => {
    setHumanLaunch(id);
    setHumanLaunchState(id || "");
    if (id) {
      setHumanReason("launch");
      setHumanCheckRequired(true);
    }
  }, []);

  const requireHuman = useCallback((reason) => {
    setHumanLaunch("");
    setHumanLaunchState("");
    setHumanReason(reason === "network" || reason === "NETWORK_CHANGED" ? "network" : "launch");
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { user, googleAuth: google, turnstileSiteKey: siteKey, humanCheckRequired: required, launchId } = await api.session();
      setGoogleAuth(Boolean(google));
      setTurnstileSiteKey(siteKey || null);
      setHumanCheckRequired(Boolean(required));
      if (launchId) noteLaunch(launchId);
      setState({ status: user ? "signed-in" : "signed-out", user, error: null });
    } catch (error) {
      setState({ status: "signed-out", user: null, error });
    }
  }, [noteLaunch]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => setHumanRequiredHandler(requireHuman), [requireHuman]);

  // A network change has to drop the check even if the next click hasn't happened yet.
  // The server repeats the test on every signed-in request, using the public address.
  useEffect(() => {
    if (state.status !== "signed-in" || !humanCheckRequired || !humanLaunch) return undefined;
    const connection = navigator.connection;
    let lastTransport = transport(connection?.type);

    const recheck = () => {
      if (!getHumanLaunch()) return;
      api.me().catch((error) => {
        if (error.code === "NETWORK_CHANGED") requireHuman("network");
        else if (error.code === "HUMAN_CHECK_REQUIRED") requireHuman("launch");
      });
    };
    const onConnection = () => {
      const next = transport(connection?.type);
      if (lastTransport && next && lastTransport !== next) requireHuman("network");
      if (next) lastTransport = next;
      else recheck();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") recheck();
    };

    connection?.addEventListener?.("change", onConnection);
    window.addEventListener("online", recheck);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      connection?.removeEventListener?.("change", onConnection);
      window.removeEventListener("online", recheck);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [state.status, humanCheckRequired, humanLaunch, requireHuman]);

  const confirmHuman = useCallback(async (token) => {
    const { launchId } = await api.confirmHuman(token);
    noteLaunch(launchId);
  }, [noteLaunch]);

  const value = useMemo(() => ({
    ...state,
    googleAuth,
    turnstileSiteKey,
    humanCheckRequired,
    humanLaunch,
    humanReason,
    noteLaunch,
    confirmHuman,
    setUser: (user) => setState({ status: user ? "signed-in" : "signed-out", user, error: null }),
    refresh,
    signOut: async () => {
      try { await api.signOut(); } finally {
        noteLaunch("");
        setHumanCheckRequired(false);
        setState({ status: "signed-out", user: null, error: null });
      }
    },
  }), [state, googleAuth, turnstileSiteKey, humanCheckRequired, humanLaunch, humanReason, noteLaunch, confirmHuman, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
