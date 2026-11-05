import { ChevronRight } from "lucide-react";
import { resetConsent } from "../analytics.js";
import { SiteFooter } from "../components/site.jsx";
import { Link } from "../router.js";

export const PRIVACY_UPDATED = "November 5, 2026";
export const CONTACT_EMAIL = "designrounds.app@gmail.com";

// This page says only what the law requires (DPDP Act and Rules, IT Act SPDI Rules, GDPR
// Art. 13, CalOPPA, Google's user data policy, Microsoft's Clarity guidance), so please
// don't add anything beyond that. Keep it true to the schema (server/migrations) and to
// production. Infrastructure is described by what it does, not by vendor. A new data
// type, purpose or kind of provider still needs a change here.
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
          <p>This policy explains how DesignRounds (designrounds.in) handles your personal data. Contact us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>

          <h2>What we collect</h2>
          <ul>
            <li><strong>Account:</strong> your email address and any profile details you add, such as your name, target role, experience level and headline. If you use Google sign-in, we receive your Google account ID, email address, its verification status and your name.</li>
            <li><strong>Practice work:</strong> your designs, notes, interviewer conversations and ratings, and the analysis and reviews generated from them.</li>
            <li><strong>Voice answers:</strong> the recording, its transcript, and delivery measurements such as pace, filler words and pauses. We don't use your voice to identify you.</li>
            <li><strong>Articles:</strong> articles you write and your messages with our reviewers. Published articles appear publicly with your name.</li>
            <li><strong>Requests:</strong> your email address and details you send when you report a problem, accept an invitation or join a waitlist.</li>
            <li><strong>Security and usage records:</strong> IP address, browser details, approximate country, sign-in activity, human-check results and how many AI features you've used.</li>
            <li><strong>Analytics:</strong> see <a href="#analytics">Analytics and cookies</a>.</li>
          </ul>
          <p>You need an email address to create an account. Everything else is optional or depends on the features you use.</p>

          <h2>Why we use it</h2>
          <p>We use your data to provide your account and practice rounds, generate AI replies and reviews, send account emails, apply plan limits, keep the service secure, and fix and improve the service. Our legal bases are providing the service you asked for, your consent for optional analytics, and our legitimate interest in keeping the service secure and improving it.</p>

          <h2 id="analytics">Analytics and cookies</h2>
          <p>We use PostHog and Microsoft Clarity to understand how the site is used. See the <a href="https://www.microsoft.com/privacy/privacystatement" rel="noopener noreferrer">Microsoft Privacy Statement</a> for how Microsoft handles data.</p>
          <ul>
            <li><strong>Without your consent:</strong> PostHog counts page visits and key steps under a random ID that lasts only for the open tab.</li>
            <li><strong>If you accept:</strong> PostHog and Clarity set cookies to recognise return visits and record how you use pages (scrolling, clicks and page layout) to produce session replays and heatmaps. Form inputs and your practice work are masked or blocked. If you're signed in, this is linked to your internal account ID and plan.</li>
          </ul>
          <p>We also use essential cookies that keep you signed in for up to 30 days and protect Google sign-in, and local storage for your preferences. You can <button type="button" className="link-button" onClick={resetConsent}>change your analytics choice</button> at any time.</p>
          <p>We don't respond to browser Do Not Track signals. If you accept analytics, PostHog and Microsoft may collect information about your activity over time, and Microsoft's third-party cookies may also apply on other sites.</p>

          <h2>Who receives your data</h2>
          <ul>
            <li><strong>Hosting, storage and content delivery providers:</strong> run the site and store your data.</li>
            <li><strong>Email delivery providers:</strong> send account emails.</li>
            <li><strong>AI model providers:</strong> receive your designs, notes, answers and transcripts, but not your email address, to generate replies and reviews. Depending on its terms, a provider may retain or review this content, so don't include personal or confidential information.</li>
            <li><strong>Speech-to-text providers:</strong> receive voice recordings, but not your name or email address, to transcribe them.</li>
            <li><strong>Cloudflare Turnstile:</strong> checks that visitors are human. Cloudflare sees your IP address, the page address and browser signals, and may use them to improve its bot detection.</li>
            <li><strong>Google:</strong> provides Google sign-in, if you use it.</li>
            <li><strong>PostHog and Microsoft Clarity:</strong> provide analytics, as described above.</li>
          </ul>
          <p>We may also disclose data where the law requires it or to protect the service and its users. Your data may be processed in India and other countries where these providers operate, under their data protection terms.</p>

          <h2>How long we keep it</h2>
          <ul>
            <li><strong>Account, practice work and requests:</strong> until you delete them or your account, or ask us to remove them.</li>
            <li><strong>Voice recordings:</strong> 30 days after transcription. Transcripts and measurements stay with the practice round.</li>
            <li><strong>Sign-in codes, expired sessions and human-check records:</strong> generally up to 30 days.</li>
            <li><strong>Analytics:</strong> recordings for about 30 days and other data for up to a year, even if you delete your account.</li>
            <li><strong>After account deletion:</strong> we keep a one-way hash of your email address so the free interviewer round can't be claimed twice.</li>
          </ul>

          <h2>Your rights</h2>
          <p>You can edit your profile, and delete practice rounds or your account, on your <Link to="/profile">profile page</Link>. You can also email us to access, correct, erase, restrict or move your data, object to its processing, withdraw consent, nominate someone to act for you, or raise a grievance. We'll respond within 30 days. You can complain to the Data Protection Board of India or your local data protection authority.</p>

          <h2>Security</h2>
          <p>We use reasonable security practices to protect your data, including encryption in transit.</p>

          <h2>Children</h2>
          <p>DesignRounds is not intended for anyone under 18, and we don't knowingly collect their data.</p>

          <h2>Changes</h2>
          <p>We'll update the date above when this policy changes, and notify signed-in users of significant changes on the site or by email.</p>
        </article>
      </div>
      <SiteFooter />
    </main>
  );
}
