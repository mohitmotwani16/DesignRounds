import { Fragment } from "react";
import { Link } from "../router.js";

// Renders the small inline syntax used in written content:
// [label](/path) internal links, **bold** and `code`.
const TOKEN = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;

export function Rich({ text, linkClassName, onInternalLinkClick }) {
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1]) {
      const href = match[2];
      const label = match[1];
      // External links (only https?, never javascript: or data:) open in a new tab and
      // carry no ranking endorsement, since community content can contain them.
      if (/^https?:\/\//i.test(href)) parts.push(<a key={match.index} href={href} target="_blank" rel="nofollow ugc noopener noreferrer">{label}</a>);
      else if (href.startsWith("/")) {
        parts.push(
          <Link
            key={match.index}
            to={href}
            className={linkClassName}
            onClick={onInternalLinkClick ? (event) => onInternalLinkClick(event, { href, label }) : undefined}
          >
            {label}
          </Link>,
        );
      }
      else parts.push(label);
    }
    else if (match[3]) parts.push(<strong key={match.index}>{match[3]}</strong>);
    else parts.push(<code key={match.index}>{match[4]}</code>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <Fragment>{parts}</Fragment>;
}

// Plain text of the same content (for llms.txt, descriptions).
export const plainText = (text) => text.replace(TOKEN, (_, label, _href, bold, code) => label ?? bold ?? code);
