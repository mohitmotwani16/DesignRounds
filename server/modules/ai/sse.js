const HEARTBEAT_MS = 15_000;

function write(res, chunk) {
  if (res.writableEnded) return;
  try {
    res.write(chunk);
  } catch {
    // The browser went away. The caller still finishes the reply so a retry can replay it.
  }
}

// Opens a server-sent event response. Each event is one JSON object. Comment
// heartbeats keep proxies from buffering or closing a quiet connection while the
// model is still thinking. Safe to call after the client disconnects.
export function openSse(res) {
  res.status(200);
  res.set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.socket?.setNoDelay?.(true);
  if (typeof res.flushHeaders === "function") res.flushHeaders();
  const heartbeat = setInterval(() => write(res, ": ping\n\n"), HEARTBEAT_MS);
  heartbeat.unref?.();

  let closed = false;
  const finish = () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    if (!res.writableEnded) res.end();
  };
  res.on("close", () => {
    closed = true;
    clearInterval(heartbeat);
  });

  return {
    send(event, data) {
      if (closed) return;
      write(res, `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    end: finish,
  };
}

export function wantsEventStream(req) {
  return (req.get("accept") || "").toLowerCase().includes("text/event-stream");
}
