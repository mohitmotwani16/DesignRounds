const BRAND = "DesignRounds";
const SITE_URL = "https://designrounds.in";
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

export function invitationEmail({ email, plan, planExpiresAt, inviteUrl }) {
  const plusOffer = plan === "plus";
  const offer = plusOffer
    ? `Your invitation includes Plus access through ${planExpiresAt}.`
    : "Your invitation is for a free DesignRounds account.";
  const subject = plusOffer ? "You're invited to DesignRounds Plus" : "You're invited to DesignRounds";
  const text = [
    `Hello ${email},`,
    "",
    "You've been invited to DesignRounds, where you can practice system design with realistic interview problems and learn from the handbook.",
    offer,
    "",
    "Use the link below to sign in or create your account and accept the invitation. The link expires in 14 days and is intended only for you.",
    inviteUrl,
    "",
    "If you weren't expecting this invitation, you can ignore this message.",
    "",
    `${BRAND} · Practice system design by doing it`,
    SITE_URL,
  ].join("\n");
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:32px 16px;background:#f3f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#14161f">
<main style="max-width:520px;margin:0 auto;padding:32px;background:#fff;border:1px solid #e4e6ef;border-radius:16px">
<p style="margin:0 0 22px;font-size:17px;font-weight:700">design<span style="color:#5b5bd6">rounds</span></p>
<h1 style="margin:0 0 14px;font-size:24px">You're invited</h1>
<p style="margin:0 0 12px;line-height:1.65;color:#4a5064">Hello ${escapeHtml(email)}, you've been invited to DesignRounds, where you can practice system design with realistic interview problems and learn from the handbook.</p>
<p style="margin:0 0 22px;line-height:1.65;color:#4a5064">${escapeHtml(offer)}</p>
<p style="margin:0 0 16px"><a href="${escapeHtml(inviteUrl)}" style="display:inline-block;padding:11px 18px;border-radius:8px;background:#5b5bd6;color:#fff;text-decoration:none;font-weight:700">Accept invitation</a></p>
<p style="margin:0;line-height:1.6;color:#6b7085;font-size:13px">Sign in or create an account with <strong>${escapeHtml(email)}</strong> to accept. This personal link expires in 14 days. If you weren't expecting this invitation, you can ignore this message.</p>
<p style="margin:28px 0 0;padding-top:18px;border-top:1px solid #eceef4;color:#8a8fa3;font-size:12px">DesignRounds · Practice system design by doing it · <a href="${escapeHtml(SITE_URL)}" style="color:#5b5bd6">designrounds.in</a></p>
</main></body></html>`;
  return { subject, text, html };
}
