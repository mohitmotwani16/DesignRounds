import { Fragment } from "react";
import { Link } from "../router.js";

// Renders the small inline syntax used in written content:
// [label](/path) internal links, **bold** and `code`.
const TOKEN = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;

export function Rich({ text }) {
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1]) parts.push(<Link key={match.index} to={match[2]}>{match[1]}</Link>);
    else if (match[3]) parts.push(<strong key={match.index}>{match[3]}</strong>);
    else parts.push(<code key={match.index}>{match[4]}</code>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <Fragment>{parts}</Fragment>;
}

// Plain text of the same content (for llms.txt, descriptions).
export const plainText = (text) => text.replace(TOKEN, (_, label, _href, bold, code) => label ?? bold ?? code);
