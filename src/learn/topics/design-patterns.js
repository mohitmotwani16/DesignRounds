export default {
  blocks: [
    { type: "p", text: "**Design patterns** are proven, named solutions to recurring design problems in object-oriented code, catalogued most famously by the \"Gang of Four\" book. In low-level design interviews, a handful come up again and again: **strategy**, **observer**, **factory**, **builder**, **singleton**, **decorator**, **adapter** and **state**. The skill being tested isn't reciting them but recognising which problem in the requirements a pattern solves, and not using one where it doesn't." },

    { type: "h2", text: "The patterns that matter most" },
    { type: "table", head: ["Pattern", "Problem it solves", "LLD example"], rows: [
      ["Strategy", "Swap an algorithm or policy at runtime without conditionals", "Pricing rules in a parking lot; rate limiting algorithms; payment methods"],
      ["Observer", "Notify many dependents when something changes, without coupling to them", "Display boards updating when spots free up; order status notifications"],
      ["Factory (method / simple factory)", "Create objects without the caller knowing the concrete class", "Create a `Vehicle` from a type; create a notifier per channel"],
      ["Builder", "Construct complex objects step by step with optional parts", "Building an HTTP request or a pizza order with many options"],
      ["Singleton", "Exactly one shared instance", "A configuration registry or a single parking lot instance (use sparingly)"],
      ["Decorator", "Add behaviour to an object by wrapping it, without subclass explosion", "Add logging, caching or retries around a service; toppings on a coffee"],
      ["Adapter", "Make an incompatible interface fit the one you expect", "Wrap a third-party payment SDK behind your `PaymentGateway` interface"],
      ["State", "Behaviour changes with an object's state; avoid big switch statements", "Vending machine, elevator, order lifecycle"],
      ["Command", "Represent actions as objects to queue, log or undo them", "Undo/redo in an editor; job queues"],
      ["Chain of responsibility", "Pass a request along handlers until one handles it", "Middleware pipelines; approval workflows; logging levels"],
    ] },

    { type: "h2", text: "Strategy" },
    { type: "code", code: `
interface PricingStrategy { price(entry: Date, exit: Date, vehicle: Vehicle): Money }
class HourlyPricing implements PricingStrategy { ... }
class WeekendFlatPricing implements PricingStrategy { ... }

class ParkingLot {
  constructor(private pricing: PricingStrategy) {}
  checkout(ticket: Ticket) { return this.pricing.price(ticket.entry, new Date(), ticket.vehicle) }
}
` },
    { type: "p", text: "New pricing schemes are new classes; `ParkingLot` doesn't change. This is the open-closed principle in practice. See [SOLID principles](/learn/solid-principles)." },

    { type: "h2", text: "Observer" },
    { type: "code", code: `
interface SpotListener { onSpotChanged(floor: number, freeSpots: number): void }

class Floor {
  private listeners: SpotListener[] = []
  subscribe(listener: SpotListener) { this.listeners.push(listener) }
  release(spot: Spot) {
    spot.free()
    for (const l of this.listeners) l.onSpotChanged(this.number, this.freeCount())
  }
}
// DisplayBoard and MobileAppNotifier both implement SpotListener
` },
    { type: "p", text: "In distributed systems the same idea appears as [pub/sub](/learn/pub-sub): producers publish events without knowing who consumes them." },

    { type: "h2", text: "State" },
    { type: "p", text: "A vending machine behaves differently when idle, when it has money, and when dispensing. Rather than checking a status flag in every method, each state is a class implementing the same interface (`insertCoin`, `selectItem`, `dispense`), and the machine delegates to its current state, which decides the next state. Invalid actions are rejected naturally in states that don't allow them." },

    { type: "h2", text: "Decorator and adapter" },
    { type: "ul", items: [
      "A **decorator** implements the same interface as the object it wraps: `new RetryingClient(new LoggingClient(new HttpClient()))` adds behaviours in layers, each independently testable.",
      "An **adapter** translates: your code depends on `PaymentGateway.charge(amount, token)`; an adapter maps that to a vendor SDK's different method names and types, so switching vendors touches one class.",
    ] },

    { type: "h2", text: "Using patterns well in an interview" },
    { type: "ul", items: [
      "**Start from requirements:** \"pricing varies by time and vehicle type and will change\" → strategy. \"Several displays need updates\" → observer.",
      "**Name the change it enables** each time you introduce a pattern.",
      "**Prefer composition** (strategy, decorator, state) over deep inheritance trees.",
      "**Be careful with singletons:** they hide dependencies and complicate tests and concurrency. Prefer passing one instance explicitly.",
      "**Mention thread safety** where shared state appears, such as two gates assigning the same spot: lock per spot or use atomic operations.",
    ] },
    { type: "callout", tone: "tip", text: "Many architecture ideas are these patterns at a larger scale: an API gateway is a facade, a sidecar proxy is a decorator, a webhook is an observer across systems, and a job queue is the command pattern." },
  ],
  uses: [
    { name: "LLD interviews", text: "Parking lots, vending machines, elevators and ride booking use strategy, state, observer and factory." },
    { name: "Frameworks and libraries", text: "Middleware chains, event listeners, builders and adapters appear throughout common frameworks." },
    { name: "Service code", text: "Decorators add retries, caching and metrics around clients without changing them." },
  ],
  interview: [
    "Tie each pattern to a requirement and the change it makes easy.",
    "Know strategy, observer, factory, state, decorator and adapter well enough to code them.",
    "Prefer composition and avoid gratuitous singletons.",
    "Discuss thread safety for shared state.",
  ],
  related: ["solid-principles", "hld-vs-lld", "pub-sub", "api-gateway", "retries-and-timeouts"],
  practice: ["rate-limiter", "notification-service", "ticket-booking"],
  reading: [
    { title: "Refactoring Guru: Design Patterns catalog", publisher: "Refactoring Guru", url: "https://refactoring.guru/design-patterns/catalog" },
    { title: "Design Patterns: Elements of Reusable Object-Oriented Software", publisher: "Wikipedia (Gang of Four book)", url: "https://en.wikipedia.org/wiki/Design_Patterns" },
  ],
};
