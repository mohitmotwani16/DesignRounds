const BRAND = "DesignRounds";
const SITE_URL = "https://designrounds.in";
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

export function welcomeEmail({ name, appUrl = SITE_URL }) {
  const greeting = name ? `Hi ${name},` : "Hi there,";
  const subject = "Welcome to DesignRounds";
  const text = [
    greeting,
    "",
    "Welcome to DesignRounds — a place to learn system design by working through realistic interview problems.",
    "Choose a discipline, sketch your design, and practice explaining the trade-offs behind it.",
    "",
    `Explore the practice library: ${appUrl}/library`,
    `Browse the handbook: ${appUrl}/learn`,
    "",
    "Your progress is saved to your account so you can pick up where you left off.",
    "",
    "DesignRounds · Practice system design by doing it",
  ].join("\n");
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:32px 16px;background:#f3f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#14161f">
<main style="max-width:520px;margin:0 auto;padding:32px;background:#fff;border:1px solid #e4e6ef;border-radius:16px">
<p style="margin:0 0 22px;font-size:17px;font-weight:700">design<span style="color:#5b5bd6">rounds</span></p>
<h1 style="margin:0 0 14px;font-size:24px">${escapeHtml(greeting)}</h1>
<p style="margin:0 0 12px;line-height:1.65;color:#4a5064">Welcome to DesignRounds — a place to learn system design by working through realistic interview problems.</p>
<p style="margin:0 0 22px;line-height:1.65;color:#4a5064">Choose a discipline, sketch your design, and practice explaining the trade-offs behind it. Your progress is saved so you can pick up where you left off.</p>
<p style="margin:0 0 12px"><a href="${escapeHtml(appUrl)}/library" style="display:inline-block;padding:11px 18px;border-radius:8px;background:#5b5bd6;color:#fff;text-decoration:none;font-weight:700">Explore practice rounds</a></p>
<p style="margin:0;line-height:1.6"><a href="${escapeHtml(appUrl)}/learn" style="color:#5b5bd6">Browse the handbook</a></p>
<p style="margin:28px 0 0;padding-top:18px;border-top:1px solid #eceef4;color:#8a8fa3;font-size:12px">DesignRounds · Practice system design by doing it · <a href="${escapeHtml(SITE_URL)}" style="color:#5b5bd6">designrounds.in</a></p>
</main></body></html>`;
  return { subject, text, html };
}
