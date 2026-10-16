import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";

// The canvas has to be still this long before the interviewer looks at it, and it looks
// at most this often. The server applies its own, stricter rules on top.
const QUIET_MS = 20_000;
const MIN_CHECK_GAP_MS = 45_000;

// Interview state for a round. Lives in the workspace (not the panel) so the
// conversation survives hiding the panel or switching to the Review tab.
export function useInterview({ sessionId, plan, roundActive, structureKey, settleSave, selectedIdRef, onProactiveTurn }) {
  const [data, setData] = useState({ status: "loading" });
  const [pending, setPending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const typingRef = useRef(false);
  const pendingRef = useRef(false);
  const attempt = useRef(null);
  const lastCheck = useRef(0);

  const load = useCallback(async () => {
    try {
      const result = await api.getInterview(sessionId);
      setData({ status: "ready", ...result });
    } catch (error) {
      setData((current) => (current.status === "ready" ? current : { status: "error", error }));
    }
  }, [sessionId]);

  useEffect(() => { load(); }, [load, plan, roundActive]);

  const appendTurns = (turns, extra = {}) => setData((current) => {
    const known = new Set(current.turns.map((turn) => turn.id));
    return { ...current, ...extra, turns: [...current.turns, ...turns.filter((turn) => !known.has(turn.id))] };
  });

  const send = useCallback(async (content, intent = "message") => {
    if (pendingRef.current) return false;
    // A retry of the same draft reuses its id, so it can't produce two replies.
    if (!attempt.current || attempt.current.content !== content || attempt.current.intent !== intent) {
      attempt.current = { id: crypto.randomUUID(), content, intent };
    }
    pendingRef.current = true;
    setPending(true);
    setSendError(null);
    try {
      await settleSave();
      const result = await api.sendInterviewMessage(sessionId, { requestId: attempt.current.id, content, intent, selectedNodeId: selectedIdRef.current });
      attempt.current = null;
      appendTurns(result.turns, result.state ? { state: result.state, allowance: result.allowance } : {});
      return true;
    } catch (error) {
      setSendError({ message: error.message, draft: content, intent, retryable: error.status === 0 || error.status >= 500 || error.code === "INTERVIEWER_BUSY" });
      if (error.status !== 0) attempt.current = null;
      return false;
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, [sessionId, settleSave, selectedIdRef]);

  // A voice answer. The recording keeps its request id across retries, so a retry
  // after a lost response can't save it twice. The blob is dropped once it's sent.
  const sendAudio = useCallback(async (recording) => {
    if (pendingRef.current) return false;
    pendingRef.current = true;
    setPending(true);
    setSendError(null);
    try {
      const data = await blobToBase64(recording.blob);
      const result = await api.sendInterviewAudio(sessionId, { requestId: recording.id, mimeType: recording.mimeType, durationMs: recording.durationMs, data });
      appendTurns(result.turns);
      return true;
    } catch (error) {
      setSendError({ message: error.message, intent: "audio", recording, retryable: error.status === 0 || error.status >= 500 || error.code === "INTERVIEWER_BUSY" });
      return false;
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, [sessionId]);

  // Proactive look at the canvas after it has been quiet for a while.
  const enabled = data.status === "ready" && data.access === "full" && data.aiAvailable && roundActive;
  const firstKey = useRef(structureKey);
  useEffect(() => {
    if (!enabled || structureKey === firstKey.current) return undefined;
    const timer = window.setTimeout(async () => {
      if (typingRef.current || pendingRef.current || Date.now() - lastCheck.current < MIN_CHECK_GAP_MS) return;
      lastCheck.current = Date.now();
      pendingRef.current = true;
      try {
        await settleSave();
        const result = await api.interviewCheck(sessionId, { selectedNodeId: selectedIdRef.current });
        if (result.action === "ask" && result.turn) {
          appendTurns([result.turn], { state: result.state, allowance: result.allowance });
          onProactiveTurn?.();
        }
      } catch {
        // A missed proactive question is harmless; the learner can always ask.
      } finally {
        pendingRef.current = false;
      }
    }, QUIET_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, structureKey, sessionId, settleSave, selectedIdRef, onProactiveTurn]);

  return { ...data, pending, sendError, clearError: () => setSendError(null), send, sendAudio, typingRef, reload: load };
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).slice(String(reader.result).indexOf(",") + 1));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
