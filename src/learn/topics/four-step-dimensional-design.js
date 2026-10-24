export default {
  blocks: [
    { type: "p", text: "Every dimensional model, from a two-table mart to an enterprise warehouse, is designed with the same four decisions, made in a fixed order: **pick the business process**, **declare the grain**, **identify the dimensions**, **identify the facts**. The order matters. Each decision constrains the next, and most broken models skipped one or made them out of order, usually by listing columns before agreeing what one row means." },
    { type: "diagram", kind: "flow", caption: "The four steps, in order. Requirements and source data feed every step; the grain is the contract the other two steps must honour.", nodes: [
      { id: "req", label: "Requirements", sub: "questions people ask", col: 0, row: 0, tone: "muted" },
      { id: "src", label: "Data realities", sub: "what sources record", col: 0, row: 2, tone: "muted" },
      { id: "p", label: "1. Business process", sub: "an event that happens", col: 1, row: 1, tone: "accent" },
      { id: "g", label: "2. Grain", sub: "what one row means", col: 2, row: 1, tone: "accent" },
      { id: "d", label: "3. Dimensions", sub: "context: who, what, where, when", col: 3, row: 0, tone: "store" },
      { id: "f", label: "4. Facts", sub: "measures at that grain", col: 3, row: 2, tone: "store" },
    ], edges: [
      { from: "req", to: "p" }, { from: "src", to: "p" }, { from: "p", to: "g" }, { from: "g", to: "d" }, { from: "g", to: "f" },
    ] },

    { type: "h2", text: "Before step one: requirements and data realities" },
    { type: "p", text: "Two inputs shape the design. **Business requirements** tell you which questions the model must answer: revenue by region and week, repeat purchase rate, average delivery time. **Data realities** tell you what the source systems actually record, at what level of detail, and how reliably. A model built only from requirements promises numbers the sources can't produce; one built only from the sources reproduces the operational schema and answers nobody's questions." },
    { type: "ul", items: [
      "Ask what decisions the data supports and which metrics matter most. These usually point straight at a business process.",
      "Ask how the numbers are sliced: by day, product, store, customer segment, channel. Each slice is a candidate dimension.",
      "Profile the sources: what is one record, which identifiers exist, how late do records arrive, what gets updated or deleted after the fact.",
      "In practice this is done in workshops with business users and engineers together, so definitions are agreed before anything is built.",
    ] },

    { type: "h2", text: "Step 1: choose the business process" },
    { type: "p", text: "A **business process** is an activity the organisation performs that produces measurable events: taking orders, shipping packages, receiving payments, handling support tickets, a rider requesting a trip. Model one process per fact table. A process is a verb, not a department: \"the sales team\" isn't a process, but \"orders being placed\" and \"quotes being issued\" are." },
    { type: "callout", tone: "tip", text: "If a stakeholder's question spans two processes (\"how many orders shipped late?\"), you still build one fact table per process and combine them through shared dimensions, or build an accumulating snapshot of the order lifecycle. You don't merge two processes into one table." },

    { type: "h2", text: "Step 2: declare the grain" },
    { type: "p", text: "The **grain** states exactly what one row of the fact table represents, in business terms, before any columns exist: \"one row per order line\", \"one row per account per day\", \"one row per trip\". It is the single most consequential decision in the model." },
    { type: "ul", items: [
      "**Prefer the most atomic grain the source can provide.** Atomic data answers questions nobody has thought of yet and can always be rolled up; summarised data can never be drilled back down.",
      "**One grain per table.** Mixing order headers and order lines in one table guarantees double counting.",
      "**Say it in words first.** If two people describe the grain differently, the model is already ambiguous.",
      "**Test it with a question.** For \"one row per order line\", ask: can a single order line appear twice? If yes (a partial refund, a re-delivery), you have found a second process or a different grain.",
    ] },
    { type: "table", head: ["Process", "Atomic grain", "A coarser grain you might also build"], rows: [
      ["Orders", "One row per order line (product within an order)", "One row per order; daily sales by product"],
      ["Inventory", "One row per product per warehouse per day (snapshot)", "One row per product per week"],
      ["Web activity", "One row per page view or event", "One row per session"],
      ["Trips", "One row per trip", "One row per driver per day"],
    ] },

    { type: "h2", text: "Step 3: identify the dimensions" },
    { type: "p", text: "With the grain fixed, ask how people describe each row: **who** (customer, driver, employee), **what** (product, promotion), **where** (store, city, warehouse), **when** (date, time of day), **how** (channel, payment method) and **why** (promotion, reason code). Every descriptive attribute that is single-valued at the grain belongs in a dimension. Dimensions are wide, denormalised and full of readable text, because they are what users filter and group by." },
    { type: "p", text: "A useful check: if the grain is \"one row per order line\", every dimension must have exactly one value for each order line. A product has one category, an order line has one product, so category fits. A product with several tags does not fit a simple dimension; it needs a bridge table (see [hierarchies and bridge tables](/learn/hierarchies-and-bridge-tables))." },

    { type: "h2", text: "Step 4: identify the facts" },
    { type: "p", text: "Facts are the numeric measurements produced by the process, **true to the grain**. For an order line: quantity, unit price, extended amount, discount. Ask what the process measures, then check each measure belongs at this grain. A shipping fee charged once per order does not belong on every order line; it either lives on an order-level fact or is allocated across lines by a stated rule." },
    { type: "ul", items: [
      "Classify each fact as **additive**, **semi-additive** or **non-additive** (see [fact table types](/learn/fact-table-types)). Store ratios as their additive parts.",
      "Derived facts (extended amount = quantity × price) can be stored for convenience, as long as everyone gets the same definition.",
      "A number used mainly to filter or group, like list price bands, is often better as a dimension attribute than as a fact.",
    ] },

    { type: "h2", text: "A worked pass: a coffee chain" },
    { type: "ol", items: [
      "**Process:** point-of-sale transactions in stores.",
      "**Grain:** one row per item on a receipt (one latte on receipt 8812).",
      "**Dimensions:** date, time of day, store, product, cashier, payment method, promotion. The receipt number stays on the fact as a degenerate dimension.",
      "**Facts:** quantity, gross amount, discount amount, net amount, cost amount (so margin can be computed).",
    ] },
    { type: "code", code: `
create table fact_pos_line (
  date_key         int    not null,  -- dim_date
  time_of_day_key  int    not null,  -- dim_time_of_day
  store_key        int    not null,  -- dim_store
  product_key      int    not null,  -- dim_product
  cashier_key      int    not null,  -- dim_employee (role: cashier)
  payment_key      int    not null,  -- dim_payment_method
  promotion_key    int    not null,  -- dim_promotion ("No promotion" row when none)
  receipt_number   varchar(20),      -- degenerate dimension
  quantity         int,
  gross_amount     decimal(12,2),
  discount_amount  decimal(12,2),
  net_amount       decimal(12,2),
  cost_amount      decimal(12,2)
);
` },

    { type: "h2", text: "Extending a model without breaking it" },
    { type: "p", text: "Good dimensional models absorb change gracefully, because existing queries only reference the columns they use. You can add a new dimension to a fact table (assign existing rows an \"Unknown\" or \"Not applicable\" member), add new facts at the same grain, and add new attributes to a dimension without touching any report. What you cannot do cheaply is change the grain: making a daily table hourly means rebuilding it, which is the strongest argument for starting atomic." },
    { type: "callout", tone: "warning", text: "Common slip: designing the model around one dashboard. The dashboard will change in a month. Model the process at its atomic grain, then build aggregates or views for the dashboard on top." },
  ],
  uses: [
    { name: "New warehouse projects", text: "Teams run the four steps per business process, one fact table at a time, in priority order from the bus matrix." },
    { name: "Interview modeling rounds", text: "Walking the four steps out loud gives a clear structure and makes the grain explicit before any table is drawn." },
    { name: "Reviewing an existing model", text: "Asking \"what is the grain?\" and \"is every fact true to it?\" finds most double-counting bugs quickly." },
  ],
  interview: [
    "Name the business process as an event, not a department.",
    "State the grain in one sentence before listing any columns, and choose the most atomic grain the source supports.",
    "Check that every dimension is single-valued at the grain; otherwise reach for a bridge table.",
    "Keep facts true to the grain; allocate or separate header-level amounts.",
  ],
  related: ["dimensional-modeling", "fact-table-types", "dimension-table-techniques", "conformed-dimensions-bus-matrix", "dimensional-modeling-interview-guide"],
  practice: ["ecommerce-warehouse", "scd2-warehouse"],
  reading: [
    { title: "Dimensional Modeling Techniques: fundamental concepts", publisher: "Kimball Group", url: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/" },
    { title: "The Data Warehouse Toolkit, 3rd edition", publisher: "Ralph Kimball and Margy Ross, Wiley", url: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/books/data-warehouse-dw-toolkit/" },
  ],
};
