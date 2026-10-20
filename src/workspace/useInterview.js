import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { playChime, primeChime } from "./chime.js";

// The canvas has to be still this long before the interviewer looks at it, and it looks
// at most this often. The server applies its own, stricter rules on top.
const QUIET_MS = 20_000;
const MIN_CHECK_GAP_MS = 45_000;
// How often a visible v3 round ticks (the server rate-limits ticks on its own).
const VISIBLE_TICK_MS = 60_000;

// Interview state for a round. Lives in the workspace (not the panel) so the
// conversation survives hiding the panel or switching to the Review tab.
export function useInterview({ sessionId, plan, roundActive, structureKey, settleSave, selectedIdRef, onProactiveTurn }) {
  const [data, setData] = useState({ status: "loading" });
  const [pending, setPending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [pendingAudio, setPendingAudio] = useState(null);
  const [outgoing, setOutgoing] = useState(null);
  const [replyText, setReplyText] = useState(null);
  const typingRef = useRef(false);
  const pendingRef = useRef(false);
  // Ticks have their own flag: a background tick must never block the learner's send.
  const tickingRef = useRef(false);
  const attempt = useRef(null);
  const lastCheck = useRef(0);
  const generation = useRef(0);

  useEffect(() => () => { generation.current += 1; }, []);

  // Audio can only start after the learner has interacted with the page.
  useEffect(() => {
    window.addEventListener("pointerdown", primeChime, { once: true });
    window.addEventListener("keydown", primeChime, { once: true });
    return () => {
      window.removeEventListener("pointerdown", primeChime);
      window.removeEventListener("keydown", primeChime);
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const result = await api.getInterview(sessionId);
      setData({ status: "ready", ...result, receivedAt: Date.now() });
    } catch (error) {
      setData((current) => (current.status === "ready" ? current : { status: "error", error }));
    }
  }, [sessionId]);

  useEffect(() => { load(); }, [load, plan, roundActive]);

  const appendTurns = (turns, extra = {}) => setData((current) => {
    const known = new Set(current.turns.map((turn) => turn.id));
    return { ...current, ...extra, ...(extra.state ? { receivedAt: Date.now() } : {}), turns: [...current.turns, ...turns.filter((turn) => !known.has(turn.id))] };
  });

  // The chime plays as the interviewer starts replying (the first streamed text), or
  // when the reply arrives whole if it wasn't streamed.
  const streamHandlers = (gen) => {
    const handlers = {
      chimed: false,
      onDelta: (text) => {
        if (generation.current !== gen || !text) return;
        if (!handlers.chimed) { handlers.chimed = true; playChime(); }
        setReplyText((current) => (current ?? "") + text);
      },
      onReset: () => {
        if (generation.current === gen) setReplyText("");
      },
    };
    return handlers;
  };

  const send = useCallback(async (content, intent = "message") => {
    if (pendingRef.current) return false;
    // A retry of the same draft reuses its id, so it can't produce two replies.
    if (!attempt.current || attempt.current.content !== content || attempt.current.intent !== intent) {
      attempt.current = { id: crypto.randomUUID(), content, intent };
    }
    const gen = generation.current;
    pendingRef.current = true;
    setPending(true);
    setSendError(null);
    setOutgoing({ kind: intent === "hint" ? "hint_request" : "message", content: content.trim() || "Could I have a hint?" });
    setReplyText("");
    try {
      await settleSave();
      const handlers = streamHandlers(gen);
      const result = await api.sendInterviewMessage(sessionId, { requestId: attempt.current.id, content, intent, selectedNodeId: selectedIdRef.current }, handlers);
      attempt.current = null;
      if (generation.current === gen) {
        if (!handlers.chimed) playChime();
        appendTurns(result.turns, result.state ? { state: result.state, allowance: result.allowance } : {});
      }
      return true;
    } catch (error) {
      const retryable = error.status === 0 || error.status >= 500 || error.code === "INTERVIEWER_BUSY";
      if (generation.current === gen) setSendError({ message: error.message, draft: content, intent, retryable });
      if (!retryable) attempt.current = null;
      return false;
    } finally {
      pendingRef.current = false;
      if (generation.current === gen) {
        setPending(false);
        setOutgoing(null);
        setReplyText(null);
      }
    }
  }, [sessionId, settleSave, selectedIdRef]);

  // A voice answer: transcribed and answered on the server, like a typed message. The
  // recording keeps its request id across retries, so a retry after a lost response
  // can't produce two replies. The blob is dropped once the answer is through.
  const sendAudio = useCallback(async (recording) => {
    if (pendingRef.current) return false;
    const gen = generation.current;
    pendingRef.current = true;
    setPending(true);
    setPendingAudio({ durationMs: recording.durationMs });
    setReplyText("");
    setSendError(null);
    try {
      await settleSave();
      const data = await blobToBase64(recording.blob);
      const handlers = streamHandlers(gen);
      const result = await api.sendInterviewAudio(sessionId, { requestId: recording.id, mimeType: recording.mimeType, durationMs: recording.durationMs, data, selectedNodeId: selectedIdRef.current }, handlers);
      if (generation.current === gen) {
        if (!handlers.chimed) playChime();
        appendTurns(result.turns, result.state ? { state: result.state, allowance: result.allowance } : {});
      }
      return true;
    } catch (error) {
      if (generation.current === gen) setSendError({ message: error.message, intent: "audio", recording, retryable: error.status === 0 || error.status >= 500 || error.code === "INTERVIEWER_BUSY" });
      return false;
    } finally {
      pendingRef.current = false;
      if (generation.current === gen) {
        setPending(false);
        setPendingAudio(null);
        setReplyText(null);
      }
    }
  }, [sessionId, settleSave, selectedIdRef]);

  // A background tick: the server decides whether anything is worth saying (a question
  // about the canvas, a time check, a gentle check-in) and most ticks end with nothing.
  const enabled = data.status === "ready" && data.access === "full" && data.aiAvailable && roundActive;
  const tick = useCallback(async (reason) => {
    if (pendingRef.current || tickingRef.current) return;
    tickingRef.current = true;
    try {
      if (reason === "canvas_quiet") await settleSave();
      const result = await api.interviewTick(sessionId, { reason, typing: typingRef.current, selectedNodeId: selectedIdRef.current });
      if ((result.action === "ask" || result.action === "say") && result.turn) {
        appendTurns([result.turn], { state: result.state, allowance: result.allowance });
        playChime();
        if (result.action === "ask") onProactiveTurn?.();
      }
    } catch {
      // A missed tick is harmless; the learner can always ask.
    } finally {
      tickingRef.current = false;
    }
  }, [sessionId, settleSave, selectedIdRef, onProactiveTurn]);

  // Look at the canvas after it has been quiet for a while.
  const firstKey = useRef(structureKey);
  useEffect(() => {
    if (!enabled || structureKey === firstKey.current) return undefined;
    const timer = window.setTimeout(() => {
      if (typingRef.current || Date.now() - lastCheck.current < MIN_CHECK_GAP_MS) return;
      lastCheck.current = Date.now();
      tick("canvas_quiet");
    }, QUIET_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, structureKey, tick]);

  // v3 rounds keep a clock: a tick while the tab is visible lets the interviewer pace the
  // round (time checks, wrap-up) and check in after a long silence. Hidden tabs don't tick.
  const v3 = data.state?.engine === "v3";
  useEffect(() => {
    if (!enabled || !v3) return undefined;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") tick("visible");
    }, VISIBLE_TICK_MS);
    return () => window.clearInterval(timer);
  }, [enabled, v3, tick]);

  const setMode = useCallback(async (mode) => {
    const result = await api.setInterviewMode(sessionId, mode);
    setData((current) => ({ ...current, state: result.state, turns: result.turns }));
  }, [sessionId]);

  const sendFeedback = useCallback((turnId, reason) => api.interviewFeedback(sessionId, turnId, { rating: "down", reason }), [sessionId]);

  return { ...data, sessionId, pending, pendingAudio, outgoing, replyText, sendError, clearError: () => setSendError(null), send, sendAudio, typingRef, reload: load, setMode, sendFeedback, receivedAt: data.receivedAt };
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).slice(String(reader.result).indexOf(",") + 1));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
