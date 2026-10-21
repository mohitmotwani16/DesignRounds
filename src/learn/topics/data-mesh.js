// Data mesh: domain-owned data products, sharing without copying, a central catalog, federated governance, and when it's worth it.
export default {
  blocks: [
    {"type":"p","text":"In a large company, one central data team serving every department becomes a bottleneck: finance, sales, marketing and HR all queue for the same engineers, and the central team never understands each domain's data as well as the domain does. **Data mesh** flips the model: each **business domain owns its data**, publishes it as a **product** other teams can discover and consume, and a shared platform plus common rules keep it all interoperable."},
    {"type":"h2","text":"The four principles"},
    {"type":"table","head":["Principle","What it means in practice"],"rows":[["**Domain ownership**","The team that produces the data (e.g. the payments team) owns its pipelines, quality and access, instead of handing raw data to a central team"],["**Data as a product**","Each published dataset has an owner, documentation, a schema contract, SLAs (freshness, quality) and is easy to discover. See [data contracts](/learn/data-contracts-schema-evolution)"],["**Self-serve data platform**","A platform team provides storage, compute, catalog, access control and templates so domains don't each rebuild infrastructure. See [internal developer platforms](/learn/internal-developer-platform)"],["**Federated computational governance**","Global rules (naming, PII handling, interoperability standards) are agreed centrally but enforced automatically in the platform, while domains govern their own data day to day"]]},
    {"type":"h2","text":"How it looks on a cloud platform"},
    {"type":"p","text":"Instead of one cloud account for everyone, each domain gets its **own account**. A **producer** account holds a domain's data and publishes it; a **consumer** account in another domain can query that data **without copying it**; a **central governance account** holds the data catalog (the metadata about every published dataset and who may use it)."},
    {"type":"diagram","kind":"flow","caption":"Data mesh on cloud accounts: producers keep their data, a central catalog makes it discoverable and governs access, and consumers query it in place, with no copies.","nodes":[{"id":"p1","label":"Sales domain","sub":"producer account","col":0,"row":0,"shape":"db","tone":"store"},{"id":"p2","label":"Finance domain","sub":"producer account","col":0,"row":1.4,"shape":"db","tone":"store"},{"id":"c","label":"Central governance","sub":"data catalog + access policies","col":1.7,"row":0.7,"tone":"accent","w":230},{"id":"k1","label":"Marketing domain","sub":"consumer account","col":3.4,"row":0,"tone":"ok"},{"id":"k2","label":"ML team","sub":"consumer account","col":3.4,"row":1.4,"tone":"ok"}],"edges":[{"from":"p1","to":"c","label":"register"},{"from":"p2","to":"c","dashed":true},{"from":"k1","to":"c","label":"discover + request"},{"from":"k1","to":"p1","dashed":true,"label":"query in place"},{"from":"k2","to":"p2","dashed":true}]},
    {"type":"p","text":"On AWS this is typically separate accounts per domain, with a central AWS Glue Data Catalog and Lake Formation permissions for cross-account sharing; Databricks Unity Catalog and Snowflake data sharing offer similar \"share, don't copy\" mechanisms. Zalando, the European fashion retailer, is a well-known adopter: separate accounts for ingestion and serving, plus a central account holding metadata about all storage."},
    {"type":"h2","text":"Centralized platform vs data mesh"},
    {"type":"table","head":["","Centralized data team","Data mesh"],"rows":[["Who builds pipelines","One central team for everyone","Each domain for its own data"],["Bottleneck","The central team's backlog","Domain skills and consistency across domains"],["Data knowledge","Second-hand","With the people who produce the data"],["Sharing","Copies into a central warehouse","Query in place through a catalog"],["Governance","Central and manual","Federated: global rules, enforced by the platform"],["Fits","Small and mid-size organizations","Large organizations with many domains"]]},
    {"type":"callout","tone":"warning","text":"Data mesh is an organizational change more than a technology. It needs domain teams with data skills, a solid self-serve platform and real governance; without them you get many inconsistent data silos. Most companies with a handful of data consumers are better served by one well-run [lakehouse](/learn/lakehouse-architecture)."},
  ],
  uses: [
    {"name":"Large retailers","text":"Domains such as orders, logistics and marketing each publish data products."},
    {"name":"Banks and insurers","text":"Domain ownership with strict, platform-enforced governance for regulated data."},
    {"name":"Multi-business groups","text":"Independent business units share data without a single central bottleneck."},
    {"name":"Cloud data sharing","text":"Cross-account catalogs and permissions (Glue + Lake Formation, Unity Catalog, Snowflake sharing)."},
  ],
  interview: [
    "Raise data mesh when the problem is organizational scale (many domains, a central bottleneck), not data volume.",
    "Name the four principles and the producer / consumer / central catalog layout.",
    "Be honest about the cost: it needs mature domain teams and a strong platform.",
  ],
  related: ["data-engineering-design-patterns","lakehouse-architecture","data-contracts-schema-evolution","data-quality","data-engineering-architecture"],
  practice: ["etl-framework","data-quality"],
};
