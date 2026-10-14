import crypto from "node:crypto";
import { loginCodeEmail } from "./emails/login-code.js";
import { isProduction } from "./flags.js";

// Sends sign-in codes. Configure one provider:
//   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS  (e.g. a Gmail app password)
//   RESEND_API_KEY                                  (resend.com HTTP API)
// With neither set outside production, codes are printed to the server console.

const from = () => process.env.EMAIL_FROM || "DesignRounds <no-reply@designrounds.local>";

let smtpTransport;

export function deliveryMode() {
  if (process.env.SMTP_HOST) return "smtp";
  if (process.env.RESEND_API_KEY) return "resend";
  return isProduction ? "unconfigured" : "console";
}

export async function sendLoginCode(email, code, { expiresInMinutes }) {
  const { subject, text, html } = loginCodeEmail({ email, code, expiresInMinutes });
  // A unique reference per message stops Gmail threading every code into one conversation.
  const headers = { "X-Entity-Ref-ID": crypto.randomUUID() };

  const mode = deliveryMode();
  if (mode === "smtp") {
    if (!smtpTransport) {
      const { default: nodemailer } = await import("nodemailer");
      const port = Number(process.env.SMTP_PORT || 587);
      smtpTransport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      });
    }
    await smtpTransport.sendMail({ from: from(), to: email, subject, text, html, headers });
    return;
  }
  if (mode === "resend") {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: from(), to: [email], subject, text, html, headers }),
    });
    if (!response.ok) throw new Error(`Resend rejected the email (${response.status}): ${await response.text()}`);
    return;
  }
  if (mode === "console") {
    console.log(`\n[email:console] sign-in code for ${email}: ${code}\n`);
    return;
  }
  throw new Error("No email provider is configured.");
}
