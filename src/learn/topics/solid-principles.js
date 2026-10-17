export default {
  blocks: [
    { type: "p", text: "The **SOLID principles** are five guidelines for object-oriented design that make code easier to change, test and understand: **S**ingle responsibility, **O**pen-closed, **L**iskov substitution, **I**nterface segregation and **D**ependency inversion. They were collected by Robert C. Martin and are the vocabulary of low-level design interviews. Each one is a way of limiting how far a change has to spread." },
    {"type":"diagram","kind":"flow","caption":"Single responsibility and dependency inversion together: one class that did everything becomes small parts, and orders depend on a notifier interface rather than on email.","nodes":[{"id":"god","label":"OrderManager","sub":"prices, saves, emails","col":0,"row":1,"tone":"danger"},{"id":"price","label":"PriceCalculator","col":1,"row":0},{"id":"repo","label":"OrderRepository","col":1,"row":1,"tone":"store"},{"id":"notify","label":"Notifier","sub":"interface","col":1,"row":2,"tone":"accent","shape":"pill"},{"id":"email","label":"EmailNotifier","col":2,"row":2}],"edges":[{"from":"god","to":"price","label":"split"},{"from":"god","to":"repo","label":"split"},{"from":"god","to":"notify","label":"split"},{"from":"email","to":"notify","label":"implements","dashed":true}]},

    { type: "h2", text: "S: Single responsibility principle" },
    { type: "p", text: "**A class should have one reason to change.** An `Invoice` class that calculates totals, formats a PDF and emails it changes whenever tax rules, PDF layout or email providers change." },
    { type: "code", code: `
// Before: one class, three reasons to change
class Invoice { total() {...} toPdf() {...} email() {...} }

// After: each class changes for one reason
class Invoice { total() {...} }
class InvoicePdfRenderer { render(invoice) {...} }
class InvoiceMailer { send(invoice, pdf) {...} }
` },

    { type: "h2", text: "O: Open-closed principle" },
    { type: "p", text: "**Open for extension, closed for modification.** Adding a new payment method shouldn't require editing a growing `if/else` in the checkout code. Put the varying behaviour behind an interface and add new implementations." },
    { type: "code", code: `
interface PaymentMethod { pay(amount: Money): Receipt }
class CardPayment implements PaymentMethod { ... }
class UpiPayment implements PaymentMethod { ... }
class WalletPayment implements PaymentMethod { ... }   // added without touching Checkout

class Checkout {
  constructor(private method: PaymentMethod) {}
  complete(amount: Money) { return this.method.pay(amount) }
}
` },

    { type: "h2", text: "L: Liskov substitution principle" },
    { type: "p", text: "**Subtypes must be usable wherever their base type is expected, without surprises.** The classic violation is `Square extends Rectangle`: setting a square's width also changes its height, so code that sets width and height independently breaks. If a subclass has to throw \"not supported\" for a base-class method, or weakens what the base promised, the inheritance is wrong; prefer composition or a different abstraction." },
    { type: "ul", items: [
      "Subclasses shouldn't strengthen preconditions (accept less) or weaken postconditions (promise less).",
      "A `ReadOnlyList` that inherits from `List` and throws on `add` breaks every caller expecting a list.",
    ] },

    { type: "h2", text: "I: Interface segregation principle" },
    { type: "p", text: "**Clients shouldn't depend on methods they don't use.** A `Machine` interface with `print`, `scan` and `fax` forces a simple printer to implement fax. Split it into `Printer`, `Scanner` and `Fax`, and let a multifunction device implement all three." },

    { type: "h2", text: "D: Dependency inversion principle" },
    { type: "p", text: "**High-level policy should depend on abstractions, not on low-level details.** An `OrderService` that creates a `MySqlOrderRepository` directly is welded to MySQL and hard to test. Depend on an `OrderRepository` interface and inject the implementation." },
    { type: "code", code: `
interface OrderRepository { save(order: Order): void; findById(id: string): Order | null }

class OrderService {
  constructor(private repo: OrderRepository, private events: EventPublisher) {}
  place(order: Order) { this.repo.save(order); this.events.publish("order.placed", order.id) }
}
// production: new OrderService(new SqlOrderRepository(pool), new KafkaPublisher(...))
// tests:      new OrderService(new InMemoryOrderRepository(), new FakePublisher())
` },

    { type: "h2", text: "Using SOLID well" },
    { type: "table", head: ["Principle", "Smell it fixes", "Typical tool"], rows: [
      ["Single responsibility", "God classes; unrelated changes collide", "Split classes by reason to change"],
      ["Open-closed", "Long type-switching conditionals", "Interfaces plus polymorphism, [strategy pattern](/learn/design-patterns)"],
      ["Liskov substitution", "Subclasses that throw or behave surprisingly", "Composition over inheritance"],
      ["Interface segregation", "Fat interfaces with empty implementations", "Small, role-based interfaces"],
      ["Dependency inversion", "Hard-coded dependencies, untestable code", "Interfaces and dependency injection"],
    ] },
    { type: "callout", tone: "tip", text: "SOLID is a means, not a goal. Applying every principle everywhere creates layers of interfaces with one implementation each. In an interview, apply them where requirements say behaviour will vary, and say so: \"pricing rules change often, so I'll put them behind a strategy interface\"." },
  ],
  uses: [
    { name: "LLD interviews", text: "Parking lots, elevators and payment systems are judged on clear responsibilities and extensible interfaces." },
    { name: "Testable services", text: "Dependency inversion lets business logic run in tests with in-memory fakes." },
    { name: "Plugin architectures", text: "Open-closed design lets new integrations be added without modifying core code." },
  ],
  interview: [
    "Define each principle in one sentence with an example.",
    "Show a before-and-after refactor for open-closed or dependency inversion.",
    "Spot Liskov violations in inheritance hierarchies.",
    "Apply principles where change is expected, not everywhere.",
  ],
  related: ["design-patterns", "hld-vs-lld", "monolith-vs-microservices", "api-design", "system-design-interview"],
  practice: ["rate-limiter", "ticket-booking", "payment-platform"],
  reading: [
    { title: "Solid Relevance", publisher: "Robert C. Martin, The Clean Code Blog", url: "https://blog.cleancoder.com/uncle-bob/2020/10/18/Solid-Relevance.html" },
    { title: "SOLID", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/SOLID" },
  ],
};
