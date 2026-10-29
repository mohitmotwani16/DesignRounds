export default {
  blocks: [
    { type: "p", text: "A **multi-armed bandit** chooses between options (\"arms\") again and again, learning which pays off best while still trying the others now and then. It's the formal version of the **explore-exploit trade-off**: show what you know works, or try something that might work better. Bandits appear in ML system design for headline and thumbnail selection, new-item exploration, ad creative choice, notification timing and anywhere an A/B test would be too slow or would waste too much traffic." },

    { type: "h2", text: "Explore vs exploit" },
    { type: "p", text: "Always exploiting (showing the current best) means you never discover a better option and never learn about new items. Always exploring wastes traffic on bad options. A bandit algorithm decides, request by request, how much to explore, and shifts traffic towards winners as evidence accumulates." },
    { type: "diagram", kind: "flow", caption: "The bandit loop: choose an arm, observe a reward, update the estimate for that arm. Logging the probability of each choice makes the data reusable for offline evaluation later.", nodes: [
      { id: "ctx", label: "Request", sub: "+ context", col: 0, row: 1 },
      { id: "pol", label: "Bandit policy", sub: "estimates + uncertainty", col: 1.4, row: 1, tone: "accent", w: 170 },
      { id: "arm", label: "Chosen arm", sub: "thumbnail B", col: 2.9, row: 1, shape: "pill" },
      { id: "rew", label: "Reward", sub: "click / no click", col: 4.2, row: 1, tone: "ok" },
      { id: "log", label: "Log", sub: "arm, propensity, reward", col: 2.9, row: 2.3, shape: "queue", tone: "queue" },
    ], edges: [
      { from: "ctx", to: "pol" }, { from: "pol", to: "arm" }, { from: "arm", to: "rew" }, { from: "rew", to: "log" }, { from: "log", to: "pol", label: "update" },
    ] },

    { type: "h2", text: "The main algorithms" },
    { type: "table", head: ["Algorithm", "How it explores", "Pros", "Cons"], rows: [
      ["Epsilon-greedy", "With probability ε pick a random arm; otherwise the best so far", "Trivial to implement and explain", "Explores blindly, even arms known to be bad"],
      ["Upper confidence bound (UCB)", "Pick the arm with the highest optimistic estimate (mean + uncertainty bonus)", "Explores uncertain arms on purpose; deterministic", "Needs tuning; deterministic choice is hard with delayed rewards"],
      ["Thompson sampling", "Sample a plausible reward rate for each arm from its posterior; pick the highest sample", "Strong in practice; naturally handles delay and batching", "Needs a probabilistic model of rewards"],
      ["Contextual bandits", "Model reward as a function of context (user, time), e.g. linear UCB or a neural model", "Personalised choices", "More data and modelling; needs careful logging"],
    ] },
    { type: "code", code: `# Thompson sampling for click-through (Beta-Bernoulli)
import random
arms = {"A": [1, 1], "B": [1, 1], "C": [1, 1]}   # [clicks + 1, non-clicks + 1]

def choose():
    samples = {arm: random.betavariate(a, b) for arm, (a, b) in arms.items()}
    return max(samples, key=samples.get)

def update(arm, clicked):
    arms[arm][0 if clicked else 1] += 1` },
    { type: "p", text: "Early on every arm's posterior is wide, so all get traffic; as clicks accumulate, the posteriors narrow and the best arm wins most samples. An arm that's clearly worse is rarely chosen, which is where bandits save traffic over a fixed split." },

    { type: "h2", text: "Bandits vs A/B tests" },
    { type: "table", head: ["", "A/B test", "Bandit"], rows: [
      ["Goal", "Learn the true effect with statistical confidence", "Maximise reward during the experiment"],
      ["Traffic split", "Fixed (for example 50/50)", "Shifts towards winners"],
      ["Best for", "Launch decisions, long-term and guardrail metrics", "Short-lived choices: headlines, creatives, new items"],
      ["Weakness", "Wastes traffic on losers", "Biased effect estimates; poor for slow, long-term metrics"],
    ] },
    { type: "p", text: "Use an [A/B test](/learn/ab-testing-experimentation) to decide whether a new ranking model ships. Use a bandit to pick which of five thumbnails a video shows this afternoon." },

    { type: "h2", text: "System design concerns" },
    { type: "ul", items: [
      "**Log propensities:** record the probability the policy gave each chosen arm. With it you can evaluate a new policy offline from old logs (inverse propensity scoring) instead of running it live.",
      "**Delayed rewards:** a purchase may arrive hours later. Update in batches and prefer Thompson sampling, which tolerates stale parameters.",
      "**State storage:** per-arm counts or posteriors live in a fast store; updates come from a stream job joining choices to rewards.",
      "**Non-stationarity:** click rates change over the day; decay old observations or use a sliding window.",
      "**Guardrails:** cap exploration on risky surfaces, and never explore with content that breaks policy.",
    ] },
    { type: "diagram", kind: "flow", caption: "A production bandit service: the policy reads arm state from a fast store; a stream job joins logged choices with delayed rewards and updates that state.", nodes: [
      { id: "app", label: "App", col: 0, row: 0.5 },
      { id: "svc", label: "Bandit service", col: 1.4, row: 0.5, tone: "accent" },
      { id: "state", label: "Arm state", sub: "posteriors", col: 2.8, row: 0.5, shape: "db", tone: "cache" },
      { id: "q", label: "Choice + reward events", col: 1.4, row: 1.8, shape: "queue", tone: "queue", w: 170 },
      { id: "job", label: "Stream join", sub: "reward window", col: 2.8, row: 1.8, tone: "accent" },
      { id: "wh", label: "Logs for offline eval", col: 4.2, row: 1.8, shape: "db", tone: "store", w: 160 },
    ], edges: [
      { from: "app", to: "svc" }, { from: "svc", to: "state", both: true }, { from: "svc", to: "q", dashed: true }, { from: "app", to: "q", dashed: true, label: "reward" },
      { from: "q", to: "job" }, { from: "job", to: "state", label: "update" }, { from: "job", to: "wh" },
    ] },
  ],
  uses: [
    { name: "News and media", text: "Headline and thumbnail testing, where the best option changes daily and waiting for a full A/B test is too slow." },
    { name: "Recommendations", text: "Exploration slots that give new items impressions, a standard [cold start](/learn/cold-start-problem) technique." },
    { name: "Marketing and notifications", text: "Choosing send times or message variants per user with contextual bandits." },
  ],
  interview: [
    "Explain explore vs exploit and why pure exploitation starves new items.",
    "Pick Thompson sampling or UCB and explain how it explores.",
    "Say when you'd use a bandit instead of an A/B test, and when you wouldn't.",
    "Mention logging propensities for offline policy evaluation.",
  ],
  related: ["ab-testing-experimentation", "cold-start-problem", "ml-feedback-loops", "recommendation-system-design", "ml-evaluation-metrics"],
  practice: ["notification-ranking", "experimentation-analytics", "recommendation-engine"],
  reading: [
    { title: "A Tutorial on Thompson Sampling", publisher: "Russo et al., Foundations and Trends in ML, 2018", url: "https://arxiv.org/abs/1707.02038" },
    { title: "Making Contextual Decisions with Low Technical Debt", publisher: "Agarwal et al., Microsoft Research, 2016", url: "https://arxiv.org/abs/1606.03966" },
  ],
};
