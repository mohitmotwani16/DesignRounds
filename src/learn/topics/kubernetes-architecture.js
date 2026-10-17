export default {
  blocks: [
    { type: "p", text: "**Kubernetes** is a container orchestrator: you declare the state you want (\"run five replicas of this image, reachable on this port\") and it continuously works to make the cluster match. Its architecture splits into a **control plane** (the API server, the etcd database, the scheduler and controllers) and **worker nodes** that run your **pods**. Almost everything it does follows one pattern, the **reconciliation loop**: observe actual state, compare it with desired state, act to close the gap." },

    { type: "h2", text: "Control plane and nodes" },
    { type: "diagram", kind: "flow", caption: "Everything talks to the API server; etcd stores desired and observed state; the scheduler places pods; kubelets run them on nodes.", nodes: [
      { id: "user", label: "kubectl / CI", col: 0, row: 1, shape: "pill" },
      { id: "api", label: "API server", sub: "auth · validation", col: 1.3, row: 1, tone: "accent" },
      { id: "etcd", label: "etcd", sub: "cluster state", col: 1.3, row: 2.2, shape: "db", tone: "store" },
      { id: "sched", label: "Scheduler", col: 2.6, row: 0.2 },
      { id: "ctrl", label: "Controller manager", sub: "deployments · nodes · jobs", col: 2.6, row: 1.4 },
      { id: "n1", label: "Node: kubelet", sub: "pods · kube-proxy", col: 4, row: 0.6 },
      { id: "n2", label: "Node: kubelet", sub: "pods · kube-proxy", col: 4, row: 1.8 },
    ], edges: [
      { from: "user", to: "api" }, { from: "api", to: "etcd" }, { from: "sched", to: "api", both: true },
      { from: "ctrl", to: "api", both: true }, { from: "n1", to: "api", both: true }, { from: "n2", to: "api", both: true },
    ] },
    { type: "table", head: ["Component", "Responsibility"], rows: [
      ["API server", "The front door. Authenticates and validates every request, and is the only component that talks to etcd"],
      ["etcd", "A strongly consistent, [Raft-replicated](/learn/consensus) key-value store holding all cluster state"],
      ["Scheduler", "Assigns unscheduled pods to nodes based on resource requests, affinity rules, taints and spread constraints"],
      ["Controller manager", "Runs controllers, each reconciling one kind of object: ReplicaSets keep N pods, Deployments roll out versions, node controllers react to dead nodes"],
      ["kubelet (per node)", "Ensures the containers for pods assigned to its node are running and healthy, and reports status"],
      ["kube-proxy / CNI (per node)", "Implements service networking and pod-to-pod connectivity"],
    ] },

    { type: "h2", text: "The core objects" },
    { type: "ul", items: [
      "**Pod:** the smallest unit, one or more containers sharing a network namespace and volumes, scheduled together on one node. Pods are disposable.",
      "**Deployment:** desired replicas and a pod template; it rolls out changes by managing ReplicaSets, with rolling updates by default. See [deployment strategies](/learn/deployment-strategies).",
      "**StatefulSet:** pods with stable names and their own persistent volumes, for databases and other stateful systems.",
      "**DaemonSet:** one pod per node, for agents such as log shippers.",
      "**Job / CronJob:** run-to-completion work, once or on a schedule.",
      "**Service:** a stable virtual IP and DNS name in front of a changing set of pods selected by labels. See [service discovery](/learn/service-discovery).",
      "**Ingress / Gateway:** HTTP routing from outside the cluster to services.",
      "**ConfigMap and Secret:** configuration and sensitive values injected into pods. See [secrets management](/learn/secrets-management).",
    ] },

    { type: "h2", text: "What happens when you deploy" },
    { type: "ol", items: [
      "You apply a Deployment manifest; the API server validates it and stores it in etcd.",
      "The Deployment controller sees a new pod template and creates a new ReplicaSet, scaling it up while scaling the old one down, within surge and unavailability limits.",
      "The ReplicaSet controller creates pod objects; they're unscheduled.",
      "The scheduler picks a node for each pod and records the binding.",
      "The kubelet on that node pulls the image, starts containers and runs probes. Once the **readiness probe** passes, the pod is added to its Service's endpoints and receives traffic.",
      "If a container crashes, the kubelet restarts it; if a node dies, controllers recreate its pods elsewhere.",
    ] },
    { type: "callout", tone: "tip", text: "Readiness and liveness probes are different: readiness decides whether a pod gets traffic, liveness decides whether it gets restarted. A liveness probe that checks a database will restart every pod during a database blip. See [health checks](/learn/health-checks-failover)." },

    { type: "h2", text: "Resources, scaling and reliability" },
    { type: "ul", items: [
      "**Requests and limits:** requests reserve CPU and memory for scheduling; limits cap usage. A container over its memory limit is killed; CPU over its limit is throttled.",
      "**Autoscaling:** the Horizontal Pod Autoscaler adds pods based on CPU or custom metrics, and a cluster autoscaler adds nodes when pods can't be scheduled. See [autoscaling](/learn/autoscaling).",
      "**Spreading:** topology spread constraints and anti-affinity keep replicas across nodes and zones, so one failure doesn't take them all.",
      "**PodDisruptionBudgets** limit how many replicas voluntary disruptions (node upgrades) can take down at once.",
      "**Control plane availability:** run the API server and etcd replicated across zones; workloads keep running if the control plane is briefly down, but nothing new can be scheduled.",
    ] },
  ],
  uses: [
    { name: "Microservice platforms", text: "Hundreds of services run as Deployments behind Services, with autoscaling and rolling updates." },
    { name: "Batch and ML jobs", text: "Jobs and specialised operators schedule training and data processing on GPU node pools." },
    { name: "Internal platforms", text: "Platform teams expose templates on top of Kubernetes so product teams don't write manifests by hand." },
  ],
  interview: [
    "Describe the control plane components and the reconciliation loop.",
    "Walk through a deployment from manifest to ready pod.",
    "Distinguish readiness from liveness probes.",
    "Spread replicas across zones and set requests, limits and disruption budgets.",
  ],
  related: ["containers-vs-virtual-machines", "service-discovery", "autoscaling", "deployment-strategies", "consensus"],
  practice: ["service-platform", "deployment-platform", "service-discovery"],
  reading: [
    { title: "Kubernetes components", publisher: "The Kubernetes Authors", url: "https://kubernetes.io/docs/concepts/overview/components/" },
    { title: "Borg, Omega, and Kubernetes", publisher: "Burns et al., Google Research", url: "https://research.google/pubs/borg-omega-and-kubernetes/" },
  ],
};
