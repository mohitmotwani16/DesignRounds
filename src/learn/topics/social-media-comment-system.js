// Hands-on case study: a social media comment system with separate write and read paths:
// Flask uploader → Kafka buffer → DB updater → MongoDB + Redis → Flask fetcher.
export default {
  blocks: [
    { type: "p", text: "This hands-on build applies the [system design template](/learn/system-design-template) to a real mini app: the comment section under an Instagram post or a YouTube video. Along the way you'll see three ideas you'll reuse constantly: a **message queue as a buffer** between services that run at different speeds, **eventual consistency**, and designs with **separate read and write paths**." },
    { type: "p", text: "Two loads shape the design. A viral post brings a **burst of comments**, more than the database can write at once, so a queue absorbs the burst. And **millions of readers** put even more load on the database, so user-facing reads never hit it directly: they're served from a cache." },

    { type: "h2", text: "Architecture" },
    { type: "diagram", kind: "flow", caption: "Write path: POST → Comment Uploader → Kafka → Database Updater → MongoDB, then the same record into Redis. Read path: GET → Comment Fetcher → Redis.", zones: [{ label: "Write path", from: [0, 0], to: [4.2, 0], tone: "accent" }, { label: "Read path", from: [0, 1.6], to: [4.2, 1.6], tone: "ok" }], nodes: [
      { id: "u1", label: "User", sub: "POST /comments", col: 0, row: 0, shape: "pill" },
      { id: "up", label: "Comment Uploader", sub: "Flask :5001", col: 1, row: 0, tone: "accent" },
      { id: "k", label: "Kafka", sub: "topic: comments", col: 2.1, row: 0, shape: "queue", tone: "queue" },
      { id: "dbu", label: "Database Updater", sub: "Kafka consumer", col: 3.2, row: 0, tone: "accent" },
      { id: "m", label: "MongoDB", sub: "socialnetwork.comments", col: 4.2, row: 0, shape: "db", tone: "store" },
      { id: "u2", label: "User", sub: "GET /comments?post_id=1", col: 0, row: 1.6, shape: "pill", w: 170 },
      { id: "f", label: "Comment Fetcher", sub: "Flask :5002", col: 1.6, row: 1.6, tone: "ok" },
      { id: "r", label: "Redis", sub: "hash post:<post_id>", col: 3.2, row: 1.6, shape: "db", tone: "cache" },
    ], edges: [{ from: "u1", to: "up" }, { from: "up", to: "k", label: "enqueue" }, { from: "k", to: "dbu" }, { from: "dbu", to: "m", label: "insert" }, { from: "dbu", to: "r", label: "then cache" }, { from: "u2", to: "f" }, { from: "f", to: "r", label: "read" }] },
    { type: "table", head: ["Component", "Role", "Built with"], rows: [
      ["Comment Uploader", "HTTP POST API to submit a comment; returns as soon as the message is queued", "Flask"],
      ["Message queue", "Buffer between the user-facing service and the database writer", "Kafka"],
      ["Database Updater", "Consumes messages, stores each comment permanently, then writes the same record into the cache", "Python Kafka consumer"],
      ["Database", "Permanent storage. Comments have no complex relationships, so a document store fits. See [document databases](/learn/document-databases)", "MongoDB"],
      ["Cache", "Serves all reads", "Redis"],
      ["Comment Fetcher", "HTTP GET API returning all comments for a post", "Flask"],
    ] },
    { type: "ul", items: [
      "**Write path**: the user sends a comment to the Uploader → it's enqueued in Kafka → the Database Updater consumes it and inserts it into MongoDB → after the insert succeeds, it writes the same record into Redis.",
      "**Read path**: the page calls the Comment Fetcher, which reads the post's comments from Redis and returns them.",
    ] },

    { type: "h2", text: "Data model" },
    { type: "p", text: "**MongoDB**: database `socialnetwork`, collection `comments`, documents `{ _id: ObjectId, post_id: string, comment: string }`:" },
    { type: "code", code: `socialnetwork> db.comments.find()
[
  { _id: ObjectId("6466a681bec0bd23bec4ce12"), post_id: '1', comment: 'this is a great post thank you' }
]` },
    { type: "p", text: "**Redis**: one hash per post, key `post:<post_id>`, with each field a comment ID and each value the comment as JSON:" },
    { type: "code", code: `127.0.0.1:6379> HGETALL "post:1"
1) "6466a29c6fb786d66e584e5a"
2) "{\"post_id\": \"1\", \"comment\": \"this is a great post thank you\", \"_id\": \"6466a29c6fb786d66e584e5a\"}"
3) "6466a681bec0bd23bec4ce12"
4) "{\"post_id\": \"1\", \"comment\": \"this is another great post thank you\", \"_id\": \"6466a681bec0bd23bec4ce12\"}"` },
    { type: "p", text: "**Kafka**: the Uploader publishes each comment to a topic named `comments`." },

    { type: "h2", text: "Infrastructure: docker-compose.yml" },
    { type: "code", code: `services:
  kafka:
    image: apache/kafka:3.8.0        # single-node KRaft broker, no ZooKeeper needed
    ports: ["9092:9092"]
  redis:
    image: redis:7
    ports: ["6379:6379"]
  mongo:
    image: mongo:7
    ports: ["27017:27017"]` },
    { type: "p", text: "`docker compose up` starts Kafka on 9092, Redis on 6379 and MongoDB on 27017 (older Kafka setups also ran ZooKeeper for coordination; current Kafka uses its built-in KRaft consensus). Then `pip install flask kafka-python pymongo redis`. Optional CLIs for poking around: Kafka's console tools, `redis-cli` and `mongosh`." },

    { type: "h2", text: "The three services" },
    { type: "h3", text: "Comment Uploader (write API)" },
    { type: "code", code: `# comment_uploader.py
import json
from flask import Flask, request
from kafka import KafkaProducer

app = Flask(__name__)
producer = KafkaProducer(bootstrap_servers="localhost:9092")

@app.route("/comments", methods=["POST"])
def upload_comment():
    data = request.get_json()
    message = {"post_id": data.get("post_id"), "comment": data.get("comment")}
    producer.send("comments", value=json.dumps(message).encode())
    return "Comment uploaded", 200        # respond immediately; storage happens asynchronously

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)` },
    { type: "h3", text: "Database Updater (Kafka consumer)" },
    { type: "code", code: `# db_updater.py
import json
import redis
from bson import ObjectId
from kafka import KafkaConsumer
from pymongo import MongoClient

class JSONEncoder(json.JSONEncoder):          # make MongoDB's ObjectId JSON-serializable
    def default(self, o):
        return str(o) if isinstance(o, ObjectId) else super().default(o)

consumer = KafkaConsumer("comments", bootstrap_servers=["localhost:9092"], group_id="db-updater",
                         value_deserializer=lambda x: json.loads(x.decode("utf-8")))
collection = MongoClient("mongodb://localhost:27017/")["socialnetwork"]["comments"]
cache = redis.Redis(host="localhost", port=6379, db=0)

for message in consumer:
    comment = message.value
    result = collection.insert_one(comment)          # 1. permanent storage (adds _id)
    if result.acknowledged:                          # 2. then update the cache
        comment_id = str(result.inserted_id)
        cache.hset(f"post:{comment['post_id']}", comment_id, json.dumps(comment, cls=JSONEncoder))
        print(comment)
    else:
        print("Error: failed to insert comment into MongoDB")` },
    { type: "h3", text: "Comment Fetcher (read API)" },
    { type: "code", code: `# comment_fetcher.py
import json
import redis
from flask import Flask, request

app = Flask(__name__)
cache = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

@app.route("/comments", methods=["GET"])
def get_comments():
    post_id = request.args.get("post_id")
    comments = cache.hgetall(f"post:{post_id}")     # all comments for this post
    return {"comments": [json.loads(c) for c in comments.values()]}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002)` },
    { type: "p", text: "Run each in its own terminal: `python comment_uploader.py` (port 5001), `python db_updater.py` (waits for messages), `python comment_fetcher.py` (port 5002). Optionally watch the topic with `kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic comments --from-beginning`." },

    { type: "h2", text: "Testing it" },
    { type: "code", code: `curl -X POST http://localhost:5001/comments \\
     -H "Content-Type: application/json" \\
     -d '{"post_id":"1", "comment":"this is a great post thank you"}'` },
    { type: "ol", items: [
      "The Uploader logs `\"POST /comments HTTP/1.1\" 200`.",
      "The Kafka console consumer (if running) shows `{\"post_id\": \"1\", \"comment\": \"this is a great post thank you\"}`.",
      "`db_updater.py` prints the comment with its new `_id`.",
      "`db.comments.find()` in mongosh shows the document.",
      "`HGETALL \"post:1\"` in redis-cli shows the cached record.",
      "`http://localhost:5002/comments?post_id=1` returns `{\"comments\": [{\"_id\": \"6466a681…\", \"comment\": \"this is a great post thank you\", \"post_id\": \"1\"}]}`.",
    ] },

    { type: "h2", text: "Load test: buffering and eventual consistency" },
    { type: "p", text: "Put the request body in `post_data.json`, then fire 10,000 requests with 100 concurrent connections using Apache Bench:" },
    { type: "code", code: `echo '{"post_id":"1", "comment":"this is a great post thank you"}' > post_data.json
ab -n 10000 -c 100 -p post_data.json -T 'application/json' http://127.0.0.1:5001/comments` },
    { type: "p", text: "While it runs, `HGETALL \"post:1\"` (or the read API) returns **fewer** comments than were sent: messages pile up in Kafka faster than the single consumer drains them. A few seconds later the consumer catches up, and Redis, the read API and MongoDB all agree. Two lessons:" },
    { type: "ul", items: [
      "**Eventual consistency**: user A gets 200 immediately, yet user B may not see A's comment for a few seconds. The inconsistency disappears on its own, which is fine for a non-critical feature like comments. See [consistency models](/learn/consistency-models).",
      "**A message queue as a buffer**: without Kafka, the service couldn't accept requests faster than the database can write. The queue holds messages in flight and lets you scale consumers separately. See [message queues](/learn/message-queues).",
    ] },
    { type: "diagram", kind: "timeline", caption: "During the burst, writes are acknowledged instantly but the read path lags behind; once the consumer catches up, every store agrees.", ticks: ["0 s", "2 s", "4 s", "6 s", "8 s", "10 s"], spans: [
      { from: 0, to: 4, label: "10,000 POSTs accepted (200 OK)", lane: 0, tone: "accent" },
      { from: 0, to: 6.5, label: "consumer draining the Kafka backlog", lane: 1, tone: "queue" },
      { from: 6.5, to: 10, label: "Redis = MongoDB = 10,000", lane: 2, tone: "ok" },
    ], marks: [{ at: 6.5, label: "consistent" }] },

    { type: "h2", text: "Taking it to production" },
    { type: "ul", items: [
      "**Order and paginate**: store comment IDs in a sorted set per post (score = timestamp) and fetch pages with `ZREVRANGE`, instead of returning every comment from a hash. See [pagination](/learn/pagination).",
      "**Bound the cache**: keep only recent or top comments per post in Redis with a TTL; on a miss, read MongoDB (indexed on `post_id, created_at`) and refill. See [cache strategies](/learn/cache-strategies).",
      "**Make consumers idempotent**: Kafka delivers at least once, so give each comment a client-generated ID and upsert, or a retry creates duplicates. See [delivery semantics](/learn/delivery-semantics).",
      "**Scale out**: partition the topic by `post_id` (keeps per-post order) and run several updater instances in one consumer group. See [Kafka](/learn/event-streaming-kafka).",
      "**Read-your-writes**: show a user's own new comment immediately from the client (optimistic UI) so the async lag isn't confusing.",
      "**Moderation and counts**: spam filtering as another consumer of the same topic; comment counts as a counter updated by the updater.",
    ] },
    { type: "p", text: "This template (separate write and read paths, a queue buffering writes, a cache serving reads) comes up again and again: feeds, likes, notifications, analytics events." },
  ],
  uses: [
    { name: "Comments and replies", text: "Instagram, YouTube and Reddit-style threads with bursty writes and huge read fan-in." },
    { name: "Likes and reactions", text: "Queue-buffered counter updates with cached totals." },
    { name: "Reviews and ratings", text: "Asynchronous writes, cached reads, moderation as a consumer." },
    { name: "Chat history", text: "The same write/read split with per-conversation partitions." },
  ],
  interview: [
    "Separate the write path (API → queue → writer → DB → cache) from the read path (API → cache).",
    "Explain the queue as a buffer against bursts and the resulting eventual consistency.",
    "Cover pagination, cache misses, idempotent consumers and partitioning by post_id.",
  ],
  related: ["system-design-template", "message-queues", "caching", "document-databases", "consistency-models", "event-streaming-kafka"],
  practice: ["comment-system", "news-feed", "chat-system"],
};
