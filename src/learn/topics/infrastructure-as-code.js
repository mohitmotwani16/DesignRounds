export default {
  blocks: [
    { type: "p", text: "**Infrastructure as code (IaC)** manages servers, networks, databases, permissions and other cloud resources through version-controlled definition files instead of manual clicks. A tool such as **Terraform** (or OpenTofu, Pulumi, CloudFormation) compares the code with what exists, shows a **plan** of changes, and **applies** them. The result is infrastructure that's reviewable, repeatable across environments, and recoverable." },

    { type: "h2", text: "Declarative vs imperative" },
    { type: "table", head: ["", "Declarative", "Imperative"], rows: [
      ["You write", "The desired end state: \"there is a bucket with versioning on\"", "Steps: \"create a bucket, then enable versioning\""],
      ["Rerunning", "Safe: the tool computes what's different", "May fail or duplicate if steps already ran"],
      ["Examples", "Terraform, CloudFormation, Kubernetes manifests", "Shell scripts, some configuration tools"],
    ] },
    { type: "p", text: "Declarative tools are idempotent by design, which is what makes repeated applies, drift correction and new environments safe." },

    { type: "h2", text: "Plan, apply and state" },
    { type: "diagram", kind: "flow", caption: "A change flows through review: the plan is computed against real state, reviewed and checked by policy, then applied by CI with a locked state file.", nodes: [
      { id: "pr", label: "Pull request", sub: "*.tf changes", col: 0, row: 1, shape: "pill" },
      { id: "plan", label: "Plan in CI", sub: "diff vs state", col: 1.3, row: 1, tone: "accent" },
      { id: "policy", label: "Policy checks", sub: "OPA · cost · security", col: 2.6, row: 0.2, tone: "ok" },
      { id: "review", label: "Human review", col: 2.6, row: 1.8 },
      { id: "apply", label: "Apply", sub: "after merge", col: 3.9, row: 1, tone: "accent" },
      { id: "state", label: "Remote state", sub: "locked · versioned", col: 3.9, row: 2.2, shape: "db", tone: "store" },
      { id: "cloud", label: "Cloud APIs", col: 5.1, row: 1, shape: "pill" },
    ], edges: [
      { from: "pr", to: "plan" }, { from: "plan", to: "policy" }, { from: "plan", to: "review" },
      { from: "policy", to: "apply" }, { from: "review", to: "apply" }, { from: "apply", to: "state", both: true }, { from: "apply", to: "cloud" },
    ] },
    { type: "ul", items: [
      "**State** maps each resource in code to the real object it manages (its cloud ID and attributes). Without it, the tool can't tell what it created.",
      "**Remote state with locking:** store state in shared, versioned storage and lock it during applies so two people can't change the same infrastructure concurrently and corrupt it.",
      "**State is sensitive:** it can contain secrets and resource details, so encrypt it and restrict access.",
      "**Apply only reviewed plans:** CI should apply the exact plan that was reviewed, not recompute a different one later.",
    ] },

    { type: "h2", text: "Modules and structure" },
    { type: "ul", items: [
      "**Modules** package a reusable pattern (a service's database with backups, alarms and access policies) with a small set of inputs, so teams don't copy hundreds of lines.",
      "**Version modules** and upgrade consumers deliberately, like library dependencies.",
      "**Split state by blast radius:** one giant state file means every plan touches everything and one mistake can affect production broadly. Separate by environment, region and component (network, data, services).",
      "**Same code, different variables** per environment, so staging is a faithful rehearsal of production.",
    ] },

    { type: "h2", text: "Drift" },
    { type: "p", text: "**Drift** is when reality no longer matches the code, usually because someone changed a resource by hand during an incident. The next apply might silently revert the fix or fail. Detect drift by running scheduled plans and alerting on unexpected differences; resolve it by updating the code to match (if the change was right) or re-applying (if it wasn't). Reduce it by limiting write access in the console to break-glass roles." },

    { type: "h2", text: "Guardrails" },
    { type: "ul", items: [
      "**Policy as code:** automated checks on plans, for example no public buckets, encryption required, approved instance types, tags for cost ownership.",
      "**Destructive change protection:** flag plans that delete or replace stateful resources such as databases, and require extra approval.",
      "**Least-privilege CI credentials:** the pipeline that applies changes uses short-lived credentials scoped to what it manages. See [secrets management](/learn/secrets-management).",
      "**Import before managing:** bring existing resources under IaC by importing them into state, not by recreating them.",
    ] },
    { type: "callout", tone: "tip", text: "IaC is how you get [disaster recovery](/learn/disaster-recovery) for infrastructure: if a region or account is lost, the same code can rebuild it, as long as it's been exercised recently." },
  ],
  uses: [
    { name: "Platform teams", text: "Versioned modules for networks, clusters and databases let product teams self-serve standard infrastructure." },
    { name: "Multi-environment delivery", text: "The same code with different variables builds identical dev, staging and production stacks." },
    { name: "Compliance", text: "Every infrastructure change has a reviewed pull request and policy checks, giving an audit trail." },
  ],
  interview: [
    "Explain plan, apply and why remote state needs locking.",
    "Split state by environment and component to limit blast radius.",
    "Detect and resolve drift with scheduled plans.",
    "Add policy checks and protection for destructive changes.",
  ],
  related: ["ci-cd-pipelines", "kubernetes-architecture", "secrets-management", "internal-developer-platform", "disaster-recovery"],
  practice: ["service-platform", "config-control-plane"],
  reading: [
    { title: "Terraform: State", publisher: "HashiCorp Developer", url: "https://developer.hashicorp.com/terraform/language/state" },
    { title: "Terraform: Modules", publisher: "HashiCorp Developer", url: "https://developer.hashicorp.com/terraform/language/modules" },
  ],
};
