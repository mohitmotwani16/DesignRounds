import { ChevronRight } from "lucide-react";
import { resetConsent } from "../analytics.js";
import { SiteFooter } from "../components/site.jsx";
import { Link } from "../router.js";

export const PRIVACY_UPDATED = "October 29, 2026";
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
          <p>DesignRounds (designrounds.in) is a system design interview practice platform. This policy explains what we collect, why, who helps us process it, and how you can delete it. We don't sell your data or show ads. We use two analytics tools to understand how the site is used, and their cookies and recordings only run if you agree.</p>

          <h2>What we collect</h2>
          <ul>
            <li><strong>Account details:</strong> your email address, and the profile you choose to add: display name, target role, experience level and headline.</li>
            <li><strong>Google sign-in:</strong> if you continue with Google, we receive your Google account ID, email address, whether Google has verified it, and your name. We don't receive your password or access your Gmail, contacts, Drive or anything else.</li>
            <li><strong>Your practice work:</strong> the designs you build, your notes and explanations, earlier versions of a design, your conversations with the AI interviewer, extracted technical context and communication gaps, and the reviews generated for you.</li>
            <li><strong>Voice answers:</strong> if you answer the interviewer by voice (a Plus feature), we store the recording, a verbatim transcript, a filler-reduced copy for technical context, and measurements of your delivery, such as speaking pace, filler words and pauses. These help inform later interviewer turns and your review. We don't use your voice to identify you.</li>
            <li><strong>Security and sign-in records:</strong> one-time sign-in codes (stored only as a hash), the browser user-agent of each signed-in session, and IP addresses used for rate limiting and abuse prevention.</li>
            <li><strong>Human check:</strong> Cloudflare Turnstile checks that a sign-in comes from a person, and repeats the check about once a day while you're signed in, usually in the background without blocking the site. We receive only a pass or fail from Cloudflare, and store when this browser last passed and the network address it passed from with your session. To fix sign-in problems, we keep a record of each check for 30 days: the outcome, any Cloudflare error code, the page, your browser's user agent, your country, your email address if you were signing in, and a random reference your browser keeps, which we show in error messages so you can quote it. Cloudflare sees the page address, your IP address, and browser signals it uses to tell visitors from bots. This is not an advertising or analytics cookie.</li>
            <li><strong>Plus early-access list:</strong> if you ask for early access to Plus, we store your email address and when you asked, and send you one confirmation. We use it only to tell you when Plus opens. Ask us to remove it at any time; deleting your account removes it too.</li>
            <li><strong>Problem reports:</strong> if you report a problem, we store your email address, what you wrote, the page you were on and your browser's user agent, so we can investigate and reply. Deleting your account removes your reports.</li>
            <li><strong>Usage counts:</strong> how many AI reviews and interviewer replies you've used, so plan limits can be applied.</li>
            <li><strong>Site analytics:</strong> which pages are visited and key steps such as signing up, starting a round or requesting a review. See <a href="#analytics">Analytics</a> below.</li>
          </ul>

          <h2>How we use it</h2>
          <ul>
            <li>To sign you in and keep you signed in.</li>
            <li>To save your designs so you can resume them on any device.</li>
            <li>To generate AI interviewer replies and reviews of your designs.</li>
            <li>To apply plan limits, prevent abuse and keep the service secure.</li>
            <li>To improve rounds and review quality using aggregate statistics, such as average scores per round.</li>
            <li>To find where the site is confusing or broken, using the analytics described below.</li>
          </ul>

          <h2 id="analytics">Analytics</h2>
          <p>We use PostHog and Microsoft Clarity to see how people move through the site, such as which pages lead to sign-ups and where people get stuck.</p>
          <ul>
            <li><strong>Without your consent:</strong> PostHog counts page visits and key steps (signing up, starting a round, requesting a review, joining the Plus early-access list) under a random ID that lives only in the open tab. Nothing is stored on your device, and nothing is recorded.</li>
            <li><strong>If you accept:</strong> PostHog and Clarity set cookies so a return visit is recognised, and record how pages are used (scrolling, clicks and page layout) so we can replay it and build heatmaps.</li>
            <li><strong>What is never recorded:</strong> your designs, notes, interviewer conversations, articles you write, your profile, and anything you type into a form. Those pages are blocked or masked in recordings, and email addresses are hidden wherever they appear.</li>
            <li><strong>Signed in:</strong> events are linked to your internal account ID and plan, so we can tell how many people finish a round. Your email address and name are not sent.</li>
          </ul>
          <p>Recordings are kept for about 30 days and event data for up to a year. You can change your choice at any time: <button type="button" className="link-button" onClick={resetConsent}>change my analytics choice</button>.</p>

          <h2>Cookies and local storage</h2>
          <p>We always use the cookies needed for the site to work: a session cookie that keeps you signed in (up to 30 days), and a short-lived cookie that protects the Google sign-in step. Your browser's local storage holds preferences such as the color theme, canvas layout and your analytics choice. If you accept analytics, PostHog and Clarity also set their own cookies (see <a href="#analytics">Analytics</a>). There are no advertising cookies.</p>

          <h2>Who processes your data</h2>
          <p>We use a small number of service providers to run DesignRounds. They process data on our behalf:</p>
          <ul>
            <li><strong>Vercel:</strong> hosts the website and API.</li>
            <li><strong>Supabase:</strong> hosts our database, in the Mumbai (India) region.</li>
            <li><strong>Resend:</strong> delivers sign-in codes and other account emails, such as the Plus early-access confirmation.</li>
            <li><strong>Groq:</strong> converts voice answers to text. It receives the recording only, not your email address or name.</li>
            <li><strong>Cloudflare:</strong> provides Turnstile, the human check on the sign-in page and the Plus early-access form.</li>
            <li><strong>Google:</strong> provides Google sign-in, if you use it.</li>
            <li><strong>PostHog:</strong> product analytics: page visits and key steps, and session recordings if you accept analytics.</li>
            <li><strong>Microsoft Clarity:</strong> heatmaps and session recordings, only if you accept analytics.</li>
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
