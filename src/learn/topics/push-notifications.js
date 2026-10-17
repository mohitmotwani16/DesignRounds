export default {
  blocks: [
    { type: "p", text: "**Push notifications** let a server reach a user's device when the app isn't open. Your backend doesn't connect to phones directly: it sends each message to a platform push service, **Apple Push Notification service (APNs)** for iOS, **Firebase Cloud Messaging (FCM)** for Android, or a browser vendor's **Web Push** service, which delivers it over a connection the operating system keeps open. Designing a notification system means managing device tokens, fanning out at scale, respecting preferences, and accepting that delivery is best-effort." },

    { type: "h2", text: "How delivery works" },
    { type: "diagram", kind: "flow", caption: "Apps register for a device token; the backend's notification service sends messages through APNs, FCM or Web Push, which deliver to the device.", nodes: [
      { id: "app", label: "App on device", sub: "gets device token", col: 0, row: 1, shape: "pill" },
      { id: "reg", label: "Token registry", sub: "user → tokens", col: 1.3, row: 0, shape: "db", tone: "store" },
      { id: "event", label: "Product events", sub: "new message, order shipped", col: 1.3, row: 2.2, shape: "queue", tone: "queue" },
      { id: "ns", label: "Notification service", sub: "prefs · templates · rate limits", col: 2.6, row: 1, tone: "accent" },
      { id: "pns", label: "APNs · FCM · Web Push", col: 3.9, row: 1, tone: "muted" },
    ], edges: [
      { from: "app", to: "reg", label: "register token" }, { from: "event", to: "ns" }, { from: "reg", to: "ns", dashed: true },
      { from: "ns", to: "pns" }, { from: "pns", to: "app", dashed: true, label: "deliver" },
    ] },
    { type: "ol", items: [
      "The app asks the user for permission and registers with the platform, receiving a **device token** that identifies this app install on this device.",
      "The app sends the token to your backend, which stores it against the user. A user may have many tokens (phone, tablet, browsers).",
      "When something happens, the notification service decides whether, what and when to notify, then sends a request to APNs, FCM or a Web Push endpoint with the token and payload.",
      "The platform delivers the message when the device is reachable, and the OS shows it or wakes the app.",
    ] },

    { type: "h2", text: "Delivery is best-effort" },
    { type: "ul", items: [
      "Platform services queue messages for offline devices only for a limited time, and may collapse several pending messages into the latest one.",
      "Devices in power-saving modes may delay delivery; users may disable notifications entirely.",
      "There's no reliable delivery receipt for whether the user saw it.",
      "So **never put critical state only in a notification.** The app should fetch the source of truth when opened (an inbox, sync on launch). See [offline-first sync](/learn/offline-first-sync).",
    ] },

    { type: "h2", text: "Managing tokens" },
    { type: "ul", items: [
      "Tokens change on reinstall, restore and sometimes periodically; the app must send the current token on every launch.",
      "When the push service reports a token as invalid or unregistered, delete it immediately, or you'll keep paying to send to dead devices and may be throttled.",
      "On sign-out, unlink the token from the user so the next person on that device doesn't get their notifications.",
    ] },

    { type: "h2", text: "Sending at scale" },
    { type: "ul", items: [
      "**Queue and fan out:** a broadcast to millions of users is split into batches processed by workers from a [message queue](/learn/message-queues), with retries and a dead-letter queue.",
      "**Respect provider limits:** push services rate-limit senders; use their batch or HTTP/2 multiplexed APIs and back off on throttling.",
      "**Deduplicate:** use a notification ID so retries and duplicate events don't buzz the user twice. See [idempotency](/learn/idempotency).",
      "**Prioritise:** transactional notifications (OTP codes, order updates) go ahead of marketing campaigns in separate queues.",
      "**Track outcomes:** sent, accepted by the provider, failed, opened, so you can measure and debug.",
    ] },

    { type: "h2", text: "Being a good citizen" },
    { type: "ul", items: [
      "**Preferences:** per-channel and per-category opt-outs, honoured everywhere.",
      "**Quiet hours and time zones:** don't send non-urgent notifications at 3 a.m. local time; schedule them.",
      "**Frequency caps and digests:** merge many low-value events (\"12 people liked your post\") instead of sending each.",
      "**Ask for permission in context,** after the user understands the value, not on first launch.",
      "**Keep payloads small and non-sensitive:** lock screens show them. Send an ID and let the app fetch details securely.",
    ] },
  ],
  uses: [
    { name: "Messaging apps", text: "A push wakes the app or shows a preview; the app then syncs the conversation from the server." },
    { name: "E-commerce", text: "Order, delivery and price-drop notifications with quiet hours and per-category preferences." },
    { name: "Security", text: "Login approval prompts and alerts, prioritised ahead of marketing traffic." },
  ],
  interview: [
    "Explain device tokens and the role of APNs, FCM and Web Push.",
    "Treat delivery as best-effort and keep the source of truth in the app's sync.",
    "Fan out through queues with deduplication, priorities and provider rate limits.",
    "Cover preferences, quiet hours, frequency caps and token cleanup.",
  ],
  related: ["message-queues", "real-time-communication", "offline-first-sync", "idempotency", "rate-limiting"],
  practice: ["notification-service", "offline-first-sync"],
  reading: [
    { title: "Firebase Cloud Messaging architecture overview", publisher: "Firebase documentation", url: "https://firebase.google.com/docs/cloud-messaging/fcm-architecture" },
    { title: "Push API", publisher: "MDN Web Docs (Mozilla)", url: "https://developer.mozilla.org/en-US/docs/Web/API/Push_API" },
  ],
};
