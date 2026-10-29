export default {
  blocks: [
    { type: "p", text: "**Dimension tables** hold the descriptive context of the facts: the names, categories, regions, segments and flags people filter and group by. Good dimensions are **wide** (dozens of attributes), **denormalised** (hierarchies flattened into one table), **readable** (\"Express shipping\" rather than `Y`) and keyed by a **surrogate key** the warehouse controls. Most of the craft of dimensional modeling is in the dimensions, because that's where business meaning lives." },

    { type: "h2", text: "Keys: surrogate, natural, durable" },
    { type: "table", head: ["Key", "What it is", "Why it exists"], rows: [
      ["Natural key", "The identifier from the source system (`customer_id` = C-42)", "Links warehouse rows back to the source"],
      ["Surrogate key", "A meaningless integer the warehouse assigns to each dimension row (`customer_key` = 187)", "Lets one entity have several history rows; isolates the warehouse from source id changes, reuse and collisions; makes joins small and fast"],
      ["Durable (supernatural) key", "A warehouse-assigned id that stays the same for an entity across all its versions and sources", "Identifies \"the same customer\" when natural keys differ between systems or change over time"],
    ] },
    { type: "p", text: "Facts store the **surrogate key** of the dimension row that was valid when the event happened. That single rule is what lets a [Type 2 slowly changing dimension](/learn/slowly-changing-dimensions) keep history: an order placed in 2025 points forever at the 2025 version of the customer." },
    { type: "callout", tone: "tip", text: "Interviewers often ask \"why not just use the source id?\" Three answers: history needs more than one row per entity, several sources may use different or colliding ids, and source systems sometimes reuse or change ids." },

    { type: "h2", text: "The date dimension" },
    { type: "p", text: "Every warehouse has a **calendar date dimension**: one row per day for decades, built once, with attributes like day of week, week number, month name, quarter, fiscal period, holiday flag and weekday or weekend. Reports group by these attributes instead of computing calendars in SQL, and fiscal calendars or regional holidays become simple joins. The key is often a smart integer (`20261024`) because dates are stable and it makes partitioning easy. A separate **time-of-day** dimension (minute or hour grain) handles intraday analysis without exploding the date table." },
    { type: "p", text: "Keep the precise event timestamp on the fact as well when you need it for ordering or durations; the date key is for grouping." },

    { type: "h2", text: "Role-playing dimensions" },
    { type: "p", text: "One physical dimension can be referenced several times by the same fact under different roles. An order has an order date, a ship date and a delivery date, all pointing at `dim_date`. A trip has a pickup location and a drop-off location, both pointing at `dim_location`. Expose each role as a view with renamed columns so queries and BI tools stay unambiguous." },
    { type: "diagram", kind: "flow", caption: "Role-playing: three foreign keys on the fact point at the same date dimension, exposed through role-named views.", nodes: [
      { id: "f", label: "fact_order", sub: "order_date_key · ship_date_key · delivery_date_key", col: 0, row: 1, tone: "accent", w: 230 },
      { id: "o", label: "order_date (view)", col: 2, row: 0, tone: "muted" },
      { id: "s", label: "ship_date (view)", col: 2, row: 1, tone: "muted" },
      { id: "d", label: "delivery_date (view)", col: 2, row: 2, tone: "muted" },
      { id: "dim", label: "dim_date", sub: "one physical table", col: 3.4, row: 1, shape: "db", tone: "store" },
    ], edges: [
      { from: "f", to: "o" }, { from: "f", to: "s" }, { from: "f", to: "d" },
      { from: "o", to: "dim", dashed: true }, { from: "s", to: "dim", dashed: true }, { from: "d", to: "dim", dashed: true },
    ] },
    { type: "code", code: `
create view dim_ship_date as
select date_key as ship_date_key, full_date as ship_date, month_name as ship_month, fiscal_quarter as ship_fiscal_quarter
from dim_date;
` },

    { type: "h2", text: "Degenerate dimensions" },
    { type: "p", text: "Transaction identifiers such as an order number, invoice number or ticket id have no descriptive attributes of their own, since everything about the order is already in other dimensions. Rather than create an empty dimension, keep the identifier directly on the fact table. It is still useful: it groups lines into an order and lets users trace a row back to the source." },

    { type: "h2", text: "Junk dimensions" },
    { type: "p", text: "Transactions often carry a handful of low-cardinality flags and codes: gift wrap yes or no, express shipping, order channel, payment type. Putting each on the fact as a column clutters it; giving each its own dimension adds many tiny joins. A **junk dimension** combines them into one small table with a row for each combination that actually occurs, and the fact stores one key." },
    { type: "table", head: ["order_flags_key", "is_gift", "shipping_speed", "channel"], rows: [
      ["1", "No", "Standard", "Web"],
      ["2", "Yes", "Standard", "Web"],
      ["3", "No", "Express", "App"],
    ] },
    { type: "p", text: "Two flags with three values each give at most a few dozen rows, so the dimension stays tiny no matter how many orders exist." },

    { type: "h2", text: "Flags, indicators and nulls in dimensions" },
    { type: "ul", items: [
      "Store flags as readable values (\"Subscribed\" / \"Not subscribed\") rather than `Y`/`N` or `1`/`0`, so reports read correctly without decoding.",
      "Replace null attributes with explicit labels (\"Unknown\", \"Not provided\") so grouping doesn't produce a confusing blank bucket and filters behave predictably.",
      "Every dimension gets special rows for \"Unknown\" and \"Not applicable\" (often keys -1 and -2) that facts can point at when the real member is missing.",
    ] },

    { type: "h2", text: "Snowflaking and outriggers" },
    { type: "p", text: "**Snowflaking** normalises a dimension's hierarchy into separate tables (product → brand → category). It saves a little space and adds joins, so the default is to flatten. An **outrigger** is a narrower, deliberate exception: a dimension that references another dimension, such as a customer dimension pointing at a date dimension for `first_purchase_date`. Use outriggers sparingly; each one is a join users must understand." },

    { type: "h2", text: "Mini-dimensions for fast-changing attributes" },
    { type: "p", text: "Some attributes change too often for Type 2 history on the main dimension: a customer's age band, income band, loyalty tier or credit score band. Tracking each change as a new row would multiply a 20-million-row customer dimension many times over. A **mini-dimension** moves those volatile attributes into their own small table of banded combinations, referenced directly from the fact. The fact then records both who the customer is and what profile they had at the time of each event. This is SCD Type 4." },
    { type: "code", code: `
-- Mini-dimension: one row per combination of bands, not per customer
create table dim_customer_profile (
  profile_key    int primary key,
  age_band       varchar(10),   -- '25-34'
  income_band    varchar(15),   -- '50k-75k'
  loyalty_tier   varchar(10)    -- 'Gold'
);
-- The fact carries both keys
-- fact_order_line(customer_key, customer_profile_key, ...)
` },

    { type: "h2", text: "Audit dimension" },
    { type: "p", text: "An **audit dimension** describes how each fact row was produced: the pipeline run id, source system, load timestamp, code version, and data quality status. Attaching an `audit_key` to every fact lets you find all rows from a bad run, exclude rows that failed a quality check, and answer \"where did this number come from?\" without digging through logs." },

    { type: "h2", text: "Late-arriving data" },
    { type: "ul", items: [
      "**Late-arriving dimension (early-arriving fact):** a fact references a customer the warehouse hasn't seen yet. Insert an **inferred member**, a placeholder dimension row with the natural key and \"Unknown\" attributes, so the fact loads with a valid key. When the real customer arrives, update the placeholder in place (Type 1), since it was never a real historical version.",
      "**Late-arriving fact:** an event from last week arrives today. Look up the dimension version valid at the event time, not the current one, and write it to last week's partition. Loads must be idempotent so a re-sent file doesn't duplicate rows.",
    ] },

    { type: "h2", text: "Less common techniques worth recognising" },
    { type: "table", head: ["Technique", "What it solves"], rows: [
      ["Multiple hierarchies in one dimension", "A date rolls up to calendar month and to fiscal period; a product rolls up by merchandising category and by supplier. Keep both sets of columns in the same dimension."],
      ["Dynamic value banding", "Grouping a numeric fact into user-defined bands at query time (balances 0-1k, 1k-10k) by joining to a small band table."],
      ["Aggregated facts as attributes", "Putting a summary such as lifetime spend band or orders-last-90-days onto the customer dimension so it can be filtered and grouped on. Refresh it on a schedule."],
      ["Behavior tags", "Time-stamped segment labels (\"churn risk\", \"high value\") stored per customer per period for cohort analysis."],
      ["Multiple time zones", "Storing both UTC and local date and time keys on the fact so reports can use either."],
      ["Step dimension", "A dimension describing the position of an event in a sequence (step 3 of 5 in a checkout funnel)."],
      ["Supertype and subtype schemas", "Heterogeneous products (loans, cards, deposits) with a common core dimension and per-type tables for their specialised attributes and facts."],
    ] },
  ],
  uses: [
    { name: "Retail and e-commerce", text: "Product and customer dimensions with Type 2 history, a date dimension with fiscal calendar, and a junk dimension for order flags." },
    { name: "Financial services", text: "Mini-dimensions for credit score and income bands that change monthly without bloating the customer dimension." },
    { name: "Any regulated pipeline", text: "Audit dimensions so every reported number can be traced to the run and source that produced it." },
  ],
  interview: [
    "Explain surrogate keys and why facts store the version valid at event time.",
    "Use role-playing views for multiple dates or locations on one fact.",
    "Name junk, degenerate and mini-dimensions when flags, ids or volatile attributes come up.",
    "Handle late-arriving dimensions with inferred members instead of dropping facts.",
  ],
  related: ["slowly-changing-dimensions", "fact-table-types", "hierarchies-and-bridge-tables", "conformed-dimensions-bus-matrix", "dimensional-modeling"],
  practice: ["ecommerce-warehouse", "scd2-warehouse"],
  reading: [
    { title: "Dimensional Modeling Techniques: dimension tables", publisher: "Kimball Group", url: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/" },
    { title: "The Data Warehouse Toolkit, 3rd edition", publisher: "Ralph Kimball and Margy Ross, Wiley", url: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/books/data-warehouse-dw-toolkit/" },
  ],
};
