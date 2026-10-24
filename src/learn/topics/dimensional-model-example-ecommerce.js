export default {
  blocks: [
    { type: "p", text: "This is a complete dimensional model for an online store, worked through the way you would in an interview: requirements first, then a bus matrix, then each fact table with its grain, dimensions and facts, then the SQL it makes easy and the follow-up questions interviewers ask. The store processes about **2 million orders a day** with around five items each, sells 50,000 products and has 20 million customers. Analysts need yesterday's numbers by 6am and three years of history." },

    { type: "h2", text: "1. Requirements: the questions the model must answer" },
    { type: "table", head: ["Team", "Question", "What it tells us about the model"], rows: [
      ["Finance", "Revenue, units and margin by day, category and region", "Order-line grain; cost on the fact; product and geography dimensions"],
      ["Merchandising", "Sales by category as it was at the time, and restated in today's categories", "Product category history: SCD Type 2 (plus a current view)"],
      ["Marketing", "Repeat-customer rate and promotion lift", "Customer dimension; promotion dimension with a \"No promotion\" row"],
      ["Operations", "Time from order to delivery by carrier and warehouse; where orders get stuck", "Order fulfilment accumulating snapshot"],
      ["Category managers", "Return rate and refund value by category and reason", "Separate returns process sharing product and date dimensions"],
      ["Supply chain", "Stock on hand and days out of stock per product and warehouse", "Daily inventory periodic snapshot"],
    ] },
    { type: "p", text: "Data realities from profiling the source Postgres database: orders change status after purchase, refunds can arrive weeks later, some test orders are hard-deleted, shipping is charged per order rather than per item, and timestamps are UTC while the business reports in local time." },

    { type: "h2", text: "2. Bus matrix" },
    { type: "table", head: ["Process (fact)", "Type", "Date", "Customer", "Product", "Promotion", "Warehouse", "Carrier", "Return reason"], rows: [
      ["Order lines", "Transaction", "✓ (order)", "✓", "✓", "✓", "✓", "", ""],
      ["Order fulfilment", "Accumulating snapshot", "✓ (placed, paid, shipped, delivered)", "✓", "", "", "✓", "✓", ""],
      ["Return lines", "Transaction", "✓ (return, original order)", "✓", "✓", "", "✓", "", "✓"],
      ["Inventory", "Periodic snapshot (daily)", "✓ (snapshot)", "", "✓", "", "✓", "", ""],
    ] },
    { type: "p", text: "Date, customer, product and warehouse are shared by most processes, so they are built first and conformed: one definition, one owner, used everywhere." },

    { type: "h2", text: "3. Order lines (transaction fact)" },
    { type: "p", text: "**Grain: one row per product on an order (an order line).** It is the most atomic grain the source provides, and every sales question rolls up from it." },
    { type: "diagram", kind: "flow", caption: "The order-line star. The order number stays on the fact as a degenerate dimension; flags live in a small junk dimension.", nodes: [
      { id: "f", label: "fact_order_line", sub: "qty · net · discount · cost · shipping (allocated)", col: 1.5, row: 1, shape: "db", tone: "accent", w: 230 },
      { id: "d", label: "dim_date", sub: "role: order date", col: 0, row: 0, tone: "store" },
      { id: "c", label: "dim_customer", sub: "SCD2 · segment · city", col: 1.5, row: 0, tone: "store" },
      { id: "p", label: "dim_product", sub: "SCD2 · brand · category", col: 3, row: 0, tone: "store" },
      { id: "pr", label: "dim_promotion", sub: "type · channel", col: 0, row: 2, tone: "store" },
      { id: "w", label: "dim_warehouse", sub: "city · region", col: 1.5, row: 2, tone: "store" },
      { id: "j", label: "dim_order_flags", sub: "junk: gift · speed · channel", col: 3, row: 2, tone: "store" },
    ], edges: [
      { from: "f", to: "d" }, { from: "f", to: "c" }, { from: "f", to: "p" }, { from: "f", to: "pr" }, { from: "f", to: "w" }, { from: "f", to: "j" },
    ] },
    { type: "code", code: `
create table fact_order_line (
  order_date_key        int not null,   -- dim_date (role-playing view: order date)
  customer_key          int not null,   -- dim_customer, version valid at order time
  customer_profile_key  int not null,   -- mini-dimension: age, income band, loyalty tier at order time
  product_key           int not null,   -- dim_product, version valid at order time
  promotion_key         int not null,   -- -1 = "No promotion"
  warehouse_key         int not null,
  order_flags_key       int not null,   -- junk dimension
  audit_key             int not null,   -- which pipeline run loaded the row
  order_number          varchar(20),    -- degenerate dimension
  order_line_number     smallint,
  quantity              int,
  gross_amount          decimal(12,2),  -- quantity × unit list price
  discount_amount       decimal(12,2),
  net_amount            decimal(12,2),
  cost_amount           decimal(12,2),
  shipping_allocated    decimal(12,2)   -- order shipping fee spread across lines by net value
)
partition by (order_date_key);
` },
    { type: "h3", text: "The shipping fee: header amounts at a line grain" },
    { type: "p", text: "Shipping is charged once per order, but the fact is at line grain. Repeating the full fee on every line would multiply shipping revenue by the number of lines. Two valid options, and you should say which you chose:" },
    { type: "ul", items: [
      "**Allocate** the fee to lines in proportion to each line's net amount (as above), so line-level margin includes shipping and sums back exactly to the order's fee. Round so the allocations add up to the cent.",
      "**Keep an order-level fact** (`fact_order`, one row per order) for header amounts such as shipping and order-level discounts, and leave them off the line table entirely.",
    ] },
    { type: "p", text: "Average order value then comes from the order level (sum of revenue divided by count of distinct orders), not from averaging lines." },

    { type: "h2", text: "4. Dimensions" },
    { type: "table", head: ["Dimension", "Key attributes", "History", "Notes"], rows: [
      ["dim_date", "date, weekday, week, month, fiscal quarter, holiday flag", "Static", "Role-playing views for order, ship, delivery, return and snapshot dates"],
      ["dim_customer", "customer_id, name, city, region, segment, signup date", "Type 2 on city and segment; Type 1 on name corrections", "Durable key kept for Type 7 current views"],
      ["dim_customer_profile", "age band, income band, loyalty tier", "Mini-dimension (Type 4)", "Changes often, so referenced from the fact instead of versioning the customer"],
      ["dim_product", "sku, name, brand, subcategory, category, department, size, colour", "Type 2 on category and brand", "Hierarchy flattened into columns"],
      ["dim_promotion", "promotion name, type, discount type, channel, start and end", "Type 1", "\"No promotion\" row so the key is never null"],
      ["dim_warehouse", "warehouse code, city, region, capacity tier", "Type 2 on region", "Shared with inventory and returns"],
      ["dim_order_flags", "is_gift, shipping_speed, sales_channel", "Static", "Junk dimension: one row per combination that occurs"],
      ["dim_carrier", "carrier name, service level", "Type 1", "Used by fulfilment"],
      ["dim_return_reason", "reason, reason group, is_defect", "Type 1", "Used by returns"],
    ] },

    { type: "h2", text: "5. Returns (transaction fact)" },
    { type: "p", text: "Refunds arrive days or weeks after the sale. Two designs come up in interviews:" },
    { type: "ul", items: [
      "**A separate returns process (chosen here):** `fact_return_line`, one row per returned product, with the return date, the original order date (another role of `dim_date`), product, customer, warehouse and reason. Facts: returned quantity, refund amount, restocking fee. Sales reported for a closed month never change, and return rates come from drilling across.",
      "**Negative rows on the sales fact:** append a row with negative quantity and amount, dated on the refund date. Net sales become a single sum, but reasons and return-specific measures have nowhere natural to go.",
    ] },
    { type: "code", code: `
create table fact_return_line (
  return_date_key       int not null,
  original_order_date_key int not null,   -- role-playing date: when it was bought
  customer_key          int not null,
  product_key           int not null,
  warehouse_key         int not null,
  return_reason_key     int not null,
  order_number          varchar(20),      -- degenerate: links back to the order
  return_number         varchar(20),
  quantity_returned     int,
  refund_amount         decimal(12,2),
  restocking_fee        decimal(12,2)
);
` },

    { type: "h2", text: "6. Order fulfilment (accumulating snapshot)" },
    { type: "p", text: "**Grain: one row per order, updated as it moves through placed, paid, packed, shipped and delivered (or cancelled).** This is what answers \"where do orders get stuck?\" without reconstructing timelines from events." },
    { type: "diagram", kind: "timeline", caption: "An order's stages (illustrative times). The row fills in one date key and one lag per milestone; missing milestones point at a \"Not yet\" date row.", ticks: ["Day 0", "Day 1", "Day 2", "Day 3"], spans: [
      { from: 0, to: 0.3, label: "pay", lane: 1, tone: "accent" },
      { from: 0.3, to: 1, label: "pack", lane: 0, tone: "store" },
      { from: 1, to: 1.4, label: "handover", lane: 1, tone: "cache" },
      { from: 1.4, to: 3, label: "in transit", lane: 0, tone: "ok" },
    ], marks: [{ at: 0, label: "placed" }, { at: 1.4, label: "shipped" }, { at: 3, label: "delivered" }] },
    { type: "code", code: `
create table fact_order_fulfilment (
  order_number         varchar(20) primary key,
  customer_key         int not null,
  warehouse_key        int not null,
  carrier_key          int not null,       -- "Not yet assigned" until shipping
  placed_date_key      int not null,
  paid_date_key        int not null,
  packed_date_key      int not null,
  shipped_date_key     int not null,
  delivered_date_key   int not null,
  cancelled_date_key   int not null,
  order_net_amount     decimal(12,2),
  line_count           int,
  hours_to_pay         decimal(8,2),
  hours_to_pack        decimal(8,2),
  hours_to_ship        decimal(8,2),
  hours_in_transit     decimal(8,2),
  is_delivered         smallint,
  is_cancelled         smallint,
  is_late              smallint            -- delivered after the promised date
);
` },
    { type: "p", text: "The load is a MERGE on order number: new orders insert, milestone events update the date keys and lags. Because the row is updated, keep the raw status events in the lake so the snapshot can always be rebuilt." },

    { type: "h2", text: "7. Inventory (periodic snapshot)" },
    { type: "p", text: "**Grain: one row per product per warehouse per day**, written every day even when nothing moved." },
    { type: "code", code: `
create table fact_inventory_daily (
  snapshot_date_key   int not null,
  product_key         int not null,
  warehouse_key       int not null,
  quantity_on_hand    int,            -- semi-additive: never sum across days
  quantity_reserved   int,
  quantity_inbound    int,
  stock_value         decimal(14,2),  -- semi-additive
  is_out_of_stock     smallint,       -- additive counter: days out of stock
  primary key (snapshot_date_key, product_key, warehouse_key)
);
` },
    { type: "p", text: "At 50,000 products across 20 warehouses that is about a million rows a day, a modest size for a warehouse. Stock on hand is summed across products and warehouses, but across days it takes the last value of the period or an average. `is_out_of_stock` is additive, so \"days out of stock this month\" is a plain sum." },

    { type: "h2", text: "8. Questions the model answers" },
    { type: "code", code: `
-- Monthly revenue and margin by category, using the category at the time of sale
select d.month, p.category,
       sum(f.net_amount) as revenue,
       sum(f.net_amount - f.cost_amount) as margin
from fact_order_line f
join dim_date d    on f.order_date_key = d.date_key
join dim_product p on f.product_key = p.product_key
group by d.month, p.category;

-- Repeat-customer rate last quarter (customers with 2+ orders)
with per_customer as (
  select c.customer_id, count(distinct f.order_number) as orders
  from fact_order_line f
  join dim_customer c on f.customer_key = c.customer_key
  join dim_date d     on f.order_date_key = d.date_key
  where d.fiscal_quarter = '2026-Q2'
  group by c.customer_id                 -- durable id, not the versioned key
)
select avg(case when orders >= 2 then 1.0 else 0 end) as repeat_rate from per_customer;

-- Median hours from order to delivery by carrier, delivered orders only
select k.carrier_name, percentile_cont(0.5) within group (order by f.hours_to_ship + f.hours_in_transit) as median_hours
from fact_order_fulfilment f
join dim_carrier k on f.carrier_key = k.carrier_key
where f.is_delivered = 1
group by k.carrier_name;

-- Days out of stock per category last month
select p.category, sum(i.is_out_of_stock) as product_days_out_of_stock
from fact_inventory_daily i
join dim_product p on i.product_key = p.product_key
join dim_date d    on i.snapshot_date_key = d.date_key
where d.month = '2026-09'
group by p.category;
` },
    { type: "p", text: "Return rate by category is a drill-across query, combining sales and returns at the category level. See [conformed dimensions](/learn/conformed-dimensions-bus-matrix) for the SQL." },

    { type: "h2", text: "9. Loading it" },
    { type: "ul", items: [
      "Extract from a read replica or with [change data capture](/learn/change-data-capture), never from the primary, and land raw data unchanged.",
      "Load dimensions before facts. When a fact arrives for an unknown customer, insert an inferred member rather than dropping the fact.",
      "Look up each fact's dimension keys using the version valid at the event time (`valid_from <= order_ts < valid_to`).",
      "Make every load idempotent: MERGE on order number and line number, or overwrite whole date partitions, so a rerun never double counts.",
      "Reconcile row counts and revenue against the source each day, and block publishing if they differ.",
    ] },

    { type: "h2", text: "10. Follow-up questions and answers" },
    { type: "table", head: ["Interviewer asks", "A strong answer"], rows: [
      ["Merchandising reorganises categories. Last year's report must not change, but marketing wants it restated.", "Category is Type 2, so facts keep the old version for \"as it was\". Add a current-category column (Type 6) or a Type 7 durable-key join to a current view for the restated report."],
      ["An order is cancelled after it shipped.", "The fulfilment row records the cancellation date and flag; the financial effect arrives as a return or reversal transaction, so earlier periods stay unchanged."],
      ["We start selling in five currencies.", "Store the amount in transaction currency and in one reporting currency converted at the order-date rate, plus a currency dimension. Never sum mixed currencies."],
      ["We become a marketplace with third-party sellers.", "Add a conformed seller dimension to order lines, returns and fulfilment; commission becomes a new fact at line grain."],
      ["Dashboards on revenue by day and category are slow.", "Build a daily aggregate fact by category and region with shrunken dimensions, rebuilt from the atomic table, or a materialised view."],
      ["A product has several tags (\"eco\", \"bestseller\").", "Tags are multivalued: a tag group bridge, or an array column if the warehouse supports it. Don't repeat fact rows per tag."],
    ] },

    { type: "h2", text: "Common mistakes on this problem" },
    { type: "ul", items: [
      "Mixing order headers and lines in one table, so shipping and order discounts are double counted.",
      "Overwriting product category in place, which silently rewrites last year's reports.",
      "Updating the original sale row on refund, losing when the refund happened and changing closed periods.",
      "Summing a daily inventory snapshot across days.",
      "Using the source customer id as the fact's key, which breaks as soon as history is needed.",
      "Joining the sales and returns facts directly to compute return rate.",
    ] },
  ],
  uses: [
    { name: "Online retail", text: "This is the standard shape for an e-commerce warehouse: order lines, fulfilment, returns and inventory around shared dimensions." },
    { name: "Food and grocery delivery", text: "The same model with stores as warehouses and a delivery accumulating snapshot measured in minutes." },
    { name: "Marketplaces", text: "Adds a conformed seller dimension and commission facts at line grain." },
  ],
  interview: [
    "Start with the questions and a bus matrix, then model one process at a time.",
    "Declare the order-line grain and say how shipping and order discounts are handled.",
    "Use an accumulating snapshot for fulfilment and a periodic snapshot for inventory.",
    "Model returns as their own process and combine with sales by drilling across.",
  ],
  related: ["four-step-dimensional-design", "fact-table-types", "dimension-table-techniques", "conformed-dimensions-bus-matrix", "slowly-changing-dimensions", "dimensional-model-example-ride-hailing"],
  practice: ["ecommerce-warehouse", "scd2-warehouse", "food-delivery-analytics"],
  reading: [
    { title: "Dimensional Modeling Techniques", publisher: "Kimball Group", url: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/" },
    { title: "The Data Warehouse Toolkit, 3rd edition (retail sales, inventory and order management chapters)", publisher: "Ralph Kimball and Margy Ross, Wiley", url: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/books/data-warehouse-dw-toolkit/" },
  ],
};
