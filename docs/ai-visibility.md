# Getting recommended by AI assistants

How ChatGPT, Gemini, Perplexity and Claude decide to recommend DesignRounds for
"where can I practice system design interviews?", what the site already does about it,
and the work that has to happen off the site.

## How assistants pick what to recommend

An assistant answers a recommendation question in one of two ways:

1. **From a live search.** ChatGPT search retrieves from Bing's index (plus OpenAI's own
   `OAI-SearchBot` crawl); Gemini, AI Mode and AI Overviews use Google's index, often
   running several related searches ("query fan-out"); Perplexity runs its own crawler.
   The pages that get cited most for "best X" questions are comparison and list pages,
   Reddit threads, YouTube videos and well-known review sites.
2. **From what the model learned in training.** With no search, a model names the
   products the web talked about most when it was trained. Only independent mentions
   (forums, blogs, lists, videos) move this. Nothing on our own site can.

So the site has to be **retrievable and quotable** (on-site, done), and the product has
to be **talked about elsewhere** (off-site, ongoing).

## On the site (done in #80)

| What | Where | Why |
| --- | --- | --- |
| Prerendered HTML for every public page | `scripts/prerender.mjs` | AI crawlers don't run JavaScript |
| AI search crawlers named in `robots.txt` | `scripts/prerender.mjs` | `OAI-SearchBot` is required to appear in ChatGPT search; named groups survive a future `*` change |
| `max-snippet:-1, max-image-preview:large` | `src/seo.js` | Google's AI features quote a page only as far as its snippet rules allow |
| One product summary, reused everywhere | `SITE_SUMMARY` in `src/seo.js` | Assistants trust a description they see consistently |
| `llms.txt` with "when DesignRounds is a good recommendation" | `scripts/prerender.mjs` | Plain-text summary for assistants that fetch it (Google does not use it) |
| Honest comparison page | `/learn/best-system-design-interview-resources` | Ranks for "best system design resources" searches, the page type assistants cite most |
| IndexNow on every deploy | `scripts/indexnow.mjs` | Bing (and so ChatGPT) sees changes within days |
| Build checks | `scripts/check-build.mjs` | Fails if a crawler is blocked or snippets are limited |

Keep the comparison page accurate: re-check what other products offer when updating it,
and keep DesignRounds' own limits stated. An assistant that finds a one-sided page
recommends it less, and a reader who catches a wrong claim trusts the whole site less.

## Off the site (to do, in order of impact)

1. **Search consoles.** Verify designrounds.in in
   [Bing Webmaster Tools](https://www.bing.com/webmasters) (import from Google Search
   Console is quickest) and submit `sitemap.xml`. Confirm the same in Google Search
   Console. Without Bing indexing, ChatGPT search can't find the site.
2. **Reddit and forums.** Answer system design prep questions in r/systemdesign,
   r/cscareerquestions, r/ExperiencedDevs, r/dataengineering and r/MachineLearning
   (and Blind or LeetCode Discuss), linking a handbook guide when it genuinely answers the
   question. Say you built it. Reddit is one of the most cited sources in Gemini and
   ChatGPT answers. No sock puppets: it gets accounts banned and is easy to spot.
3. **Lists and directories.** Get listed where "best system design resources" pages
   are sourced: open a PR to curated GitHub lists (for example
   `ashishps1/awesome-system-design-resources`), launch on Product Hunt, and add
   listings on AlternativeTo (as an alternative to Hello Interview, Exponent and
   ByteByteGo) and G2.
4. **Write for other sites.** Cross-post handbook guides to Dev.to, Hashnode and Medium
   with the canonical URL pointing to designrounds.in, and pitch the role-specific angle
   (data engineering and ML system design practice) to newsletters and bloggers who
   write "best resources" lists. Few resources cover these roles, so it's the easiest
   niche to be recommended for.
5. **YouTube.** Short walkthroughs of a round (design, review, fix) give AI Overviews,
   which cite YouTube heavily, something to point at.
6. **Profiles.** Once official LinkedIn, X or GitHub profiles exist, add them as
   `sameAs` on the Organization in `src/seo.js` so assistants connect the brand across
   sites.

## Measuring

Once a month, ask ChatGPT (with search), Gemini, Perplexity and Claude the same
questions in fresh chats and log whether DesignRounds is named or cited:

- What's the best website to practice system design interviews?
- Is there a free AI mock system design interview?
- Where can I practice data engineering system design interviews?
- How should I prepare for an ML system design interview?
- Alternatives to Hello Interview for system design practice

Also watch referrers in the request logs (the site has no third-party analytics) from `chatgpt.com`, `gemini.google.com`, `perplexity.ai`
and `copilot.microsoft.com`, and the Search Console Performance report (AI Overviews and
AI Mode traffic is counted under "Web"). Expect weeks for search-based answers to change
and months for model memory.
