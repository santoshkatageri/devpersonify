# Starter Repository Specification — `event-driven-microservices-starter`

> **Status:** Planning artifact. The starter repository does **not** exist yet.
> This document defines exactly what `event-driven-microservices-starter@main`
> contains on **Day 1**. It is the specification used to create that repository
> in a later phase — no repository is created in this phase.

Related documents:
- [reference-vs-starter.md](./reference-vs-starter.md) — what the reference is and what may be reused.
- [repository-evolution.md](./repository-evolution.md) — what changes on each of Days 2–21.
- [checkpoint-strategy.md](./checkpoint-strategy.md) — how mission states are captured.

---

## 1. Purpose and positioning

`event-driven-microservices-starter` is the **learner's engineering workspace**.

- It contains a **real, runnable, non-trivial application** from Day 1: an
  event-driven order-processing platform (Spring Boot / Java 21, PostgreSQL,
  Apache Kafka).
- It **deliberately does not** contain the production-engineering layer around
  the application: containerization of services, observability stack, CI/CD,
  Terraform/AWS, scaling/resilience tooling, security hardening.
- Over the 21 missions the learner **engineers the system around the
  application** — they do **not** progressively implement a large Java
  application. Java/Spring is the laboratory; it is not the curriculum.

The learner's reaction on Day 1 should be:

> "This is a real application. It runs, it takes orders, it talks to a
> database and to Kafka. My job over the next 21 missions is to engineer
> everything *around* it — the design, the runtime, the delivery, the
> observability, the cloud, the resilience, the security, and the defense."

It must **not** feel like an artificial skeleton (empty modules, `TODO`
stubs, missing wiring). It must also **not** be the completed production
platform (that would make the missions trivial).

---

## 2. Repository structure (Day 1)

```
event-driven-microservices-starter/
├── README.md                       # Day-1 quickstart: build, run, verify the app
├── pom.xml                         # Maven aggregator (parent: Spring Boot 3.5.x, Java 21)
├── .gitignore
│
├── contracts/                      # Shared Kafka topic names + event records (Java)
│   ├── pom.xml
│   └── src/main/java/com/example/contracts/
│       ├── constants/KafkaTopics.java
│       └── event/                  # OrderCreated, PaymentSucceeded, PaymentRefunded,
│                                   #   InventoryReserved, InventoryFailed
│
├── order-service/                  # Ports 8081 … 8085 (one per service)
├── payment-service/
├── inventory-service/
├── notification-service/
├── analytics-service/
│   ├── pom.xml
│   └── src/main/java/com/example/<svc>/
│       ├── <Svc>Application.java
│       ├── controller/             # HTTP entry points where the service has one
│       ├── consumer/               # Kafka consumers (happy path)
│       ├── producer/  (or kafka/)  # Kafka producers where the service emits events
│       ├── service/ + service/impl # Business logic
│       ├── entity/                 # JPA entities, INCLUDING the service's own tables
│       ├── repository/             # Spring Data repositories
│       ├── enums/  dto/  config/   # Status enums, request/response DTOs, Kafka config
│       └── src/main/resources/
│           ├── application.yaml
│           └── database/<svc>_db.sql
│
├── infra/                          # Day-1 local *dependencies only* (not production infra)
│   ├── docker-compose.infra.yml    # Kafka (+ UI) and PostgreSQL — nothing else
│   └── README.md                   # How to start dependencies; what this is NOT
│
├── scripts/
│   └── local-setup.sh              # Start infra, create 5 databases, apply schema SQL
│
└── docs/
    ├── architecture.md             # Short "what this system is" (factual; no design answers)
    └── SERVICE-MAP.md              # Ports, databases, topics, owners (reference table)
```

> The exact package roots follow the reference (`com.example.orderservice`,
> etc.) so that reference snippets map cleanly to the learner's tree.

---

## 3. What is present on Day 1 (the application)

### 3.1 Java services (all five, runnable)

| Service | Port | Owns (PostgreSQL) | Produces | Consumes |
|---|---|---|---|---|
| order-service | 8081 | `order_db`: `orders`, `outbox_events` | `order-created` | `payment-succeeded`, `payment-refunded`, `inventory-reserved`, `inventory-failed` (status updates) |
| payment-service | 8082 | `payment_db`: `payments` | `payment-succeeded`, `payment-refunded` | `order-created`, `inventory-failed` |
| inventory-service | 8083 | `inventory_db`: `inventory`, `processed_events` | `inventory-reserved`, `inventory-failed` | `payment-succeeded` |
| notification-service | 8084 | (optional read store; may be DB-less at start) | — | `inventory-reserved`, `payment-refunded` |
| analytics-service | 8085 | `analytics_db`: `order_metrics` | — | `order-created`, `inventory-reserved`, `payment-refunded` |

- Spring Boot **3.5.x**, **Java 21**, Maven multi-module (aggregator `pom.xml`).
- Each service is a bootable Spring Boot application with a real, wired
  business flow: place an order → payment → inventory → notification →
  analytics, over Kafka, database-per-service.
- HTTP surface: order-service exposes `POST /api/v1/orders` (plus a simple
  GET for inspection). analytics-service exposes a read/metrics endpoint.

### 3.2 Contracts module

- `KafkaTopics` with the five **core** topics only:
  `order-created`, `payment-succeeded`, `inventory-reserved`,
  `inventory-failed`, `payment-refunded`.
- Five event records (`OrderCreatedEvent`, `PaymentSucceededEvent`,
  `PaymentRefundedEvent`, `InventoryReservedEvent`, `InventoryFailedEvent`).
- **Not** present: retry/DLT topic constants (Day 8), idempotency helpers,
  resilience contracts.

### 3.3 Databases (PostgreSQL)

- Five logical databases (`order_db`, `payment_db`, `inventory_db`,
  `notification_db` if needed, `analytics_db`).
- Schema shipped as per-service `database/<svc>_db.sql`.
- **Day-1 schema contains only the operational business tables:**
  `orders`, `payments`, `inventory`, `order_metrics`, etc.
- `ddl-auto: validate` so the running app requires the schema to exist.
- **Deliberately excluded from the Day-1 schema:**
  - `outbox_events` (Day 8),
  - `processed_events` idempotency table (Day 8),
  - retry/DLT storage, metrics/SLO tables, audit tables.

> Note: the reference already contains `outbox_events` and `processed_events`
> in its schema and producers. In the starter these are **removed/neutralized**
> so the learner implements them in Days 7–8 (see §8 and reference-vs-starter).

### 3.4 Kafka

- Single KRaft broker via Docker Compose (`apache/kafka`), plus Kafka UI.
- The five core topics are created by `scripts/local-setup.sh` (or a one-line
  Kafka UI step documented in the README).
- **Not** present on Day 1: retry topics, dead-letter topics, consumer
  groups beyond a single default per service, or any partition/capacity tuning.

### 3.5 Tests present on Day 1

The reference ships only trivial `contextLoads()` tests. The starter should
ship a **small, honest** green baseline (not a fake test suite):

- One Spring Boot context smoke test per service (`@SpringBootTest` or a
  web-slice test that the harness can run with Testcontainers if available;
  by default these run against no external dependency).
- One **end-to-end happy-path characterization test**, documented and
  optionally runnable: create an order, observe it flow to payment →
  inventory → notification/analytics. This is a characterization/smoke test,
  not a full integration suite (Day 10 builds the real test pyramid).
- A root `README` section listing exactly how to run the tests and what
  "green" looks like.

These establish the Day-10 baseline ("how do I prove a change didn't break
the platform?") and prove the application is real.

### 3.6 Configuration present on Day 1

- Per-service `application.yaml` with server port, datasource, JPA settings,
  and Kafka bootstrap address.
- Secrets/credentials are externalized to environment variables with safe
  local defaults (see §7). The reference's hardcoded
  `password: siraj123` is **not** carried over.

### 3.7 Scripts and documentation

- `scripts/local-setup.sh` — idempotent: start infra compose, wait for
  Postgres + Kafka, create the five databases, apply each `*_db.sql`, create
  core topics, print a "ready" summary and the verification commands.
- `README.md` — a Day-1 quickstart: prerequisites, `./scripts/local-setup.sh`,
  build (`mvn -q -DskipTests package` or run per-service), start services,
  place a sample order, observe the event flow in Kafka UI, and shut down.
- `docs/SERVICE-MAP.md` — ports, databases, topics, and ownership (factual).
- `docs/architecture.md` — what the system does today; **no** up-front
  answers to Day 2/3 design questions.

---

## 4. What the learner can run successfully on Day 1

With Docker, a JDK 21 and Maven available, a learner can:

1. `./scripts/local-setup.sh` → Postgres + Kafka running, five databases and
   schema created, core topics present.
2. `mvn -q package` (or run each service from the IDE / `mvn -pl order-service spring-boot:run`).
3. Start the five services (host process in Day 1; containers in Day 9).
4. `POST /api/v1/orders` with a sample body and get a 2xx response.
5. Open Kafka UI and watch `order-created → payment-succeeded → inventory-reserved`
   flow; see the order/metric rows in the relevant databases.
6. See the order reach a terminal state and a notification/analytics side effect.
7. Run the baseline tests and see green.

This gives a **known-good running baseline** that later missions instrument,
break, observe, harden, scale, and defend.

---

## 5. Local development requirements

- Docker Engine + Docker Compose v2 (for Postgres and Kafka).
- JDK 21 and Maven 3.9+ (Maven wrapper `mvnw` committed per service, as in the reference).
- `curl` / a REST client for the smoke flow; Kafka UI for inspection.
- No cloud account, no Terraform, no CI account needed on Day 1
  (those arrive at Days 13–14).
- Sufficient resources to run Postgres + Kafka + 5 JVMs locally
  (documented minimum; later missions containerize the JVMs).

---

## 6. Environment variables (Day 1)

Each service reads a small, consistent set; local defaults are provided.

| Variable | Default (local) | Used by |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/<svc>_db` | all services |
| `SPRING_DATASOURCE_USERNAME` | `platform` | all services |
| `SPRING_DATASOURCE_PASSWORD` | (local dev password, documented) | all services |
| `SPRING_KAFKA_BOOTSTRAP_SERVERS` | `localhost:29092` | all services |
| `SERVER_PORT` | per-service 8081–8085 | all services |

No cloud, TLS, or secret-manager configuration exists yet (Days 13/19).

---

## 7. What intentionally does NOT exist yet (and when it arrives)

| Capability | State on Day 1 | Introduced |
|---|---|---|
| System/design artifacts, ADRs, trade-off docs | Absent | Day 2–3 |
| Kafka partitions/capacity reasoning, consumer groups beyond default | Minimal (3 partitions default, single group) | Days 5–6, 16 |
| Saga orchestration/compensation code | Absent | Day 7 |
| Transactional outbox table + publisher | Absent | Day 8 |
| Idempotent consumer (`processed_events`) | Absent | Day 8 |
| Retry with backoff + DLT consumers/topics | Absent | Day 8 |
| Service Dockerfiles, multi-stage builds, images | Absent | Day 9 |
| Compose app services, healthchecks, service networking | Only infra (Kafka/Postgres) | Day 9 |
| Real unit/integration/contract tests | Baseline smoke tests only | Day 10 |
| Actuator, Micrometer, structured logs, trace IDs | Absent | Day 11 |
| Prometheus, PromQL, Grafana, SLOs, alerts | Absent | Day 12 |
| Terraform, AWS networking/compute/managed services | Absent | Day 13 |
| GitHub Actions workflows, runners, image build, gates | Absent | Day 14 |
| Multi-environment promotion / release gating | Absent | Day 15 |
| Scaling/load tooling, replicas, LB | Absent | Day 16 |
| Controlled failure injection/experiments | Absent | Day 17 |
| HA/redundancy/AZ topology | Absent | Day 18 |
| Security hardening, TLS, IAM, scanning; backups/DR | Absent | Day 19 |
| Production cloud deployment + runbook | Absent | Day 20 |
| Full incident drill + RCA/defense | Absent | Day 21 |
| Kubernetes / Helm / ArgoCD / GitOps operator | **Never in this flagship** | future courses |

---

## 8. What must NOT be leaked from the reference implementation

The reference repo already implements several **later-mission** patterns.
These must **not** be present in the starter `main`, because they are what
the learner builds:

- **Transactional Outbox**: `order-service`'s `OutboxEvent` entity,
  `outbox_events` table, `OutboxPublisher` scheduler, and outbox-based
  publishing in `OrderServiceImpl` → **remove**; Day 1 order-service publishes
  the event directly in the same business operation (this deliberately leaves
  the dual-write problem for Day 8).
- **Idempotent Consumer**: `inventory-service`'s `ProcessedEvent` entity,
  `processed_events` table, and duplicate-suppression logic → **remove**;
  reintroduced in Day 8.
- **Retry & DLT**: `payment-succeeded-retry`, `payment-succeeded-dlt` topic
  constants; `InventoryDeadLetterConsumer`, `RetryPaymentSucceededConsumer`,
  `PaymentSucceededDltConsumer`, `RetryEventProducer` → **remove**; Day 8.
- **Saga compensation wiring that answers the Day 7 exercise**: the starter
  keeps the *natural* happy-path choreography (order → payment → inventory →
  notification/analytics) and the refund-on-failure event shape, but the
  explicit compensating-action saga is the Day 7 build.

What **is** reused from the reference (application behavior and clean
structure) is enumerated in [reference-vs-starter.md](./reference-vs-starter.md).

Also excluded:
- Hardcoded production-looking credentials; anything implying a real AWS
  account or hosted Postgres; the reference README's "create databases by
  hand" flow (replaced by `local-setup.sh`).

---

## 9. Definition of done for the starter (gating criteria)

The starter `main` is acceptable only when:

- [ ] Five services build and start against the local infra with one setup script.
- [ ] A new order flows order → payment → inventory → notification/analytics and
      the results are visible in Kafka UI and the owning databases.
- [ ] Baseline tests run green.
- [ ] No outbox / idempotency / retry-DLT / saga-compensation code is present.
- [ ] No Dockerfiles, service compose entries, observability, CI/CD, Terraform,
      or cloud configuration are present.
- [ ] No hardcoded secrets; all environment-specific values are env vars with
      documented local defaults.
- [ ] README lets a learner go from clone to a verified running order in
      well under an hour without editing Java.
