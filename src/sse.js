// Reads a server-sent event body, including events that arrive split across
// network chunks. Comment lines (heartbeats) are ignored.
export async function readServerEvents(response, { onEvent }) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventName = "message";

  const consume = (block, flush) => {
    const lines = block.split(/\r?\n/);
    if (!flush) buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line || line.startsWith(":")) continue;
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim() || "message";
        continue;
      }
      if (line.startsWith("data:")) {
        onEvent(eventName, line.slice(5).trim());
        eventName = "message";
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    consume(buffer, done);
    if (done) break;
  }
}

// Interview reply stream: append `delta` text, drop it on `reset` (a repaired
// model reply), and keep the final `done` payload or the `error` payload.
export function createInterviewStream() {
  let reply = "";
  let result = null;
  let failure = null;

  return {
    onEvent(event, raw) {
      let data = {};
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          failure = { status: 502, code: "AI_INVALID_OUTPUT", message: "The interviewer reply was interrupted. Try again." };
          return;
        }
      }
      if (event === "delta" && typeof data.text === "string" && data.text) reply += data.text;
      else if (event === "reset") reply = "";
      else if (event === "done") result = data;
      else if (event === "error") failure = data;
    },
    get reply() {
      return reply;
    },
    get result() {
      return result;
    },
    get failure() {
      return failure;
    },
  };
}
