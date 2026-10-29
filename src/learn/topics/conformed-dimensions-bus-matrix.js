export default {
  blocks: [
    { type: "p", text: "A warehouse is built one business process at a time: first orders, then shipments, then returns, then marketing campaigns. What stops those fact tables from turning into separate, contradictory silos is **conformed dimensions**: dimensions such as customer, product and date that are defined once and shared by every fact table that uses them. The **bus matrix** is the one-page plan that shows which processes use which shared dimensions, and it is the best tool for scoping a warehouse in an interview." },

    { type: "h2", text: "Conformed dimensions" },
    { type: "p", text: "Two dimensions are **conformed** when they are the same table, or when one is an exact subset of the other with identical keys, column names, definitions and values. If the sales fact and the returns fact both use the same `dim_product`, then \"Footwear\" means the same products in both, and returns can be compared to sales by category with confidence." },
    { type: "p", text: "Without conformance you get the familiar meeting where marketing, finance and operations each bring a different number for \"active customers\", and each is right according to its own definition. Conformed dimensions are as much an organisational agreement as a technical one: someone owns `dim_customer`, and every team builds on it." },
    { type: "ul", items: [
      "**Same keys:** every fact uses the same surrogate key for the same member, so results can be combined.",
      "**Same attribute names and values:** `region` is spelled and populated identically everywhere.",
      "**Same definitions:** \"active customer\" and \"product category\" have one agreed meaning.",
      "**Conformed facts:** measures that appear in several fact tables (revenue, units) are calculated the same way and carry the same name, or deliberately different names when they genuinely differ.",
    ] },

    { type: "h2", text: "Drilling across" },
    { type: "p", text: "Conformed dimensions make **drilling across** possible: answering a question that spans several processes by querying each fact table separately at a common level of a shared dimension, then joining the result sets on that dimension's attributes. You never join two fact tables directly row to row, since their grains differ and the join would multiply rows." },
    { type: "code", code: `
-- Return rate by category: query each process, then combine on the conformed attribute
with sales as (
  select p.category, sum(f.quantity) as units_sold
  from fact_order_line f join dim_product p on f.product_key = p.product_key
  group by p.category
), returns as (
  select p.category, sum(r.quantity) as units_returned
  from fact_return_line r join dim_product p on r.product_key = p.product_key
  group by p.category
)
select s.category, s.units_sold, coalesce(r.units_returned, 0) as units_returned,
       coalesce(r.units_returned, 0) * 1.0 / nullif(s.units_sold, 0) as return_rate
from sales s left join returns r on s.category = r.category;
` },
    { type: "callout", tone: "warning", text: "Joining `fact_order_line` to `fact_return_line` directly on product_key multiplies every sale by every return of that product. This is the most common way people get return rates of 400%." },

    { type: "h2", text: "Shrunken dimensions" },
    { type: "p", text: "Some facts live at a coarser grain than the base dimension. A sales forecast is set per category per month, not per product per day. Its dimensions are **shrunken rollups**: a category-level table containing exactly the category attributes and values of `dim_product`, and a month-level table derived from `dim_date`. Because they are strict subsets with identical values, forecasts and actuals can still be compared by category and month." },

    { type: "h2", text: "The bus matrix" },
    { type: "p", text: "The **enterprise bus matrix** lists business processes as rows and conformed dimensions as columns, with a mark where a process uses a dimension. It does three jobs: it scopes the warehouse, it shows which dimensions are worth building first because many processes reuse them, and it gives each fact table a clear place in the whole." },
    { type: "table", head: ["Business process", "Date", "Customer", "Product", "Store / warehouse", "Promotion", "Employee", "Carrier"], rows: [
      ["Orders", "✓", "✓", "✓", "✓", "✓", "", ""],
      ["Shipments", "✓", "✓", "✓", "✓", "", "", "✓"],
      ["Returns", "✓", "✓", "✓", "✓", "", "✓", ""],
      ["Inventory snapshot", "✓", "", "✓", "✓", "", "", ""],
      ["Marketing campaigns", "✓", "✓", "✓", "", "✓", "", ""],
      ["Customer support", "✓", "✓", "✓", "", "", "✓", ""],
    ] },
    { type: "p", text: "Reading down a column shows how widely a dimension is shared (date, customer and product here), which makes them the first to build and the ones whose definitions need the most care. Reading across a row gives the dimensional design of one fact table." },
    { type: "p", text: "The rows usually follow the organisation's **value chain**: the sequence of processes from procurement through orders, fulfilment and returns. Building processes in value-chain order means each new fact table reuses dimensions that already exist." },
    { type: "callout", tone: "tip", text: "In an interview, sketching a small bus matrix before any star schema shows you're thinking about the whole platform, not just one table, and it naturally leads to the question of which dimensions must be conformed." },

    { type: "h2", text: "Prioritising what to build" },
    { type: "p", text: "Not every row is built at once. Rank processes by business value (how much a decision depends on it) and feasibility (how clean and available the source data is). An opportunity matrix, which lists processes against the stakeholder groups that care about them, shows which process unlocks the most questions for the most teams. Build that one first, along with the conformed dimensions it needs." },

    { type: "h2", text: "Conformance in a modern platform" },
    { type: "ul", items: [
      "In a [medallion lakehouse](/learn/medallion-architecture), conformed dimensions live in the silver layer and every gold mart reads from them.",
      "In a [data mesh](/learn/data-mesh), domains own their facts, but shared entities such as customer and product are published as data products that other domains reuse, which is conformance by another name.",
      "Data contracts and a catalog with owners per dimension keep definitions from drifting as teams multiply.",
    ] },
  ],
  uses: [
    { name: "Multi-process retail warehouse", text: "Orders, shipments, returns and inventory all share date, product, customer and location, so reports combine them freely." },
    { name: "Planning vs actuals", text: "Forecasts at category-month grain compared with actual sales through shrunken conformed dimensions." },
    { name: "Organisation-wide metrics", text: "One owned customer dimension ends competing definitions of active or churned customers." },
  ],
  interview: [
    "Sketch a bus matrix to scope the warehouse before drawing any single star.",
    "Name the conformed dimensions and who owns their definitions.",
    "Combine processes by drilling across, never by joining fact tables directly.",
    "Use shrunken rollup dimensions for facts at a coarser grain such as forecasts.",
  ],
  related: ["four-step-dimensional-design", "dimensional-modeling", "fact-table-types", "dimensional-model-example-ecommerce", "data-mesh"],
  practice: ["ecommerce-warehouse", "lakehouse-platform"],
  reading: [
    { title: "Dimensional Modeling Techniques: integration via conformed dimensions", publisher: "Kimball Group", url: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/" },
    { title: "The Data Warehouse Toolkit, 3rd edition", publisher: "Ralph Kimball and Margy Ross, Wiley", url: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/books/data-warehouse-dw-toolkit/" },
  ],
};
