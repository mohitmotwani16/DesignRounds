const ESCAPES = { '"': '"', "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" };

// Pulls the top-level `message` string out of a JSON object as it arrives, so the
// chat can show the interviewer reply before the rest of the object (ids, stage,
// private communication notes) has been generated. Text inside other strings is
// ignored, including a nested field that happens to contain the word "message".
export function createMessageExtractor() {
  let buffer = "";
  let index = 0;
  let mode = "value";
  let depth = 0;
  let key = "";
  let done = false;

  // Reads a JSON string starting at `index` (the opening quote already consumed).
  // Incomplete escapes stay unconsumed so the next chunk can finish them.
  function readString(capture) {
    let local = "";
    while (index < buffer.length) {
      const character = buffer[index];
      if (character === "\\") {
        if (index + 1 >= buffer.length) return { needMore: true, local };
        const next = buffer[index + 1];
        if (next === "u") {
          if (index + 6 > buffer.length) return { needMore: true, local };
          const hex = buffer.slice(index + 2, index + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
            if (capture) local += "\\u";
            index += 2;
            continue;
          }
          if (capture) local += String.fromCharCode(Number.parseInt(hex, 16));
          index += 6;
          continue;
        }
        if (capture) local += ESCAPES[next] ?? next;
        index += 2;
        continue;
      }
      if (character === '"') {
        index += 1;
        return { done: true, local };
      }
      if (capture) local += character;
      index += 1;
    }
    return { needMore: true, local };
  }

  function push(chunk) {
    if (!chunk || done) return "";
    buffer += chunk;
    let out = "";

    while (index < buffer.length && !done) {
      const character = buffer[index];

      if (mode === "message" || mode === "string") {
        const result = readString(mode === "message");
        if (mode === "message") out += result.local;
        if (result.needMore) break;
        if (mode === "message") done = true;
        mode = "after";
        continue;
      }

      if (character === " " || character === "\n" || character === "\r" || character === "\t") {
        index += 1;
        continue;
      }

      if (mode === "readkey") {
        if (character === '"') {
          index += 1;
          mode = "colon";
          continue;
        }
        if (character === "\\") {
          if (index + 1 >= buffer.length) break;
          index += 2;
          continue;
        }
        key += character;
        index += 1;
        continue;
      }

      if (mode === "key") {
        if (character === '"') {
          index += 1;
          key = "";
          mode = "readkey";
          continue;
        }
        if (character === "}") {
          depth -= 1;
          index += 1;
          mode = "after";
          continue;
        }
        index += 1;
        continue;
      }

      if (mode === "colon") {
        index += 1;
        if (character === ":") mode = "value";
        continue;
      }

      if (mode === "value") {
        if (character === "{") {
          depth += 1;
          index += 1;
          mode = "key";
          continue;
        }
        if (character === "[") {
          depth += 1;
          index += 1;
          continue;
        }
        if (character === "}" || character === "]") {
          depth -= 1;
          index += 1;
          mode = "after";
          continue;
        }
        if (character === '"') {
          index += 1;
          mode = depth === 1 && key === "message" ? "message" : "string";
          key = "";
          continue;
        }
        if (character === ",") {
          mode = "after";
          continue;
        }
        index += 1;
        continue;
      }

      if (character === ",") {
        index += 1;
        mode = depth === 1 ? "key" : "value";
        continue;
      }
      if (character === "}" || character === "]") {
        depth -= 1;
        index += 1;
        continue;
      }
      mode = "value";
    }

    if (index > 0) {
      buffer = buffer.slice(index);
      index = 0;
    }
    return out;
  }

  return {
    push,
    get done() {
      return done;
    },
  };
}
