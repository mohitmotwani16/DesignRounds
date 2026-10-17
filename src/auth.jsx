import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children, initialStatus = "loading" }) {
  const [state, setState] = useState({ status: initialStatus, user: null, error: null });
  const [googleAuth, setGoogleAuth] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { user, googleAuth: google } = await api.session();
      setGoogleAuth(Boolean(google));
      setState({ status: user ? "signed-in" : "signed-out", user, error: null });
    } catch (error) {
      setState({ status: "signed-out", user: null, error });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => ({
    ...state,
    googleAuth,
    setUser: (user) => setState({ status: user ? "signed-in" : "signed-out", user, error: null }),
    refresh,
    signOut: async () => {
      try { await api.signOut(); } finally { setState({ status: "signed-out", user: null, error: null }); }
    },
  }), [state, googleAuth, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
