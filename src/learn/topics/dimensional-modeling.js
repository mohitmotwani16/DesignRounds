export default {
  blocks: [
    { type: "p", text: "**Dimensional modeling** is a way of organising analytical data into **fact tables**, which record measurable events such as orders, payments or page views, and **dimension tables**, which describe the who, what, where and when of those events, such as customers, products, stores and dates. Arranged as a **star schema**, it makes analytical queries simple and fast, and it gives every report the same definitions. It was popularised by Ralph Kimball and is still the backbone of most warehouses." },

    { type: "h2", text: "Facts, dimensions and grain" },
    { type: "ul", items: [
      "**Grain** is the single most important decision: what does one row of the fact table represent? \"One row per order line\" is a grain. \"Daily sales\" is a different, coarser one. Declare it before choosing columns.",
      "**Facts** are the numeric measures at that grain: quantity, amount, discount. They're usually additive (you can sum them), semi-additive (balances: sum across accounts, not across days) or non-additive (ratios: compute from additive parts).",
      "**Dimensions** are the descriptive context you filter and group by: customer segment, product category, store region, calendar month. They're wide and change slowly.",
      "**Foreign keys** in the fact table point at each dimension's **surrogate key**, a meaningless integer the warehouse assigns, rather than the source system's ID.",
    ] },

    { type: "h2", text: "The star schema" },
    { type: "diagram", kind: "flow", caption: "A star schema for retail sales: one fact table at order-line grain, joined to denormalised dimension tables by surrogate keys.", nodes: [
      { id: "fact", label: "fact_order_line", sub: "qty · amount · discount", col: 1.5, row: 1, shape: "db", tone: "accent", w: 190 },
      { id: "date", label: "dim_date", sub: "day · month · fiscal qtr", col: 0, row: 0, tone: "store" },
      { id: "cust", label: "dim_customer", sub: "segment · city", col: 3, row: 0, tone: "store" },
      { id: "prod", label: "dim_product", sub: "brand · category", col: 0, row: 2, tone: "store" },
      { id: "store", label: "dim_store", sub: "region · format", col: 3, row: 2, tone: "store" },
    ], edges: [
      { from: "fact", to: "date", label: "date_key" }, { from: "fact", to: "cust", label: "customer_key" },
      { from: "fact", to: "prod", label: "product_key" }, { from: "fact", to: "store", label: "store_key" },
    ] },
    { type: "p", text: "Queries become a fact table joined to a few dimensions, filtered and grouped by dimension attributes. That shape is easy for analysts to write, easy for BI tools to generate, and easy for warehouse engines to optimise." },
    { type: "code", code: `
-- Revenue by product category and month for one region
select d.month, p.category, sum(f.amount) as revenue
from fact_order_line f
join dim_date d    on f.date_key = d.date_key
join dim_product p on f.product_key = p.product_key
join dim_store s   on f.store_key = s.store_key
where s.region = 'South'
group by d.month, p.category;
` },

    { type: "h2", text: "Star schema vs snowflake schema" },
    { type: "table", head: ["", "Star schema", "Snowflake schema"], rows: [
      ["Dimensions", "Denormalised: one wide table per dimension", "Normalised into sub-tables (product → category → department)"],
      ["Joins per query", "Fewer", "More"],
      ["Storage", "Some repeated text values", "Less repetition"],
      ["Ease of use", "Simpler for analysts and BI tools", "Harder to write and reason about"],
      ["When to use", "The default for most analytics", "Very large, shared hierarchies or strict reuse of sub-dimensions"],
    ] },
    { type: "p", text: "Columnar warehouses compress repeated values well, so the storage argument for snowflaking is weaker than it used to be. Most teams default to stars and snowflake only where a hierarchy is genuinely shared or huge." },

    { type: "h2", text: "Patterns you'll need" },
    { type: "ul", items: [
      "**Conformed dimensions:** one `dim_customer` shared by the sales, support and marketing facts, so \"active customer\" means the same thing everywhere.",
      "**Date dimension:** a pre-built table with one row per day and attributes like weekday, fiscal period and holiday flags, so reports never compute calendars inline.",
      "**Slowly changing dimensions:** how a dimension keeps history when a customer moves city. See [slowly changing dimensions](/learn/slowly-changing-dimensions).",
      "**Fact table types:** transaction facts (one row per event), periodic snapshots (one row per account per day) and accumulating snapshots (one row per order, updated as it moves through stages).",
      "**Degenerate dimensions:** identifiers like an order number kept on the fact table without their own dimension.",
      "**Junk dimensions:** low-cardinality flags (gift-wrapped, express shipping) bundled into one small dimension instead of cluttering the fact table.",
    ] },
    { type: "callout", tone: "tip", text: "In an interview, say the grain out loud before drawing any table. Most modelling mistakes, such as double counting and mismatched totals, come from mixing grains in one fact table." },

    { type: "h2", text: "Dimensional modeling vs other approaches" },
    { type: "p", text: "Third normal form models (sometimes the Inmon approach) keep an integrated, normalised enterprise layer and build marts from it. Data vault models separate hubs, links and satellites to absorb change from many sources. One big table (OBT) flattens everything into a single wide table for a specific use. They aren't exclusive: many platforms use a normalised or vault-style integration layer and serve dimensional marts on top, or derive wide tables from a star for dashboards." },
  ],
  uses: [
    { name: "Retail and e-commerce", text: "Order-line facts with date, customer, product and store dimensions power revenue, margin and basket analysis." },
    { name: "Subscription businesses", text: "A daily periodic-snapshot fact per subscription supports MRR, churn and cohort reporting." },
    { name: "Logistics", text: "An accumulating snapshot per shipment records timestamps for each stage, making delivery-time analysis simple." },
  ],
  interview: [
    "Declare the grain of each fact table before listing columns.",
    "Use surrogate keys and explain why source IDs aren't enough (history, multiple sources).",
    "Default to a star schema and justify any snowflaking.",
    "Mention conformed dimensions when several business processes share an entity.",
  ],
  related: ["slowly-changing-dimensions", "normalization-denormalization", "data-warehouse-vs-data-lake", "medallion-architecture", "data-engineering-architecture"],
  practice: ["scd2-warehouse", "realtime-analytics"],
  reading: [
    { title: "Dimensional Modeling Techniques", publisher: "Kimball Group", url: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/" },
    { title: "The Data Warehouse Toolkit, 3rd edition", publisher: "Ralph Kimball and Margy Ross, Wiley", url: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/books/data-warehouse-dw-toolkit/" },
  ],
};
