export default {
  blocks: [
    { type: "p", text: "A **slowly changing dimension (SCD)** is a dimension table whose attributes change occasionally: a customer moves city, a product changes category, an employee changes team. The **SCD type** decides what the warehouse does with the old value. **Type 1** overwrites it, **Type 2** keeps every version as a separate row, and **Type 3** keeps the previous value in an extra column. The choice determines whether last year's report still shows last year's truth." },
    {"type":"diagram","kind":"flow","caption":"When a customer moves city, Type 1 overwrites the row and loses history; Type 2 closes the old row and adds a new one, so old facts still join to the old city.","nodes":[{"id":"change","label":"Customer moves","sub":"Pune to Delhi","col":0,"row":1},{"id":"t1","label":"Type 1","sub":"overwrite","col":1,"row":0,"tone":"muted"},{"id":"t2","label":"Type 2","sub":"close, then insert","col":1,"row":2,"tone":"accent"},{"id":"r1","label":"One row","sub":"history lost","col":2,"row":0,"tone":"danger"},{"id":"r2","label":"Two rows","sub":"valid_from, valid_to","col":2,"row":2,"tone":"ok"}],"edges":[{"from":"change","to":"t1"},{"from":"change","to":"t2"},{"from":"t1","to":"r1"},{"from":"t2","to":"r2"}]},

    { type: "h2", text: "The main SCD types" },
    { type: "table", head: ["Type", "What happens on change", "History kept", "Use when"], rows: [
      ["Type 0", "Nothing: the original value is fixed", "Original only", "Attributes that must never change, like a signup date"],
      ["Type 1", "Overwrite the value in place", "None", "Corrections and attributes where history doesn't matter (a typo in a name)"],
      ["Type 2", "Close the current row and insert a new one", "Full history, one row per version", "Reports must reflect the attribute as it was at the time of the fact"],
      ["Type 3", "Move the old value to a `previous_x` column", "One prior value", "Rare: comparing current vs previous, such as a sales territory realignment"],
      ["Type 4", "Move fast-changing attributes to a separate mini-dimension referenced by the fact", "The profile at each event, without bloating the main dimension", "Attributes such as age band, income band or loyalty tier that change often"],
      ["Type 5", "Type 4 mini-dimension plus a Type 1 outrigger on the main dimension pointing at the current profile", "Profile at event time and the current profile", "You need both the historical and the current mini-dimension values"],
      ["Type 6", "Type 2 rows plus a current-value column updated on every version", "Full history and easy current view", "Reports need both \"as it was\" and \"as it is now\" without self-joins"],
      ["Type 7", "Fact carries two keys: the Type 2 surrogate key and the durable key, joined to a current-row view", "Full history and current view through separate joins", "Users choose per report between \"as it was\" and \"as it is now\""],
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

    { type: "h2", text: "Beyond Type 2: types 4, 5, 6 and 7" },
    { type: "p", text: "Type 2 handles history for attributes that change occasionally. Two problems remain: attributes that change **too often** for a new row each time, and reports that need the **current** value alongside the historical one. The higher-numbered types are combinations that solve these." },
    { type: "ul", items: [
      "**Type 4, mini-dimension:** volatile attributes (age band, credit score band, loyalty tier) move into a small dimension of banded combinations. The fact references it directly, so each event records the profile at that moment, while the main customer dimension stays stable. See [dimension table techniques](/learn/dimension-table-techniques).",
      "**Type 5, mini-dimension plus Type 1 outrigger:** the base dimension also holds a key to the customer's *current* mini-dimension row, overwritten on change. Reports can group by the profile at the time of the fact or by today's profile.",
      "**Type 6, the hybrid (1 + 2 + 3):** each Type 2 row also carries current-value columns that are overwritten across all versions on every change. A fact joined to its historical row can still show where the customer lives now.",
      "**Type 7, dual keys:** the fact stores the Type 2 surrogate key *and* the entity's durable key. Joining on the surrogate key gives history; joining on the durable key to a view of current rows gives today's values. It is the most flexible option and avoids rewriting old rows, at the cost of two join paths users must understand.",
    ] },
    { type: "table", head: ["customer_key", "customer_id (durable)", "city (historical)", "current_city (Type 6)", "is_current"], rows: [
      ["101", "C-42", "Pune", "Bengaluru", "false"],
      ["187", "C-42", "Bengaluru", "Bengaluru", "true"],
    ] },
    { type: "p", text: "In interviews, Type 2 is expected; naming Type 4 for fast-changing attributes and Type 6 or 7 for \"as it was versus as it is now\" reporting shows depth." },

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
  related: ["dimensional-modeling", "dimension-table-techniques", "fact-table-types", "data-pipeline-orchestration", "idempotency", "data-quality"],
  practice: ["scd2-warehouse", "ecommerce-warehouse"],
  reading: [
    { title: "Slowly Changing Dimension Techniques", publisher: "Kimball Group", url: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/type-2/" },
    { title: "dbt documentation: Snapshots", publisher: "dbt Labs", url: "https://docs.getdbt.com/docs/build/snapshots" },
  ],
};
