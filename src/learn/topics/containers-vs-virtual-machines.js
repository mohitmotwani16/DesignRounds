export default {
  blocks: [
    { type: "p", text: "A **virtual machine (VM)** runs a complete guest operating system on virtualised hardware provided by a **hypervisor**. A **container** runs as an ordinary process on the host's kernel, isolated by kernel features such as **namespaces** and **cgroups**, and packaged with its application and libraries in an **image**. Containers are lighter and start in seconds or less; VMs give stronger isolation. Most cloud platforms run containers inside VMs, getting both." },

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
  ],
};
