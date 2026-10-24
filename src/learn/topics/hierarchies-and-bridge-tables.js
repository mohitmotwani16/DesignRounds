export default {
  blocks: [
    { type: "p", text: "A star schema assumes each dimension has **one value per fact row** and that hierarchies have a **fixed number of levels**. Real data breaks both assumptions: a bank account has several owners, a patient visit has several diagnoses, an org chart is eleven levels deep in one department and three in another. This page covers how dimensional models handle hierarchies of every shape, and how **bridge tables** handle many-to-many relationships without double counting." },

    { type: "h2", text: "Fixed-depth hierarchies: flatten them" },
    { type: "p", text: "When every member has the same levels, as with product → subcategory → category → department or day → month → quarter → year, store each level as its own column in one dimension row. This is the default and the easiest to query: drilling down is just adding a column to the `group by`." },
    { type: "table", head: ["product_key", "product_name", "subcategory", "category", "department"], rows: [
      ["501", "Trail Runner 2", "Running shoes", "Footwear", "Sports"],
      ["502", "Yoga mat Pro", "Yoga", "Fitness equipment", "Sports"],
    ] },
    { type: "p", text: "A dimension can hold several hierarchies side by side (calendar and fiscal, or merchandising and supplier), each as its own set of columns." },

    { type: "h2", text: "Slightly ragged hierarchies: fill the gaps" },
    { type: "p", text: "Geography is the classic case: most addresses have city, state and country, but some countries have no states. When the variation is small and the maximum depth is known, keep the fixed columns and fill the missing level with a sensible value (repeat the city, or use \"No state\"). Queries stay simple and totals stay correct." },

    { type: "h2", text: "Ragged, variable-depth hierarchies" },
    { type: "p", text: "Org charts, cost-centre trees, bills of materials and nested category trees have no fixed depth. A recursive `parent_id` column describes them but makes queries like \"all sales by everyone under this VP\" painful: a recursive CTE on every report. The dimensional answer is a **hierarchy bridge table** (sometimes called a closure table) with one row for every ancestor-descendant pair, including each node paired with itself." },
    { type: "diagram", kind: "tree", caption: "A ragged org hierarchy. The bridge table stores every ancestor-to-descendant path, so \"everything under Asha\" is one join with no recursion.", root: { label: "Asha (VP)", tone: "accent", children: [
      { label: "Ben (Director)", children: [{ label: "Chen (Manager)", children: [{ label: "Dev (Engineer)" }] }] },
      { label: "Esi (Manager)", children: [{ label: "Farah (Engineer)" }] },
    ] } },
    { type: "table", head: ["ancestor_key", "descendant_key", "depth_from_ancestor", "is_leaf"], rows: [
      ["Asha", "Asha", "0", "No"],
      ["Asha", "Ben", "1", "No"],
      ["Asha", "Chen", "2", "No"],
      ["Asha", "Dev", "3", "Yes"],
      ["Asha", "Esi", "1", "No"],
      ["Asha", "Farah", "2", "Yes"],
      ["Ben", "Chen", "1", "No"],
      ["…", "…", "…", "…"],
    ] },
    { type: "code", code: `
-- Sales credited to everyone in Asha's organisation, at any depth
select sum(f.amount)
from fact_sales f
join bridge_org b    on f.employee_key = b.descendant_key
join dim_employee a  on b.ancestor_key = a.employee_key
where a.employee_name = 'Asha';
` },
    { type: "p", text: "The bridge is maintained by the pipeline whenever the tree changes. Add `valid_from` and `valid_to` columns if reorganisations must be reported historically, so \"Asha's org as of last March\" is a filter on the bridge." },

    { type: "h2", text: "Multivalued dimensions and bridge tables" },
    { type: "p", text: "Sometimes the problem is not depth but **multiplicity**: one fact row relates to several members of a dimension. A joint bank account has two owners. A hospital visit has three diagnoses. A shared ride carries four riders. A movie has several genres. Putting one of them on the fact loses the others; repeating the fact row once per member double counts the measure." },
    { type: "p", text: "The solution is a **group**: give each distinct combination of members a group key, store that key on the fact, and list the members of each group in a bridge table." },
    { type: "diagram", kind: "flow", caption: "A multivalued dimension. The fact points at a group; the bridge lists the group's members with a weighting factor that sums to 1 per group.", nodes: [
      { id: "f", label: "fact_account_balance", sub: "account_owner_group_key · balance", col: 0, row: 1, tone: "accent", w: 210 },
      { id: "b", label: "bridge_owner_group", sub: "group_key · customer_key · weight", col: 1.7, row: 1, tone: "queue", w: 210 },
      { id: "c", label: "dim_customer", sub: "name · segment · city", col: 3.3, row: 1, shape: "db", tone: "store" },
    ], edges: [{ from: "f", to: "b", label: "group_key" }, { from: "b", to: "c", label: "customer_key" }] },
    { type: "table", head: ["owner_group_key", "customer_key", "weighting_factor"], rows: [
      ["900", "Priya", "0.5"],
      ["900", "Rahul", "0.5"],
      ["901", "Meera", "1.0"],
    ] },

    { type: "h2", text: "Weighting factors and double counting" },
    { type: "p", text: "Joining through a bridge multiplies each fact row by the number of members in its group. That is exactly right for some questions and badly wrong for others, so decide which one the user is asking:" },
    { type: "ul", items: [
      "**Impact report (unweighted):** \"total balances of accounts that Priya owns, in whole or part\". Each member sees the full amount; the grand total across all customers is larger than the bank's real total. Correct for per-customer views, wrong for totals.",
      "**Weighted report:** multiply the measure by the weighting factor. Each owner gets their share, and the grand total equals the true total. Use this whenever a number will be added up across members.",
      "**Primary member only:** some models also store a single \"primary\" member directly on the fact for simple reports that only need one.",
    ] },
    { type: "code", code: `
-- Weighted: totals add up to the real total
select c.segment, sum(f.balance * b.weighting_factor) as balance
from fact_account_balance f
join bridge_owner_group b on f.account_owner_group_key = b.owner_group_key
join dim_customer c       on b.customer_key = c.customer_key
group by c.segment;
` },
    { type: "callout", tone: "warning", text: "The interview trap: drawing a many-to-many relationship as a direct join between the fact and the dimension. Any sum across that join double counts. Say \"bridge table with a weighting factor\" and explain which reports are weighted." },

    { type: "h2", text: "Alternatives to a bridge" },
    { type: "table", head: ["Approach", "When it's enough"], rows: [
      ["Change the grain", "If each member has its own measure (each rider's own fare on a shared ride), make the fact one row per member and the problem disappears."],
      ["Primary member on the fact", "When most reports need only one member, such as the primary diagnosis or the main account holder."],
      ["Positional columns", "A small, fixed maximum (genre_1, genre_2, genre_3). Simple but awkward to filter on \"any genre is Comedy\"."],
      ["Array column", "Warehouses with array types can store `genres` as an array and unnest at query time. Convenient, but weighting is still your job."],
    ] },
  ],
  uses: [
    { name: "Banking", text: "Joint accounts and account-to-customer relationships through an owner-group bridge with weights." },
    { name: "Healthcare", text: "Several diagnoses per visit through a diagnosis-group bridge, with a primary diagnosis on the fact." },
    { name: "HR and finance", text: "Org charts and cost-centre trees as hierarchy bridges for roll-up reporting at any level." },
  ],
  interview: [
    "Flatten fixed-depth hierarchies into the dimension; use a bridge only for ragged ones.",
    "For many-to-many, use a group key on the fact and a bridge with weighting factors.",
    "Say which reports are weighted (totals) and which are impact reports (per member).",
    "Consider changing the grain first: it often removes the many-to-many entirely.",
  ],
  related: ["dimension-table-techniques", "fact-table-types", "dimensional-modeling", "dimensional-model-example-ride-hailing", "conformed-dimensions-bus-matrix"],
  practice: ["experimentation-analytics", "ecommerce-warehouse"],
  reading: [
    { title: "Dimensional Modeling Techniques: hierarchies and bridges", publisher: "Kimball Group", url: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/" },
    { title: "The Data Warehouse Toolkit, 3rd edition", publisher: "Ralph Kimball and Margy Ross, Wiley", url: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/books/data-warehouse-dw-toolkit/" },
  ],
};
