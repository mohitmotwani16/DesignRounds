import crypto from "node:crypto";
import { invitationEmail } from "./emails/invitation.js";
import { loginCodeEmail } from "./emails/login-code.js";
import { plusWaitlistEmail } from "./emails/plus-waitlist.js";
import { welcomeEmail } from "./emails/welcome.js";
import { isProduction } from "./flags.js";

// Sends email (sign-in codes and notifications). Configure one provider:
//   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS  (e.g. a Gmail app password)
//   RESEND_API_KEY                                  (resend.com HTTP API)
// With neither set outside production, emails are printed to the server console.

const from = () => process.env.EMAIL_FROM || "DesignRounds <no-reply@designrounds.local>";

let smtpTransport;

export function deliveryMode() {
  if (process.env.SMTP_HOST) return "smtp";
  if (process.env.RESEND_API_KEY) return "resend";
  return isProduction ? "unconfigured" : "console";
}

export async function sendEmail({ to, subject, text, html }) {
  const recipients = Array.isArray(to) ? to : [to];
  // A unique reference per message stops Gmail threading unrelated emails together.
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
    await smtpTransport.sendMail({ from: from(), to: recipients.join(", "), subject, text, html, headers });
    return;
  }
  if (mode === "resend") {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: from(), to: recipients, subject, text, html, headers }),
    });
    if (!response.ok) throw new Error(`Resend rejected the email (${response.status}): ${await response.text()}`);
    return;
  }
  if (mode === "console") {
    console.log(`\n[email:console] to ${recipients.join(", ")}: ${subject}\n${text}\n`);
    return;
  }
  throw new Error("No email provider is configured.");
}

export async function sendLoginCode(email, code, { expiresInMinutes }) {
  const { subject, text, html } = loginCodeEmail({ email, code, expiresInMinutes });
  if (deliveryMode() === "console") {
    console.log(`\n[email:console] sign-in code for ${email}: ${code}\n`);
    return;
  }
  await sendEmail({ to: email, subject, text, html });
}

export async function sendWelcomeEmail(email, name) {
  const appUrl = ((process.env.APP_ORIGIN || "https://designrounds.in").split(",")[0].trim()).replace(/\/+$/, "");
  const { subject, text, html } = welcomeEmail({ name, appUrl });
  await sendEmail({ to: email, subject, text, html });
}

export async function sendPlusWaitlistEmail(email) {
  const appUrl = ((process.env.APP_ORIGIN || "https://designrounds.in").split(",")[0].trim()).replace(/\/+$/, "");
  const { subject, text, html } = plusWaitlistEmail({ appUrl });
  await sendEmail({ to: email, subject, text, html });
}

export async function sendInvitationEmail(details) {
  const { subject, text, html } = invitationEmail(details);
  await sendEmail({ to: details.email, subject, text, html });
}
