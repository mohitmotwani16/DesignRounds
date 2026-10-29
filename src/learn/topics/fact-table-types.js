export default {
  blocks: [
    { type: "p", text: "A **fact table** records the measurements of one business process at one declared grain, plus foreign keys to the dimensions that describe each measurement. There are three core kinds, and they differ in what a row represents in time: a **transaction** fact records an event when it happens, a **periodic snapshot** records the state of something at regular intervals, and an **accumulating snapshot** follows one process instance from start to finish. A fourth, the **factless** fact table, records that something happened (or could have) without any numeric measure." },

    { type: "h2", text: "The three core fact table types" },
    { type: "table", head: ["", "Transaction", "Periodic snapshot", "Accumulating snapshot"], rows: [
      ["One row is", "One event at a point in time", "One entity at the end of each period", "One instance of a process with a clear start and end"],
      ["Example grain", "One row per order line", "One row per account per day", "One row per order, from placed to delivered"],
      ["Rows are", "Inserted once, never updated", "Inserted every period, even if nothing happened", "Inserted once, then updated as milestones occur"],
      ["Date keys", "One (event date)", "One (snapshot date)", "Several: one per milestone (ordered, shipped, delivered)"],
      ["Typical facts", "Amounts and quantities of the event", "Balances and levels (stock on hand, account balance)", "Durations between milestones and counts"],
      ["Density", "Sparse: rows only when events occur", "Dense: predictable rows per period", "One row per instance"],
    ] },

    { type: "h3", text: "Transaction fact tables" },
    { type: "p", text: "The most common and most atomic kind. Each row is one event: a sale, a click, a payment, a login. Because it is atomic, it answers the widest range of questions and every other table can be derived from it. Its weakness is questions about **state**: \"how much stock did we have on 3 March?\" requires summing every movement since the beginning of time." },
    { type: "h3", text: "Periodic snapshot fact tables" },
    { type: "p", text: "A periodic snapshot takes a picture at fixed intervals: inventory per product per warehouse each day, balance per account each month, open tickets per queue each hour. It answers \"what was the level at time T\" with a single filter. It is dense by design: a row is written for every entity in every period, even when nothing changed, so zero is a real value rather than a missing row." },
    { type: "h3", text: "Accumulating snapshot fact tables" },
    { type: "p", text: "An accumulating snapshot has one row per instance of a pipeline-like process with well-defined milestones: an order (placed, paid, shipped, delivered), a loan application (submitted, approved, funded), a trip (requested, accepted, picked up, dropped off). The row is updated in place each time a milestone is reached, filling in that milestone's date key and the lag since the previous one. It makes questions like \"median time from order to delivery\" trivial." },
    { type: "diagram", kind: "timeline", caption: "One accumulating snapshot row for an order. Each milestone fills in a date key and a lag when it happens; the row is updated, not appended.", ticks: ["Mon", "Tue", "Wed", "Thu", "Fri"], spans: [
      { from: 0, to: 0.6, label: "placed → paid", lane: 0, tone: "accent" },
      { from: 0.6, to: 2, label: "paid → shipped", lane: 0, tone: "store" },
      { from: 2, to: 4, label: "shipped → delivered", lane: 0, tone: "ok" },
    ], marks: [{ at: 0, label: "placed" }, { at: 0.6, label: "paid" }, { at: 2, label: "shipped" }, { at: 4, label: "delivered" }] },
    { type: "code", code: `
create table fact_order_fulfilment (
  order_number          varchar(20) primary key,  -- degenerate dimension; one row per order
  customer_key          int not null,
  placed_date_key       int not null,
  paid_date_key         int not null,             -- points at an "Unknown / not yet" row until it happens
  shipped_date_key      int not null,
  delivered_date_key    int not null,
  order_amount          decimal(12,2),
  hours_placed_to_paid       decimal(8,2),          -- lag facts, filled as milestones arrive
  hours_paid_to_shipped      decimal(8,2),
  hours_shipped_to_delivered decimal(8,2),
  is_delivered          smallint                  -- 0/1 counter, so "delivered orders" is a sum
);
` },
    { type: "callout", tone: "tip", text: "Use a special \"Not yet happened\" date row for milestones that haven't occurred, rather than nulls, so joins to the date dimension never drop rows." },

    { type: "h3", text: "Factless fact tables" },
    { type: "p", text: "Some processes have no numeric measure: a student attended a class, a customer was eligible for a promotion, a driver was online in a zone. A **factless fact table** stores only the dimension keys (and often a constant count column of 1). There are two uses:" },
    { type: "ul", items: [
      "**Events without measures:** attendance, logins, product page views. Counting rows answers \"how many\".",
      "**Coverage:** which products were on promotion in which stores on which days, whether they sold or not. Combined with the sales fact, it answers \"what was on promotion but didn't sell?\", which the sales table alone can never show because it has no rows for things that didn't happen.",
    ] },

    { type: "h2", text: "Additive, semi-additive and non-additive facts" },
    { type: "p", text: "How a measure may be summed decides how BI tools and analysts aggregate it, and getting it wrong produces confident nonsense." },
    { type: "table", head: ["Kind", "Can be summed across", "Examples", "How to aggregate across the forbidden dimension"], rows: [
      ["Additive", "Every dimension", "Quantity sold, revenue, trip distance", "Just sum"],
      ["Semi-additive", "Some dimensions, but not time", "Account balance, stock on hand, open tickets", "Take the period-end value or the average over time, never the sum"],
      ["Non-additive", "No dimension", "Unit price, percentages, ratios, distinct counts", "Store the additive parts (numerator and denominator) and compute the ratio after summing"],
    ] },
    { type: "p", text: "Summing a daily inventory snapshot across a month multiplies stock by thirty. Averaging a margin percentage across stores gives every store equal weight regardless of size. The fix for ratios is always the same: store revenue and cost, sum both, then divide." },
    { type: "code", code: `
-- Wrong: averages each line's margin % equally
select avg(margin_pct) from fact_sales;

-- Right: sum the additive parts, then divide
select (sum(net_amount) - sum(cost_amount)) / nullif(sum(net_amount), 0) as margin_pct
from fact_sales;
` },

    { type: "h2", text: "Nulls in fact tables" },
    { type: "ul", items: [
      "**Measures may be null** when a value is genuinely unknown. Aggregate functions ignore nulls, which is usually the desired behaviour; a zero would distort averages.",
      "**Foreign keys should never be null.** A null key makes the row vanish from inner joins. Point it at a special dimension row instead: \"Unknown\", \"Not applicable\", or \"Not yet happened\".",
    ] },

    { type: "h2", text: "Aggregated and consolidated fact tables" },
    { type: "p", text: "**Aggregate fact tables** pre-summarise an atomic fact to a coarser grain, such as daily sales by product category and region, purely for speed. They join to **shrunken dimensions** (a category-level product dimension, a month-level date dimension) and must always reconcile with the atomic table. Modern columnar warehouses need fewer of them, but they still pay off for dashboards hit thousands of times a day." },
    { type: "p", text: "A **consolidated fact table** combines measures from several processes that share a grain, such as forecast and actual sales per product per month in one row. It saves a drill-across query, but only works when the grains really are identical." },

    { type: "h2", text: "Facts that need care" },
    { type: "ul", items: [
      "**Header and line facts:** an order has header amounts (shipping, order discount) and line amounts. Either keep a separate order-level fact, or allocate header amounts down to lines with a documented rule, such as proportional to line value.",
      "**Allocated facts:** costs known only at a higher level (a delivery truck's fuel) spread across lower-level rows so profit can be computed per line. The rule must be agreed by the business, since it changes everyone's margins.",
      "**Lag and duration facts:** elapsed time between two events (minutes from order to dispatch) stored as a number, so averages and percentiles are easy.",
      "**Multiple currencies:** store the transaction currency amount and a converted amount in one reporting currency, plus a currency dimension; never sum amounts in different currencies.",
      "**Multiple units of measure:** store the quantity in one standard unit and conversion factors in the product dimension, or store each unit as its own fact column.",
      "**Year-to-date facts:** avoid storing them; they break when someone sums across months. Compute them in queries or views.",
      "**Late-arriving facts:** a fact whose event happened days ago. Look up the dimension version that was valid at the event time, not today's, and load it into the correct date partition.",
      "**Fact table surrogate keys:** a unique row id, useful for idempotent reloads, auditing, and updating specific rows. Users never query by it.",
    ] },
    { type: "callout", tone: "warning", text: "Anti-pattern: the centipede fact table. Normalising a hierarchy into the fact table (separate keys for day, month, quarter and year, or for product, brand and category) makes it huge and fragile. Keep one key per dimension and put the hierarchy inside the dimension." },

    { type: "h2", text: "Choosing a type in an interview" },
    { type: "table", head: ["If the question is about…", "Reach for"], rows: [
      ["Counts and totals of events (orders, clicks, payments)", "Transaction fact"],
      ["Levels at a point in time (balance, stock, open items)", "Periodic snapshot"],
      ["How long a multi-step process takes, or where items get stuck", "Accumulating snapshot"],
      ["What happened without a measure, or what didn't happen", "Factless fact"],
    ] },
    { type: "p", text: "Real models usually combine them. An e-commerce warehouse has an order-line transaction fact, a daily inventory snapshot and an order fulfilment accumulating snapshot, all sharing the same product, customer and date dimensions. See the [e-commerce example](/learn/dimensional-model-example-ecommerce)." },
  ],
  uses: [
    { name: "Banking", text: "Transactions as a transaction fact, end-of-day balances as a periodic snapshot, loan applications as an accumulating snapshot." },
    { name: "Retail", text: "Sales lines, daily stock levels, and promotion coverage as a factless fact to find promoted items that didn't sell." },
    { name: "Operations", text: "Support tickets or deliveries as accumulating snapshots to measure time spent in each stage." },
  ],
  interview: [
    "Pick the fact table type from the question: events, levels, or process durations.",
    "Say which facts are semi-additive (balances, stock) and how you'll aggregate them over time.",
    "Store ratios as their additive parts; never average a percentage.",
    "Never leave a foreign key null: use Unknown or Not-yet rows.",
  ],
  related: ["four-step-dimensional-design", "dimension-table-techniques", "dimensional-modeling", "dimensional-model-example-ecommerce", "materialized-views"],
  practice: ["ecommerce-warehouse", "ad-click-aggregator", "payments-reconciliation"],
  reading: [
    { title: "Dimensional Modeling Techniques: fact tables", publisher: "Kimball Group", url: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/" },
    { title: "The Data Warehouse Toolkit, 3rd edition", publisher: "Ralph Kimball and Margy Ross, Wiley", url: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/books/data-warehouse-dw-toolkit/" },
  ],
};
