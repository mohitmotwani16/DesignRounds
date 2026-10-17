export default {
  blocks: [
    { type: "p", text: "A **slowly changing dimension (SCD)** is a dimension table whose attributes change occasionally: a customer moves city, a product changes category, an employee changes team. The **SCD type** decides what the warehouse does with the old value. **Type 1** overwrites it, **Type 2** keeps every version as a separate row, and **Type 3** keeps the previous value in an extra column. The choice determines whether last year's report still shows last year's truth." },

    { type: "h2", text: "The main SCD types" },
    { type: "table", head: ["Type", "What happens on change", "History kept", "Use when"], rows: [
      ["Type 0", "Nothing: the original value is fixed", "Original only", "Attributes that must never change, like a signup date"],
      ["Type 1", "Overwrite the value in place", "None", "Corrections and attributes where history doesn't matter (a typo in a name)"],
      ["Type 2", "Close the current row and insert a new one", "Full history, one row per version", "Reports must reflect the attribute as it was at the time of the fact"],
      ["Type 3", "Move the old value to a `previous_x` column", "One prior value", "Rare: comparing current vs previous, such as a sales territory realignment"],
      ["Type 6", "Type 2 rows plus a current-value column updated on every version", "Full history and easy current view", "Reports need both \"as it was\" and \"as it is now\" without self-joins"],
    ] },

    { type: "h2", text: "How SCD Type 2 works" },
    { type: "p", text: "Type 2 is the one interviews focus on, because it's the one that keeps history correctly. Each version of an entity gets its own row with its own **surrogate key**, plus columns describing when that version was valid:" },
    { type: "table", head: ["customer_key", "customer_id", "city", "valid_from", "valid_to", "is_current"], rows: [
      ["101", "C-42", "Pune", "2024-01-10", "2026-03-31", "false"],
      ["187", "C-42", "Bengaluru", "2026-04-01", "9999-12-31", "true"],
    ] },
    { type: "ul", items: [
      "`customer_id` is the **natural key** from the source; it's the same across versions.",
      "`customer_key` is the **surrogate key**; facts store this, so an order placed in 2025 points at the Pune row forever.",
      "`valid_to` of the open row is a far-future date (or null), and `is_current` makes \"current state\" queries cheap.",
      "Use half-open intervals (`valid_from <= t < valid_to`) so a timestamp matches exactly one version.",
    ] },
    { type: "callout", tone: "tip", text: "The fact table's foreign key is what makes Type 2 work. When a fact loads, it looks up the dimension version valid at the event time, not the current one. Getting that lookup wrong silently rewrites history." },

    { type: "h2", text: "Loading a Type 2 dimension" },
    { type: "p", text: "Each load compares incoming source rows with the current dimension rows by natural key. Detect a change by comparing tracked columns, often with a hash of them. Then:" },
    { type: "ol", items: [
      "**New natural key:** insert a row with `valid_from` = effective date and `is_current = true`.",
      "**Tracked attribute changed:** set the current row's `valid_to` to the effective date and `is_current = false`, then insert the new version.",
      "**Only Type 1 attributes changed** (for example a corrected email): update in place on the current row (or all rows, by policy).",
      "**No change:** do nothing.",
    ] },
    { type: "code", code: `
-- Step 1: close current rows whose tracked attributes changed
merge into dim_customer d
using staged_customers s
  on d.customer_id = s.customer_id and d.is_current
when matched and d.attr_hash <> s.attr_hash then
  update set valid_to = s.effective_date, is_current = false;

-- Step 2: insert a new current version for new or changed customers
insert into dim_customer (customer_key, customer_id, city, attr_hash, valid_from, valid_to, is_current)
select next_key(), s.customer_id, s.city, s.attr_hash, s.effective_date, date '9999-12-31', true
from staged_customers s
left join dim_customer d on d.customer_id = s.customer_id and d.is_current
where d.customer_id is null;
` },
    { type: "p", text: "Run the two steps in one transaction, or make the job idempotent so a retry after a failure between them doesn't create duplicate current rows. Assert after every load that each natural key has exactly one current row and that version intervals don't overlap." },

    { type: "h2", text: "Pitfalls" },
    { type: "ul", items: [
      "**Late-arriving data:** a change dated last week arrives today. The load must insert the version in the right place in the timeline and possibly re-point facts, not just append.",
      "**Late-arriving facts:** a fact for a date before the current version must join to the version valid then, which is why lookups use event time.",
      "**Change explosions:** tracking a frequently changing attribute (like `last_login`) creates a new version every day. Keep such attributes out of Type 2 tracking or in a separate fact.",
      "**Deletes:** decide whether a source delete closes the current row, flags it, or is ignored, and handle it explicitly.",
      "**Source snapshots vs CDC:** with full daily snapshots you detect changes by comparison; with [change data capture](/learn/outbox-pattern) you get each change event, including several in one day, and must decide whether intra-day versions matter.",
    ] },
  ],
  uses: [
    { name: "Customer analytics", text: "Revenue by customer segment stays correct historically even after customers are re-segmented." },
    { name: "HR reporting", text: "Headcount by department over time uses Type 2 employee rows so transfers appear in the right month." },
    { name: "Product catalogues", text: "Sales by category reflect the category a product had when it was sold, even after a catalogue reorganisation." },
  ],
  interview: [
    "Pick the SCD type per attribute, not per table: Type 1 for corrections, Type 2 for history-relevant attributes.",
    "Explain surrogate keys and point-in-time fact lookups; that's what makes Type 2 correct.",
    "Describe the MERGE logic and how the load stays idempotent on retry.",
    "Raise late-arriving data and deletes before the interviewer does.",
  ],
  related: ["dimensional-modeling", "data-pipeline-orchestration", "idempotency", "outbox-pattern", "data-quality"],
  practice: ["scd2-warehouse"],
  reading: [
    { title: "Slowly Changing Dimension Techniques", publisher: "Kimball Group", url: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/type-2/" },
    { title: "dbt documentation: Snapshots", publisher: "dbt Labs", url: "https://docs.getdbt.com/docs/build/snapshots" },
  ],
};
