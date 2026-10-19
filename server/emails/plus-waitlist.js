const SITE_URL = "https://designrounds.in";
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

// Sent once, when an address first joins the Plus waitlist.
export function plusWaitlistEmail({ appUrl = SITE_URL }) {
  const subject = "You're on the DesignRounds Plus list";
  const text = [
    "Hi there,",
    "",
    "Thanks for your interest in DesignRounds Plus. You're on the early-access list, and we'll email you the day Plus opens.",
    "",
    "Plus brings every round in the library, a live AI interviewer you talk your design through with, and feedback on both your design and the way you explain it.",
    "",
    `Until then, the free rounds are open: ${appUrl}/library`,
    "",
    "If you didn't ask to join, ignore this email or reply and we'll remove your address.",
    "",
    "DesignRounds · Practice system design by doing it",
  ].join("\n");
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:32px 16px;background:#f3f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#14161f">
<main style="max-width:520px;margin:0 auto;padding:32px;background:#fff;border:1px solid #e4e6ef;border-radius:16px">
<p style="margin:0 0 22px;font-size:17px;font-weight:700">design<span style="color:#5b5bd6">rounds</span></p>
<h1 style="margin:0 0 14px;font-size:24px">You're on the Plus list</h1>
<p style="margin:0 0 12px;line-height:1.65;color:#4a5064">Thanks for your interest in DesignRounds Plus. You're on the early-access list, and we'll email you the day Plus opens.</p>
<p style="margin:0 0 22px;line-height:1.65;color:#4a5064">Plus brings every round in the library, a live AI interviewer you talk your design through with, and feedback on both your design and the way you explain it.</p>
<p style="margin:0 0 12px"><a href="${escapeHtml(appUrl)}/library" style="display:inline-block;padding:11px 18px;border-radius:8px;background:#5b5bd6;color:#fff;text-decoration:none;font-weight:700">Practise free rounds</a></p>
<p style="margin:22px 0 0;line-height:1.6;color:#8a8fa3;font-size:13px">If you didn't ask to join, ignore this email or reply and we'll remove your address.</p>
<p style="margin:28px 0 0;padding-top:18px;border-top:1px solid #eceef4;color:#8a8fa3;font-size:12px">DesignRounds · Practice system design by doing it · <a href="${escapeHtml(SITE_URL)}" style="color:#5b5bd6">designrounds.in</a></p>
</main></body></html>`;
  return { subject, text, html };
}
