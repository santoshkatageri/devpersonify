# Reference vs Starter Repository

> **Status:** Planning artifact. No repositories are created in this phase.

There are two repositories with different roles. The learner never clones the
completed reference as their starting state.

| | **REFERENCE** | **STARTER** |
|---|---|---|
| Repository | `event-driven-microservices` | `event-driven-microservices-starter` |
| Role | Complete implementation; architectural + implementation reference | Learner starting point; progressive engineering workspace |
| Contains | The finished application **and** its reliability patterns | A real, runnable application **without** the production-engineering layer |
| Ownership | Course authors | The learner (their engineering history lives here) |
| Used for | Authoring answers, checkpoints, recovery, comparison | Day 1 start state + 21 missions of evolution |
| Mutated by learner? | Never | Yes, on every mission |
| Cloned by learner as start state? | **No** | Yes |

---

## What the reference repository actually is

Inspection of
[github.com/santoshkatageri/event-driven-microservices](https://github.com/santoshkatageri/event-driven-microservices)
(commit `07c2221`) shows a **pattern-demonstration monorepo**, not a
production-operable platform:

**Present (application + distributed patterns):**
- Maven multi-module, Spring Boot 3.5.x, Java 21; modules `contracts`,
  `order-service`, `payment-service`, `inventory-service`,
  `notification-service`, `analytics-service`.
- `contracts`: `KafkaTopics` constants + 5 event records
  (`OrderCreated`, `PaymentSucceeded`, `PaymentRefunded`,
  `InventoryReserved`, `InventoryFailed`).
- Database-per-service PostgreSQL schemas shipped as `database/<svc>_db.sql`
  (`orders`, `payments`, `inventory`, `order_metrics`, plus
  `outbox_events` and `processed_events`).
- Choreography-style saga flow order → payment → inventory → notification →
  analytics over Kafka.
- Transactional Outbox (`OutboxEvent`, `OutboxPublisher` scheduled relay).
- Idempotent consumer (`ProcessedEvent` table + duplicate skip).
- Retry + Dead-Letter Topic (`payment-succeeded-retry`,
  `payment-succeeded-dlt`; retry/DLT consumers and producer).
- Refund-on-failure compensation events.
- Springdoc OpenAPI/Swagger on order-service.
- `docker-compose.yml` with a single KRaft Kafka broker + Kafka UI.

**Absent (the entire production-engineering layer — which is the course):**
- No service Dockerfiles / images; services are not containerized and are not
  in Compose.
- No PostgreSQL in Compose; the README assumes a hand-provisioned local
  Postgres and hardcoded credentials (`password: siraj123`).
- No Spring Boot Actuator / Micrometer / Prometheus / Grafana / traces /
  structured log correlation.
- No real tests beyond trivial `contextLoads()` (3 services).
- No CI/CD, no GitHub Actions, no artifact publishing.
- No Terraform / AWS / cloud / networking / IAM.
- No SLOs, dashboards, alerts, load/scaling, failure tooling, HA, security
  controls, or backup/DR.
- No healthchecks; topics/databases are created manually per README steps.

**Conclusion:** the reference is a good **application behavior and
pattern reference**, and a poor **Day-1 production-operable starting point**.
The missing production-engineering layer is exactly what Missions 9–21 teach.

---

## What SHOULD be reused from the reference

Reuse (it is the genuine, runnable laboratory application):

- The multi-module Maven layout, parent/version, and package roots
  (`com.example.<service>`).
- Spring Boot application classes, controllers (e.g. order `POST /api/v1/orders`),
  service/interfaces, entities, repositories, enums, DTOs, Kafka producer/consumer
  configuration, OpenAPI config.
- The `contracts` module topic constants and event records (the 5 core topics).
- The per-service `*_db.sql` **business** schema (`orders`, `payments`,
  `inventory`, `order_metrics`, …).
- The happy-path choreography and event shapes (including refund/failure event
  shape that Day 7 extends into a full saga).
- The README's positive/negative scenario descriptions as a source for the
  Day-1 smoke flow and later verification procedures.

## What should NOT be copied (deferred — the learner builds it)

| Reference artifact | Status in starter | Arrives |
|---|---|---|
| `outbox_events` schema, `OutboxEvent`, `OutboxPublisher`, outbox publishing | Omitted | Day 8 |
| `processed_events` + idempotent-consumer logic | Omitted | Day 8 |
| `*-retry` / `*-dlt` topics, retry/DLT consumers/producers | Omitted | Day 8 |
| Explicit compensating-saga wiring | Kept minimal (natural flow); saga is the Day 7 exercise | Day 7 |
| Hand-provisioned Postgres + hardcoded credentials | Replaced by `infra/docker-compose.infra.yml` + env vars + setup script | Day 1 |
| README's manual topic/DB creation steps | Replaced by `scripts/local-setup.sh` | Day 1 |

## What must NEVER be copied into either learner surface

- Real credentials or hosted/account-specific configuration.
- Anything that lets the learner skip the journey: a completed Terraform tree,
  pipelines, dashboards-as-answers, or scaling/HA manifests dropped in early.
- Technologies out of scope for this flagship (Kubernetes/Helm/ArgoCD, MLOps,
  Backstage/IDP, multi-cloud, Jenkins, Redis, Ansible/Pulumi).

---

## How the reference is used during the course (without giving answers away)

- **Authoring:** authors derive the Day-1 starter and each mission's
  "expected state" from the reference, then prepare tasks whose *engineering
  outcome* matches — not whose diff matches.
- **Checkpoint reference:** `mission-N` tags in the starter mark one valid
  learner state (see [checkpoint-strategy.md](./checkpoint-strategy.md)). The
  reference is the end-state comparison, not the learner's diff target.
- **Recovery (optional):** a badly stuck learner can inspect how the reference
  *behaves* and what it *verifies* — they are never instructed to cherry-pick
  reference commits into their workspace.
- **Day 21:** the learner defends their architecture against the reference's
  decisions; matching the reference is not required (a checkpoint is *one valid
  state*, not the only solution).

---

## One-line rule

> The **reference** shows a completed system. The **starter** gives the learner
> the same real application on Day 1 — minus the outbox, idempotency, retries,
> containers, observability, delivery, cloud, resilience and security layers —
> so those capabilities are genuinely engineered across the 21 missions.
