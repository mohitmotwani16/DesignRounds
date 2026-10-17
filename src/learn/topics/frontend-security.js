export default {
  blocks: [
    { type: "p", text: "**Frontend security** protects users from attacks that run in or through their browser. The big four are **cross-site scripting (XSS)**, where an attacker's script runs on your page; **cross-site request forgery (CSRF)**, where another site makes the user's browser perform actions on yours; misconfigured **CORS**, which can expose APIs to other origins; and weak defences such as missing **Content Security Policy** or tokens stored where scripts can steal them." },
    {"type":"diagram","kind":"flow","caption":"Browser defences in layers: a Content Security Policy stops injected scripts, and SameSite cookies plus a CSRF token stop forged requests from other sites.","nodes":[{"id":"xss","label":"Injected script","sub":"XSS","col":0,"row":0,"tone":"danger"},{"id":"csp","label":"CSP","sub":"script-src self","col":1,"row":0,"tone":"accent"},{"id":"page","label":"Your page","col":2,"row":0},{"id":"api","label":"Your API","col":2,"row":1,"tone":"store"},{"id":"csrf","label":"Other site's form","sub":"CSRF","col":0,"row":1,"tone":"danger"},{"id":"token","label":"SameSite + token","col":1,"row":1,"tone":"accent"}],"edges":[{"from":"xss","to":"csp","label":"blocked","tone":"danger"},{"from":"csp","to":"page","label":"trusted only"},{"from":"page","to":"api","label":"cookie + token"},{"from":"csrf","to":"token","label":"forged POST","tone":"danger"},{"from":"token","to":"api","label":"rejected","dashed":true}]},

    { type: "h2", text: "Cross-site scripting (XSS)" },
    { type: "p", text: "XSS happens when untrusted data is inserted into a page in a way the browser executes as code. A comment containing `<img src=x onerror=\"steal(document.cookie)\">` that's rendered as raw HTML runs in every viewer's session, with full access to the page and its data." },
    { type: "table", head: ["Type", "How", "Example"], rows: [
      ["Stored", "Malicious input is saved and shown to other users", "A comment, profile name or product review"],
      ["Reflected", "Input from the URL is echoed into the page", "A search page that prints the query unescaped"],
      ["DOM-based", "Client-side code writes untrusted data into the DOM", "`element.innerHTML = location.hash`"],
    ] },
    { type: "ul", items: [
      "**Encode output by context:** HTML-escape text, attribute-encode attributes, and never build scripts or URLs from raw input. Modern frameworks escape text by default; the danger is the escape hatches (`dangerouslySetInnerHTML`, `v-html`, `innerHTML`).",
      "**Sanitise** any HTML you must render (rich text, markdown) with a well-maintained allow-list sanitiser.",
      "**Validate URLs** before using them in links or redirects; reject `javascript:` and other dangerous schemes.",
      "**Content Security Policy** (below) as a second line of defence.",
    ] },

    { type: "h2", text: "Content Security Policy (CSP)" },
    { type: "p", text: "CSP is a response header that tells the browser which sources of scripts, styles, images and connections are allowed. Even if an attacker injects markup, the browser refuses to run inline scripts or load scripts from unapproved origins." },
    { type: "code", code: `
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-r4nd0m';
  object-src 'none'; base-uri 'self'; frame-ancestors 'none'; upgrade-insecure-requests
` },
    { type: "ul", items: [
      "Avoid `'unsafe-inline'` and `'unsafe-eval'` for scripts; use nonces or hashes for the few inline scripts you need.",
      "`frame-ancestors` prevents your site from being framed by others (clickjacking).",
      "Roll out with `Content-Security-Policy-Report-Only` first to find violations without breaking the site.",
    ] },

    { type: "h2", text: "Cross-site request forgery (CSRF)" },
    { type: "p", text: "If a site authenticates with cookies, a malicious page can make the user's browser send a request to it (a form auto-submitting to `/transfer`), and the browser attaches the cookies automatically. Defences:" },
    { type: "ul", items: [
      "**SameSite cookies:** `SameSite=Lax` (a common default) or `Strict` stops cookies being sent on most cross-site requests.",
      "**CSRF tokens:** a per-session secret the server requires in a header or form field, which other sites can't read.",
      "**Check Origin or Referer** headers on state-changing requests.",
      "**Never change state on GET** requests.",
    ] },

    { type: "h2", text: "CORS" },
    { type: "p", text: "The same-origin policy stops scripts on one origin from reading responses from another. **CORS** (cross-origin resource sharing) lets a server relax that for specific origins with headers such as `Access-Control-Allow-Origin`. It's a relaxation, not a protection: the danger is misconfiguring it, for example reflecting any request's Origin while also allowing credentials, which lets any site read users' private data from your API. Allow-list exact origins, and only allow credentials where genuinely needed." },

    { type: "h2", text: "Storing tokens in the browser" },
    { type: "table", head: ["Storage", "XSS can steal it?", "CSRF risk?", "Notes"], rows: [
      ["HttpOnly, Secure, SameSite cookie", "No (scripts can't read it)", "Mitigated by SameSite and tokens", "The usual recommendation for session credentials"],
      ["localStorage / sessionStorage", "Yes", "No", "Any XSS can exfiltrate long-lived tokens"],
      ["In memory only", "Harder, but XSS can still act as the user", "No", "Lost on reload; paired with a refresh cookie"],
    ] },
    { type: "callout", tone: "tip", text: "No storage choice survives XSS completely: injected script can always act as the user while the page is open. Preventing XSS comes first; token storage limits how much damage it does afterwards. See [authentication](/learn/authentication-authorization)." },

    { type: "h2", text: "Other essentials" },
    { type: "ul", items: [
      "**HTTPS everywhere** with HSTS. See [encryption](/learn/encryption).",
      "**Subresource Integrity** hashes for scripts loaded from third-party CDNs.",
      "**Dependency hygiene:** audit and pin packages; a compromised dependency runs with your page's privileges.",
      "**Never trust the client:** validate and authorise everything on the server; client checks are for UX only.",
      "**Don't put secrets in frontend code:** anything shipped to the browser is public.",
    ] },
  ],
  uses: [
    { name: "Social and content apps", text: "Sanitised rich text and a strict CSP limit stored XSS from user content." },
    { name: "Banking and payments", text: "HttpOnly, SameSite session cookies with CSRF tokens protect state-changing requests." },
    { name: "Public APIs", text: "CORS allow-lists only first-party origins for credentialed requests." },
  ],
  interview: [
    "Explain stored, reflected and DOM XSS, and prevent them with output encoding and sanitisation.",
    "Add a nonce-based CSP as defence in depth.",
    "Prevent CSRF with SameSite cookies and tokens, and never mutate on GET.",
    "Configure CORS with exact origins and store session tokens in HttpOnly cookies.",
  ],
  related: ["authentication-authorization", "encryption", "browser-caching", "api-gateway", "frontend-system-design-interview"],
  practice: ["micro-frontend-platform", "collaborative-whiteboard"],
  reading: [
    { title: "Cross Site Scripting Prevention Cheat Sheet", publisher: "OWASP Foundation", url: "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html" },
    { title: "Content Security Policy (CSP)", publisher: "MDN Web Docs (Mozilla)", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP" },
  ],
};
