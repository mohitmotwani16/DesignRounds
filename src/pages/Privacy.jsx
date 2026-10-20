import { ChevronRight } from "lucide-react";
import { SiteFooter } from "../components/site.jsx";
import { Link } from "../router.js";

export const PRIVACY_UPDATED = "October 20, 2026";
export const CONTACT_EMAIL = "designrounds.app@gmail.com";

// What we collect, why, who processes it and how to delete it. Keep this in step with
// the schema (server/migrations) and the providers configured in production.
export default function PrivacyPage() {
  return (
    <main className="guide-page">
      <div className="wrap guide-wrap">
        <nav className="crumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><ChevronRight size={13} /><span aria-current="page">Privacy</span></nav>
        <article className="prose">
          <header>
            <span className="kicker">Last updated {PRIVACY_UPDATED}</span>
            <h1>Privacy Policy</h1>
          </header>
          <p>DesignRounds (designrounds.in) is a system design interview practice platform. This policy explains what we collect, why, who helps us process it, and how you can delete it. We don't sell your data, show ads, or use third-party tracking or analytics scripts.</p>

          <h2>What we collect</h2>
          <ul>
            <li><strong>Account details:</strong> your email address, and the profile you choose to add: display name, target role, experience level and headline.</li>
            <li><strong>Google sign-in:</strong> if you continue with Google, we receive your Google account ID, email address, whether Google has verified it, and your name. We don't receive your password or access your Gmail, contacts, Drive or anything else.</li>
            <li><strong>Your practice work:</strong> the designs you build, your notes and explanations, earlier versions of a design, your conversations with the AI interviewer, extracted technical context and communication gaps, and the reviews generated for you.</li>
            <li><strong>Voice answers:</strong> if you answer the interviewer by voice (a Plus feature), we store the recording, a verbatim transcript, a filler-reduced copy for technical context, and measurements of your delivery, such as speaking pace, filler words and pauses. These help inform later interviewer turns and your review. We don't use your voice to identify you.</li>
            <li><strong>Security and sign-in records:</strong> one-time sign-in codes (stored only as a hash), the browser user-agent of each signed-in session, and IP addresses used for rate limiting and abuse prevention.</li>
            <li><strong>Human check:</strong> Cloudflare Turnstile checks that a sign-in, the first time you open the site in a browser session while signed in, and a change of network (such as Wi-Fi to mobile data) comes from a person. Reloading the page in the same session runs the check in the background without blocking the site. We store the network address of the last successful check with your session so a different connection asks again. We receive only a pass or fail from Cloudflare. Cloudflare sees the page address, your IP address, and browser signals it uses to tell visitors from bots. This is not an advertising or analytics cookie.</li>
            <li><strong>Plus early-access list:</strong> if you ask for early access to Plus, we store your email address and when you asked, and send you one confirmation. We use it only to tell you when Plus opens. Ask us to remove it at any time; deleting your account removes it too.</li>
            <li><strong>Problem reports:</strong> if you report a problem, we store your email address, what you wrote, the page you were on and your browser's user agent, so we can investigate and reply. Deleting your account removes your reports.</li>
            <li><strong>Usage counts:</strong> how many AI reviews and interviewer replies you've used, so plan limits can be applied.</li>
          </ul>

          <h2>How we use it</h2>
          <ul>
            <li>To sign you in and keep you signed in.</li>
            <li>To save your designs so you can resume them on any device.</li>
            <li>To generate AI interviewer replies and reviews of your designs.</li>
            <li>To apply plan limits, prevent abuse and keep the service secure.</li>
            <li>To improve rounds and review quality using aggregate statistics, such as average scores per round.</li>
          </ul>

          <h2>Cookies and local storage</h2>
          <p>We use only the cookies needed for the site to work: a session cookie that keeps you signed in (up to 30 days), and a short-lived cookie that protects the Google sign-in step. Your browser's local storage holds preferences such as the color theme and canvas layout. There are no advertising or tracking cookies.</p>

          <h2>Who processes your data</h2>
          <p>We use a small number of service providers to run DesignRounds. They process data on our behalf:</p>
          <ul>
            <li><strong>Vercel:</strong> hosts the website and API.</li>
            <li><strong>Supabase:</strong> hosts our database, in the Mumbai (India) region.</li>
            <li><strong>Resend:</strong> delivers sign-in codes and other account emails, such as the Plus early-access confirmation.</li>
            <li><strong>Groq:</strong> converts voice answers to text. It receives the recording only, not your email address or name.</li>
            <li><strong>Cloudflare:</strong> provides Turnstile, the human check on the sign-in page and the Plus early-access form.</li>
            <li><strong>Google:</strong> provides Google sign-in, if you use it.</li>
            <li><strong>AI provider (currently the Google Gemini API):</strong> receives your design, notes and interview answers, including filler-reduced copies and extracted answer context, to generate replies and reviews. It does not receive your email address. Depending on the provider's terms for the service tier we use, the provider may retain or review this content to improve its services, so don't put personal or confidential information in your designs.</li>
          </ul>
          <p>We may disclose information if required by law, or to protect the security of the service and its users.</p>

          <h2>How long we keep it</h2>
          <ul>
            <li>Your account, designs, interview transcripts, derived answer context and reviews are kept until you delete them or your account.</li>
            <li>Voice recordings are deleted 30 days after they're transcribed. The transcript and delivery measurements stay with the practice round until you delete it or your account.</li>
            <li>Your free interviewer round is recorded against a one-way hash of your email address, not the address itself. That hash is kept after you delete your account, so the free round can't be claimed twice.</li>
            <li>Sign-in codes are deleted within a day, expired sessions are removed daily, and rate-limit records are removed once their time window ends.</li>
          </ul>

          <h2>Your choices and rights</h2>
          <ul>
            <li><strong>Access and correct:</strong> view and edit your profile at any time on your <Link to="/profile">profile page</Link>.</li>
            <li><strong>Delete:</strong> delete any practice round, or your whole account, from your profile. Deleting your account permanently removes your profile, designs, interview conversations and reviews from our database.</li>
            <li><strong>Sign out everywhere:</strong> end all of your sessions from your profile.</li>
            <li><strong>Google:</strong> you can remove DesignRounds' access at any time in your Google Account under Security, then "Third-party apps and services".</li>
          </ul>
          <p>For any other request about your data, including a copy of it, email us and we'll respond within 30 days.</p>

          <h2>Security</h2>
          <p>Data is encrypted in transit (HTTPS). Session tokens and sign-in codes are stored only as hashes, and sign-in attempts are rate limited. No system is perfectly secure, but we work to protect your information and will notify affected users of a breach as required by law.</p>

          <h2>Children</h2>
          <p>DesignRounds is not intended for children under 18, and we don't knowingly collect their data.</p>

          <h2>Changes</h2>
          <p>If we change this policy, we'll update the date above. For significant changes, we'll notify signed-in users on the site or by email.</p>

          <h2>Contact</h2>
          <p>Questions or requests: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
        </article>
      </div>
      <SiteFooter />
    </main>
  );
}
