import { suppressChime } from "./chime.js";
import { useEffect, useRef, useState } from "react";
import { Mic, Send, Trash2 } from "lucide-react";

export const VOICE_MAX_MS = 120_000;
const VOICE_MIN_MS = 1_000;
// In order of preference; Safari only records MP4 (AAC).
const TYPES = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4", "audio/webm"];

export function voiceSupported() {
  return typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

export function formatDuration(ms) {
  const seconds = Math.max(0, Math.round((ms || 0) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function spokenDuration(ms) {
  const seconds = Math.max(1, Math.round((ms || 0) / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return [minutes && `${minutes} minute${minutes === 1 ? "" : "s"}`, rest && `${rest} second${rest === 1 ? "" : "s"}`].filter(Boolean).join(" ");
}

// Records one voice answer at a time. `onRecorded` receives { id, blob, durationMs,
// mimeType } when the learner sends; a cancelled recording is discarded unseen.
export function useVoiceRecorder({ onRecorded }) {
  const [state, setState] = useState({ status: "idle", elapsed: 0, error: "" });
  const active = useRef(null);
  const mounted = useRef(true);
  const onRecordedRef = useRef(onRecorded);
  onRecordedRef.current = onRecorded;

  const release = (recording) => {
    window.clearInterval(recording.timer);
    recording.stream.getTracks().forEach((track) => track.stop());
    if (active.current === recording) active.current = null;
    suppressChime(false);
  };

  function finish(keep) {
    const recording = active.current;
    if (!recording || recording.recorder.state === "inactive") return;
    recording.keep = keep;
    recording.durationMs = Math.min(Math.round(performance.now() - recording.startedAt), VOICE_MAX_MS);
    window.clearInterval(recording.timer);
    recording.recorder.stop();
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const recording = active.current;
      if (recording) {
        recording.keep = false;
        if (recording.recorder.state !== "inactive") recording.recorder.stop();
        release(recording);
      }
    };
  }, []);

  async function start() {
    if (active.current || state.status === "requesting") return;
    setState({ status: "requesting", elapsed: 0, error: "" });
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (error) {
      const blocked = error.name === "NotAllowedError" || error.name === "SecurityError";
      if (mounted.current) setState({ status: "idle", elapsed: 0, error: blocked ? "Microphone access is blocked. Allow it in your browser's site settings to record." : "No microphone was found." });
      return;
    }
    if (!mounted.current) { stream.getTracks().forEach((track) => track.stop()); return; }

    const preferred = TYPES.find((type) => MediaRecorder.isTypeSupported?.(type));
    let recorder;
    try {
      recorder = new MediaRecorder(stream, { ...(preferred ? { mimeType: preferred } : {}), audioBitsPerSecond: 32_000 });
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setState({ status: "idle", elapsed: 0, error: "This browser can't record audio." });
      return;
    }

    const recording = { recorder, stream, chunks: [], startedAt: performance.now(), keep: false, durationMs: 0, timer: 0 };
    active.current = recording;
    suppressChime(true);
    recorder.ondataavailable = (event) => { if (event.data.size) recording.chunks.push(event.data); };
    recorder.onstop = () => {
      release(recording);
      if (!mounted.current) return;
      if (!recording.keep) return setState({ status: "idle", elapsed: 0, error: "" });
      if (recording.durationMs < VOICE_MIN_MS) return setState({ status: "idle", elapsed: 0, error: "That recording was too short to send." });
      setState({ status: "idle", elapsed: 0, error: "" });
      const mimeType = recorder.mimeType || preferred || recording.chunks[0]?.type || "audio/webm";
      onRecordedRef.current({ id: crypto.randomUUID(), blob: new Blob(recording.chunks, { type: mimeType }), durationMs: recording.durationMs, mimeType });
    };
    // At the limit the answer is sent as recorded, rather than lost.
    recording.timer = window.setInterval(() => {
      const elapsed = performance.now() - recording.startedAt;
      if (elapsed >= VOICE_MAX_MS) finish(true);
      else setState((current) => ({ ...current, elapsed }));
    }, 200);
    recorder.start(1000);
    setState({ status: "recording", elapsed: 0, error: "" });
  }

  return {
    ...state,
    start,
    send: () => finish(true),
    cancel: () => finish(false),
    dismissError: () => setState((current) => ({ ...current, error: "" })),
  };
}

// Replaces the text box while recording.
export function RecordingBar({ elapsed, onCancel, onSend }) {
  const nearLimit = VOICE_MAX_MS - elapsed <= 10_000;
  return (
    <div className="compose-box recording-bar" role="group" aria-label="Recording a voice answer" onKeyDown={(event) => { if (event.key === "Escape") onCancel(); }}>
      <button className="voice-secondary" aria-label="Discard recording" title="Discard" onClick={onCancel}><Trash2 size={15} /></button>
      <span className="recording-dot" aria-hidden="true" />
      <span className="recording-status">
        <strong className={nearLimit ? "near-limit" : ""}>{formatDuration(elapsed)}</strong>
        <span> / {formatDuration(VOICE_MAX_MS)}</span>
        <em>{nearLimit ? "Sends automatically at the limit" : "Recording…"}</em>
      </span>
      <button aria-label="Send voice answer" title="Send" autoFocus onClick={onSend}><Send size={16} /></button>
    </div>
  );
}

// Fixed bar heights so every voice answer reads as audio without a real waveform.
const BARS = [38, 62, 84, 50, 72, 96, 58, 40, 70, 88, 54, 34, 66, 92, 60, 44, 76, 52, 30, 46];

// A sent voice answer: duration only. There is deliberately no player — the server
// never returns recordings, as in a real interview you can't replay what you said.
export function VoiceNote({ durationMs }) {
  return (
    <div className="voice-note" role="img" aria-label={`Voice answer, ${spokenDuration(durationMs)}`}>
      <span className="voice-note-icon"><Mic size={14} /></span>
      <span className="voice-note-wave" aria-hidden="true">{BARS.map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</span>
      <span className="voice-note-time">{formatDuration(durationMs)}</span>
    </div>
  );
}
