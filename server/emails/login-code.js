// Sign-in code email: subject, preheader, HTML, and plain-text bodies.
//
// Built for email clients rather than browsers: table layout and inline styles
// (Outlook ignores most CSS), a hidden preheader that controls the inbox preview line,
// and colours that survive automatic dark-mode inversion. The code leads the subject so
// it is readable straight from a phone notification.

const BRAND = "DesignRounds";
const SITE_URL = "https://designrounds.in";

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

function formatRequestTime(date) {
  // One unambiguous timezone for everyone; the audience is mostly in India.
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(date) + " IST";
}

export function loginCodeEmail({ email, code, expiresInMinutes, requestedAt = new Date() }) {
  const when = formatRequestTime(requestedAt);
  const subject = `${code} is your ${BRAND} sign-in code`;
  const preheader = `Enter this code to sign in. It expires in ${expiresInMinutes} minutes.`;

  const text = [
    `Your ${BRAND} sign-in code`,
    "",
    `    ${code}`,
    "",
    `Enter this code on the sign-in screen to continue as ${email}.`,
    `It expires in ${expiresInMinutes} minutes and can only be used once.`,
    "",
    `Requested ${when}.`,
    "Didn't request this? You can safely ignore this email. Someone may have typed your address by mistake, and nobody can sign in without this code.",
    `${BRAND} will never ask you for this code by phone, chat, or email.`,
    "",
    `${BRAND} · Practice system design by doing it`,
    SITE_URL,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f8;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${escapeHtml(preheader)}${"&#8199;&#65279;&#847; ".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f8;">
  <tr><td align="center" style="padding:40px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
      <tr><td style="padding:0 4px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="width:28px;height:28px;background:#5b5bd6;border-radius:8px;text-align:center;vertical-align:middle;color:#ffffff;font-size:15px;font-weight:700;line-height:28px;">D</td>
          <td style="padding-left:10px;font-size:17px;font-weight:700;letter-spacing:-0.2px;color:#14161f;">design<span style="color:#5b5bd6;">rounds</span></td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid #e4e6ef;border-radius:16px;padding:36px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#14161f;">
        <h1 style="margin:0 0 8px;font-size:22px;line-height:1.3;font-weight:700;letter-spacing:-0.3px;color:#14161f;">Your sign-in code</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4a5064;">Enter this code on the sign-in screen to continue as <strong style="color:#14161f;">${escapeHtml(email)}</strong>.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" style="background:#f5f5fd;border:1px solid #dcdcf5;border-radius:12px;padding:22px 12px;">
            <div style="font-family:'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace;font-size:36px;line-height:1;font-weight:700;letter-spacing:10px;padding-left:10px;color:#14161f;">${escapeHtml(code)}</div>
          </td></tr>
        </table>
        <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#4a5064;">This code expires in <strong style="color:#14161f;">${expiresInMinutes} minutes</strong> and can only be used once.</p>
        <hr style="border:none;border-top:1px solid #eceef4;margin:28px 0 20px;">
        <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#6b7085;"><strong style="color:#4a5064;">Didn't request this?</strong> You can safely ignore this email. Someone may have typed your address by mistake, and nobody can sign in without this code.</p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7085;">${BRAND} will never ask you for this code by phone, chat, or email. Requested ${escapeHtml(when)}.</p>
      </td></tr>
      <tr><td align="center" style="padding:24px 8px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#8a8fa3;">
        ${BRAND} · Practice system design by doing it<br>
        <a href="${SITE_URL}" style="color:#5b5bd6;text-decoration:none;">designrounds.in</a> · You're receiving this because a sign-in was requested for this address.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  return { subject, preheader, text, html };
}
