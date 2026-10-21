export default {
  blocks: [
    { type: "p", text: "A **virtual machine (VM)** runs a complete guest operating system on virtualised hardware provided by a **hypervisor**. A **container** runs as an ordinary process on the host's kernel, isolated by kernel features such as **namespaces** and **cgroups**, and packaged with its application and libraries in an **image**. Containers are lighter and start in seconds or less; VMs give stronger isolation. Most cloud platforms run containers inside VMs, getting both." },

    { type: "h2", text: "From physical servers to serverless" },
    { type: "p", text: "Where code runs has changed steadily, each step trading some control for efficiency and convenience: physical servers, then virtual machines, then containers, then serverless. Each still has its place." },
    { type: "diagram", kind: "flow", caption: "Four computing environments. Moving right, you manage less of the stack yourself and pay for capacity in finer slices.", nodes: [
      { id: "p", label: "Physical server", sub: "you own the hardware", col: 0, row: 0, tone: "muted" },
      { id: "v", label: "Virtual machines", sub: "many OSes per server", col: 1.3, row: 0, tone: "store" },
      { id: "c", label: "Containers", sub: "many apps per OS kernel", col: 2.6, row: 0, tone: "ok" },
      { id: "s", label: "Serverless", sub: "just your code", col: 3.9, row: 0, tone: "accent" },
    ], edges: [{ from: "p", to: "v" }, { from: "v", to: "c" }, { from: "c", to: "s" }] },
    { type: "h3", text: "Physical servers" },
    { type: "p", text: "Running \"on the metal\": a real machine that hosts the operating system, applications and data, built to store, process and serve data around the clock." },
    { type: "ul", items: [
      "**Pros**: complete **control** over hardware, software and configuration; top **performance**, since nothing is shared with other workloads.",
      "**Cons**: **expensive** to buy, run (power, cooling) and upgrade; **slow to scale**, because more capacity means buying and installing hardware.",
      "**When to use**: high-performance computing and workloads that need full control, such as large enterprises running heavy big-data analytics or HPC jobs, latency-critical trading systems, or very steady workloads where owning hardware is cheaper than renting.",
    ] },
    { type: "h3", text: "Virtual machines" },
    { type: "p", text: "A VM emulates a whole computer. Several VMs run side by side on one physical server, each with its own operating system and applications, and possibly different operating systems." },
    { type: "ul", items: [
      "**Pros**: **isolation** (one VM crashing doesn't affect the others) and much **better utilization** of the physical server.",
      "**Cons**: some **performance overhead** from translating between the guest and host; **resource-heavy**, since each VM carries a full copy of an operating system.",
      "**When to use**: running several isolated systems on one server, for example a development environment testing different operating systems or software versions, or legacy apps that need a specific OS.",
    ] },
    { type: "h3", text: "Containers" },
    { type: "p", text: "A container packages an application and its dependencies into one self-contained unit that runs the same anywhere. It doesn't carry a full operating system: containers **share the host's kernel**, which makes them much lighter and faster to start than VMs." },
    { type: "ul", items: [
      "**Pros**: **portability** (the same image runs on a laptop, in CI and in production) and **efficiency** (no guest OS per app).",
      "**Cons**: **weaker isolation**, since containers on one host share a kernel, which can expose security vulnerabilities; **operational complexity**, because many containers need an orchestrator such as [Kubernetes](/learn/kubernetes-architecture).",
      "**When to use**: deploying [microservices](/learn/monolith-vs-microservices), and apps that must scale up and down quickly, such as web apps with variable traffic.",
    ] },
    { type: "p", text: "In short: a VM bundles the app, its libraries **and a full guest OS** on virtual hardware; a container bundles the app and its libraries and **shares the host OS kernel**. Choose VMs for full isolation or a specific OS; choose containers for efficiency, speed and scale in cloud-native systems. Julia Evans' well-known comic sums up the differences:" },
    { type: "ul", items: [
      "**A container is a group of processes**: one Linux kernel can run lots of containers.",
      "**A VM is a pretend computer**: each one runs its own operating system (Linux, Windows, BSD) on the same physical machine.",
      "**Containers use less RAM**: they share one kernel, so a machine can run thousands of small containers.",
      "**Containers start faster**: they're just processes, while a VM has to boot an operating system.",
      "**Containers are harder to secure**: a VM is isolated from other VMs by design; how isolated a container is depends on how it was configured.",
      "**It's harder to know what a container can do**: it looks like a computer but has exceptions a VM doesn't have.",
    ] },
    { type: "h3", text: "Serverless" },
    { type: "p", text: "In serverless computing the cloud provider allocates machine resources dynamically; developers deploy code and the provider runs the infrastructure." },
    { type: "ul", items: [
      "**Pros**: **cost-effective** for sporadic or event-driven work, since you pay only for actual processing time; **scales automatically** with unpredictable traffic.",
      "**Cons**: **cold starts**, a delay when a function runs after being idle; **less control** over the infrastructure and runtime.",
      "**When to use**: **event-driven** applications, quick prototypes, and workloads with unpredictable demand such as APIs, data processing and IoT. See [serverless](/learn/serverless).",
    ] },
    { type: "h3", text: "The four compared" },
    { type: "table", head: ["", "Physical servers", "Virtual machines", "Containers", "Serverless"], rows: [
      ["What it is", "Real hardware running the OS, apps and data (\"on the metal\")", "An emulated computer on a physical server, with its own OS and apps", "An app plus its dependencies in a self-contained unit, sharing the host kernel", "Code run by a cloud provider that allocates resources dynamically"],
      ["Pros", "Complete control, high performance", "Isolation, better resource use", "Portability, efficiency", "Pay per use, automatic scaling"],
      ["Cons", "High cost, slow to scale", "Overhead, resource-heavy", "Weaker isolation, orchestration complexity", "Cold starts, less control"],
      ["Ideal for", "HPC, workloads needing full control", "Several isolated systems per server; testing different OSes", "Microservices; apps that scale quickly", "Event-driven apps, prototypes, unpredictable demand"],
    ] },

    { type: "h2", text: "How each isolates workloads" },
    { type: "diagram", kind: "flow", caption: "VMs virtualise hardware and each carries its own kernel; containers share the host kernel and isolate processes with namespaces and cgroups.", nodes: [
      { id: "hw1", label: "Hardware", col: 0, row: 2, tone: "muted", w: 200 },
      { id: "hv", label: "Hypervisor", col: 0, row: 1, tone: "accent", w: 200 },
      { id: "vm", label: "VM: guest OS + kernel", sub: "app + libraries", col: 0, row: 0, w: 200 },
      { id: "hw2", label: "Hardware", col: 2, row: 2, tone: "muted", w: 200 },
      { id: "os", label: "Host OS + shared kernel", sub: "container runtime", col: 2, row: 1, tone: "accent", w: 200 },
      { id: "ct", label: "Containers", sub: "app + libraries only", col: 2, row: 0, w: 200 },
    ], edges: [
      { from: "vm", to: "hv" }, { from: "hv", to: "hw1" }, { from: "ct", to: "os" }, { from: "os", to: "hw2" },
    ] },
    { type: "ul", items: [
      "**Namespaces** give a container its own view of process IDs, network interfaces, mount points, hostnames and users, so it can't see other processes.",
      "**cgroups** limit and account for CPU, memory and I/O, so one container can't starve the others.",
      "**Images** are layered, read-only filesystems with the app and its dependencies, built once and run identically everywhere.",
    ] },

    { type: "h2", text: "Containers vs VMs compared" },
    { type: "table", head: ["", "Virtual machines", "Containers"], rows: [
      ["Isolation boundary", "Hardware virtualisation; separate kernels", "Kernel features; shared host kernel"],
      ["Startup time", "Tens of seconds to minutes (boot an OS)", "Milliseconds to seconds (start a process)"],
      ["Size", "Gigabytes (full OS image)", "Megabytes to hundreds of megabytes"],
      ["Density", "Fewer per host", "Many more per host"],
      ["Security", "Stronger: a kernel exploit in one guest doesn't reach others", "Weaker by default: a kernel vulnerability can affect every container on the host"],
      ["OS flexibility", "Any guest OS, including different kernels", "Must match the host kernel family"],
      ["Typical use", "Isolating tenants, legacy apps, different operating systems", "Microservices, CI jobs, batch work, fast scaling"],
    ] },

    { type: "h2", text: "Stronger isolation for containers" },
    { type: "p", text: "When untrusted code shares hosts (multi-tenant platforms, user-submitted code), plain containers aren't enough. Options include running each tenant's containers in separate VMs or node pools, **sandboxed runtimes** that intercept system calls in user space, and **microVMs** that start a minimal VM per container in a fraction of a second, which is how many serverless platforms isolate functions. Defence in depth also means running containers as non-root, dropping Linux capabilities, using read-only filesystems and restricting system calls." },

    { type: "h2", text: "Why containers changed deployment" },
    { type: "ul", items: [
      "**Immutable artifacts:** the same image runs in CI, staging and production, removing \"works on my machine\" differences.",
      "**Fast scaling and recovery:** new instances start in seconds, which makes [autoscaling](/learn/autoscaling) and replacing unhealthy instances cheap.",
      "**Bin-packing:** an orchestrator such as [Kubernetes](/learn/kubernetes-architecture) packs many containers onto fewer machines, raising utilisation.",
      "**Clear contracts:** an image declares its ports, environment and resource requests, so platforms can run any team's service the same way.",
    ] },
    { type: "callout", tone: "tip", text: "Containers are not lightweight VMs: treat them as disposable processes. Keep state in databases or volumes, log to stdout, and expect any container to be killed and replaced at any time." },
  ],
  uses: [
    { name: "Microservices", text: "Each service ships as a container image and runs on a shared Kubernetes cluster." },
    { name: "Serverless platforms", text: "Functions run in microVMs or sandboxed containers that start fast but isolate tenants." },
    { name: "Legacy and regulated workloads", text: "Applications needing a specific OS or strict isolation run on dedicated VMs." },
  ],
  interview: [
    "Explain namespaces, cgroups and the shared kernel.",
    "Compare isolation, startup time and density honestly.",
    "Use VMs, sandboxes or microVMs for untrusted multi-tenant code.",
    "Treat containers as disposable and keep state outside them.",
  ],
  related: ["kubernetes-architecture", "serverless", "multi-tenancy", "autoscaling", "ci-cd-pipelines"],
  practice: ["service-platform", "deployment-platform"],
  reading: [
    { title: "Linux namespaces man page", publisher: "man7.org", url: "https://man7.org/linux/man-pages/man7/namespaces.7.html" },
    { title: "Firecracker: Lightweight Virtualization for Serverless Applications", publisher: "Agache et al., NSDI 2020", url: "https://www.usenix.org/conference/nsdi20/presentation/agache" },
    { title: "Containers vs VMs (comic)", publisher: "Julia Evans", url: "https://twitter.com/b0rk/status/1237744128450072578" },
  ],
};
