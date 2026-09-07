# Repository Evolution Map — 21-Day DevOps Flagship

> **Status:** Planning artifact (source of truth for authoring). No repository,
> tag, or lesson body is created in this phase. This document defines what
> changes in `event-driven-microservices-starter` on each of Days 1–21.
>
> Companion documents:
> - [starter-repository-spec.md](./starter-repository-spec.md) — Day-1 contents.
> - [reference-vs-starter.md](./reference-vs-starter.md) — what is reused from the reference.
> - [checkpoint-strategy.md](./checkpoint-strategy.md) — how mission states are tagged.

---

## How to read this map

Each day lists **26 fields**. "No change" means the repository surface is
genuinely untouched that mission; "N/A" means the category does not apply.
The map is about **engineering-system evolution**, not Java milestones:

- **Architecture/modeling missions (2, 3)** primarily add **design artifacts**
  (`docs/adr/`, diagrams, decisions) — little or no code.
- **Distributed-systems missions (5–8)** primarily add **Kafka configuration
  and reliability wiring** around the existing application.
- **Runtime/operations missions (9–12)** primarily add **container, test and
  observability** surfaces.
- **Cloud/delivery missions (13–15)** primarily add **infrastructure and
  pipelines** outside the application.
- **Scale/failure/resilience/security/production/incident missions (16–21)**
  primarily add **experiments, configuration, evidence and runbooks**.

**Dependency rule applied throughout:** database before persistence; Kafka
before integration; integration before saga; containers before container
operations; observability before diagnosis; infrastructure before cloud
deploy; CI/CD before promotion; scaling + observability before meaningful
failure/HA work.

**Repository layout anchors used below:**

```
event-driven-microservices-starter/
├── contracts/  order-service/  payment-service/  inventory-service/
├── notification-service/  analytics-service/        # the application (Day 1)
├── infra/        # compose stacks (infra → app), introduced progressively
├── scripts/      # setup, verification, experiments, recovery
├── docs/adr/     # architecture decision records (from Day 2)
├── observability/  prometheus/  grafana/             # from Day 11–12
├── terraform/    # from Day 13
├── .github/workflows/   # from Day 14
└── runbooks/     # from Day 17 onward
```

Legend for "Existing application components used": these are the Java
services/contracts the learner operates **around**; the learner does not
rewrite them.

---

# Day 1 — Linux, Networking & Git

1. **Mission:** Establish the engineering workstation; stand up the runnable application baseline; prove reachability; experience and fix a genuine Docker network/DNS failure.
2. **Starting repository state:** Nothing yet, or `main` clone.
3. **Engineering objective:** Reproducible, known-good local baseline; investigate machine/network problems before blaming the application.
4. **Engineering capability introduced:** Environment setup, service reachability, container networking/DNS troubleshooting, Git hygiene.
5. **Concepts introduced:** Linux navigation/permissions/processes/services/logs, IP/ports/DNS/TCP/HTTP, localhost vs container network, Git branches/remotes/history, `curl`/`ss`/`dig`/`ping`/`nc`.
6. **Existing application components used:** All five services + contracts (inspected and run, not modified).
7. **New repository artifacts:** First commit baseline; `README.md` quickstart; `docs/SERVICE-MAP.md`; (provided) `infra/docker-compose.infra.yml`, `scripts/local-setup.sh`.
8. **Code changes:** None to application code.
9. **Configuration changes:** Learner sets env vars/local profile to run services against local infra.
10. **Database changes:** `local-setup.sh` creates five DBs and applies existing `*_db.sql` (business tables only).
11. **Kafka changes:** Create five core topics; default partitions; record baseline group offsets.
12. **Docker/container changes:** Start infra compose (Postgres + Kafka + Kafka UI); services run on host in Day 1.
13. **Observability changes:** N/A (uses logs and CLI).
14. **CI/CD changes:** None (initialize Git; remote/fork only).
15. **Terraform/cloud changes:** None.
16. **Security changes:** Note credentials are local dev defaults; no secrets committed.
17. **Infrastructure changes:** Local dependency stack only.
18. **Learner builds/configures/documents:** Runs setup, builds with Maven, starts services, documents the verified baseline in `README`/evidence log.
19. **Learner must verify:** New order returns 2xx; event flow visible in Kafka UI; rows land in owning DBs; baseline tests green.
20. **Failure/experiment:** Deliberate DNS break — place a client on a Docker network that cannot resolve the service name (or wrong network/port); observe `curl: (6) Could not resolve host`; diagnose; fix by rejoining the correct network (see authored Day 1 lab).
21. **Signals to observe:** Container logs, port listeners (`ss`), DNS resolution (`dig`), HTTP status, Kafka UI message flow.
22. **Diagnosis task:** Root-cause the name-resolution failure vs application bug.
23. **Evidence produced:** Command output of reachability + DNS break/fix; baseline verification log.
24. **Completion criteria:** Baseline order flows end to end; DNS failure reproduced, diagnosed, fixed and captured; environment documented.
25. **Expected repository state after mission:** Pristine `main` app runs locally; first learner commits present; no production-engineering artifacts yet.
26. **Checkpoint identifier:** `mission-01`.

---

# Day 2 — Systems Thinking & Production Architecture

1. **Mission:** Reason from requirements and constraints to architecture and trade-offs for the platform.
2. **Starting repository state:** Day-1 runnable application, no formal design artifacts.
3. **Engineering objective:** Produce/justify the production architecture rather than the current runnable shape; identify failure domains and decisions.
4. **Engineering capability introduced:** Requirements engineering, constraint analysis, architecture decisions, trade-off reasoning.
5. **Concepts introduced:** Functional/non-functional requirements; availability, scalability, latency, throughput, consistency, durability; failure domains; sync vs async; database-per-service; horizontal vs vertical scaling; "Why Kafka / async / DB-per-service / where can it fail".
6. **Existing application components used:** All services as the concrete system being reasoned about.
7. **New repository artifacts:** `docs/adr/0001-architecture-overview.md`; `docs/requirements.md`; `docs/adr/0002-async-communication.md`, `0003-database-per-service.md` (or equivalent ADRs); architecture decision notes.
8. **Code changes:** None (no Build/Break/Fix).
9. **Configuration changes:** None.
10. **Database changes:** Documented ownership decisions only (no schema change).
11. **Kafka changes:** Documented role of the event backbone; partition/ordering questions recorded.
12. **Docker/container changes:** None.
13. **Observability changes:** Record the *need* for SLO/observability as an ADR outcome (no instrumentation).
14. **CI/CD changes:** None.
15. **Terraform/cloud changes:** Record cloud/HA intent as decisions (no Terraform).
16. **Security changes:** Threat/failure-domain notes only.
17. **Infrastructure changes:** Target architecture described; nothing provisioned.
18. **Learner builds/configures/documents:** Requirements doc; constraint analysis; ADRs with trade-offs and failure-domain map.
19. **Learner must verify:** Decisions are traceable to requirements; failure paths (Payment succeeds/Inventory fails; Kafka down; service restart) are reasoned.
20. **Failure/experiment:** Paper walkthrough of failure scenarios (no system break).
21. **Signals to observe:** N/A (design mission).
22. **Diagnosis task:** Identify single points of failure and weakest links in the current shape.
23. **Evidence produced:** Architecture decision records + a written trade-off defense.
24. **Completion criteria:** Complete requirements + ADR set answering the Day-2 questions; architecture review-ready.
25. **Expected repository state after mission:** Application unchanged; `docs/adr/` and requirements/architecture documentation added.
26. **Checkpoint identifier:** `mission-02`.

---

# Day 3 — Domain & Distributed-System Design

1. **Mission:** Model the domain and how the system behaves (event storming) before building distributed behavior.
2. **Starting repository state:** Runnable app + Day-2 architecture ADRs.
3. **Engineering objective:** Capture commands, events, aggregates, bounded contexts, and map them to service/topic boundaries.
4. **Engineering capability introduced:** Domain modeling, event-driven design, bounded-context ownership, read-model reasoning.
5. **Concepts introduced:** Command (intent) vs event (fact); aggregates; actors/policies; bounded contexts; data ownership; read models; happy and failure paths; saga foreshadowing.
6. **Existing application components used:** Existing event records/topics in `contracts` as the realized subset of the model.
7. **New repository artifacts:** `docs/domain/event-storming.md`; `docs/domain/context-map.md`; `docs/adr/0004-event-contracts-and-boundaries.md`; event/command inventory.
8. **Code changes:** None (existing contracts are inspected, not edited).
9. **Configuration changes:** None.
10. **Database changes:** Document ownership/read models (no schema change).
11. **Kafka changes:** Topic/event catalog and naming documented (no new runtime topics).
12. **Docker/container changes:** None.
13. **Observability changes:** None.
14. **CI/CD changes:** None.
15. **Terraform/cloud changes:** None.
16. **Security changes:** None.
17. **Infrastructure changes:** None.
18. **Learner builds/configures/documents:** Event storming artifact, context map, failure-path model, contract mapping.
19. **Learner must verify:** Every command produces/consumes documented events; failure paths are modeled; boundaries map to services.
20. **Failure/experiment:** Model the Payment-succeeds/Inventory-fails path on paper.
21. **Signals to observe:** N/A (modeling mission).
22. **Diagnosis task:** Detect ambiguous ownership / cross-context table access in the model.
23. **Evidence produced:** Event storming + context-map artifact; defense of event-vs-command decision.
24. **Completion criteria:** Complete domain model aligned to service/topic boundaries; engineering defense answered.
25. **Expected repository state after mission:** Application unchanged; `docs/domain/` artifacts added.
26. **Checkpoint identifier:** `mission-03`.

---

# Day 4 — Application Runtime & Service Architecture

1. **Mission:** Understand what a running service *is* so it can be deployed/configured/observed/troubleshot — not written.
2. **Starting repository state:** Runnable app on host; design docs; no runtime/config documentation.
3. **Engineering objective:** Build a precise operator's mental model of each service's runtime behavior and dependencies.
4. **Engineering capability introduced:** Runtime/process understanding, configuration externalization, health/dependency mapping.
5. **Concepts introduced:** Process/runtime, config/env vars, dependencies, ports, health endpoints, startup/shutdown, logging, database/Kafka connection behavior.
6. **Existing application components used:** All five services' `Application`, `config/`, `application.yaml`, datasource/Kafka wiring.
7. **New repository artifacts:** `docs/runtime/service-runtime-map.md`; per-service dependency/port/config matrix; (if not present) minimal health notes.
8. **Code changes:** Ideally none. Optional, minimal, *operator-facing* addition: enable Spring Boot Actuator health endpoint only if the lesson uses it — otherwise defer all Actuator work to Day 11 (recommended: no actuator yet to avoid leapfrogging observability).
9. **Configuration changes:** Rationalize env-var config; document required variables and startup order.
10. **Database changes:** Document connection pools/startup validation; no schema change.
11. **Kafka changes:** Document consumer/group connectivity at startup; no topic change.
12. **Docker/container changes:** None yet (process model documented; containers in Day 9).
13. **Observability changes:** Note current logging only; no instrumentation.
14. **CI/CD changes:** None.
15. **Terraform/cloud changes:** None.
16. **Security changes:** Inventory config surface that will later hold secrets.
17. **Infrastructure changes:** None.
18. **Learner builds/configures/documents:** Service runtime map (process, config, ports, dependencies, health, logs, startup/shutdown).
19. **Learner must verify:** Start services in dependency order; trace config from env → runtime; identify what fails when a dependency is missing.
20. **Failure/experiment:** Stop Kafka/Postgres and observe connection/retry behavior at startup (observe, don't fix deeply).
21. **Signals to observe:** Boot logs, connection errors, port listeners, process exit/restart behavior.
22. **Diagnosis task:** Given a failed boot, attribute cause to config vs dependency vs port conflict.
23. **Evidence produced:** Runtime map + a captured startup/dependency-failure observation.
24. **Completion criteria:** Runtime map accurate and verified against real boot behavior; every service documented.
25. **Expected repository state after mission:** Application code effectively unchanged; `docs/runtime/` documentation added; config externalization documented.
26. **Checkpoint identifier:** `mission-04`.

---

# Day 5 — Kafka Fundamentals

1. **Mission:** Understand distributed messaging on the platform's own backbone.
2. **Starting repository state:** Five core topics; services communicating over Kafka.
3. **Engineering objective:** Reason about topic/partition/consumer-group behavior and delivery semantics using the running system.
4. **Engineering capability introduced:** Kafka operations literacy (topics, partitions, producers, consumers, offsets, groups, ordering).
5. **Concepts introduced:** Topics, partitions, replication, producers, consumers, offsets, consumer groups, rebalancing, ordering guarantees, at-least/at-most-once.
6. **Existing application components used:** `contracts` topics/events; all producers/consumers.
7. **New repository artifacts:** `scripts/kafka-inspect.sh` (or documented commands); `docs/runtime/kafka-topology.md`.
8. **Code changes:** None (configuration may tune partition counts per exercises).
9. **Configuration changes:** Partition count / consumer group settings as controlled experiments; document defaults vs changes.
10. **Database changes:** None.
11. **Kafka changes:** Inspect/experiment with partitions, replication factor (single broker), consumer groups, offsets; deliberately create/scale a group.
12. **Docker/container changes:** None beyond infra already running.
13. **Observability changes:** Use Kafka UI metrics/lag as a precursor (no Prometheus yet).
14. **CI/CD changes:** None.
15. **Terraform/cloud changes:** None.
16. **Security changes:** None.
17. **Infrastructure changes:** None.
18. **Learner builds/configures/documents:** Kafka topology doc; commands to produce/consume/inspect; group/partition observations.
19. **Learner must verify:** Produce/consume a message; observe offset commit and group behavior; show partition ordering.
20. **Failure/experiment:** Add a second consumer instance; observe partition assignment/rebalance.
21. **Signals to observe:** Offsets, lag, group membership, partition assignment, message ordering.
22. **Diagnosis task:** Explain why a message went to a given partition / why ordering held or broke.
23. **Evidence produced:** Captured produce/consume output and consumer-group/partition evidence.
24. **Completion criteria:** Learner can explain and demonstrate partitions, offsets, groups, ordering on the live system.
25. **Expected repository state after mission:** Kafka topology doc + inspection scripts; application code unchanged.
26. **Checkpoint identifier:** `mission-05`.

---

# Day 6 — Event-Driven Integration

1. **Mission:** Connect independent services through events with explicit contracts.
2. **Starting repository state:** Core event flow present; contracts module exists.
3. **Engineering objective:** Harden/verify event-driven integration and contract boundaries; ensure services remain decoupled.
4. **Engineering capability introduced:** Contract definition, producer/consumer integration, schema/version awareness.
5. **Concepts introduced:** Event contracts, coupling via events not code, consumer independence, schema evolution basics, idempotency foreshadow.
6. **Existing application components used:** `contracts` module + producers/consumers across services.
7. **New repository artifacts:** `docs/adr/0005-event-contract-governance.md`; `docs/domain/event-flow.md` (end-to-end trace).
8. **Code changes:** **Minimal/optional** — only if an integration gap must be closed to demonstrate the contract; the reference already implements the flow, so prefer verification/documentation over writing new Java.
9. **Configuration changes:** Confirm producers/consumers reference core topics via contracts.
10. **Database changes:** None.
11. **Kafka changes:** Verify all five core topics and event flows end to end; document producer→topic→consumer mapping.
12. **Docker/container changes:** None.
13. **Observability changes:** Trace flow via logs/UI (distributed tracing comes Day 11).
14. **CI/CD changes:** None.
15. **Terraform/cloud changes:** None.
16. **Security changes:** None.
17. **Infrastructure changes:** None.
18. **Learner builds/configures/documents:** End-to-end event flow trace and contract documentation.
19. **Learner must verify:** Place an order; capture OrderCreated → Payment → Inventory → Notification/Analytics as events with keys/headers.
20. **Failure/experiment:** Publish a malformed/duplicate event and observe current handling (sets up Days 7–8).
21. **Signals to observe:** Event sequence, keys, consumer processing order, downstream effects.
22. **Diagnosis task:** Identify where a dropped/duplicated event causes inconsistency today.
23. **Evidence produced:** End-to-end event capture with console/UI output.
24. **Completion criteria:** Full event integration demonstrated and documented; decoupling/contract boundaries explicit.
25. **Expected repository state after mission:** Integration/contract docs added; app behavior verified; reliability gaps documented for Days 7–8.
26. **Checkpoint identifier:** `mission-06`.

---

# Day 7 — Distributed Transactions & Saga

1. **Mission:** Handle partial success with a saga and explicit compensation.
2. **Starting repository state:** Event integration working; no explicit saga/compensation layer; failure leaves inconsistency.
3. **Engineering objective:** Implement/verify choreography saga with compensating actions (refund/release) for Payment-succeeds/Inventory-fails.
4. **Engineering capability introduced:** Saga pattern, compensation, failure boundaries, eventual consistency across services.
5. **Concepts introduced:** Partial success, compensating transactions, choreography vs orchestration, failure boundaries, consistency vs autonomy.
6. **Existing application components used:** payment/inventory/order/notification services and `payment-refunded` / `inventory-failed` events (already shaped for compensation in reference).
7. **New repository artifacts:** `docs/adr/0006-saga-choreography.md`; saga flow/state diagram; `scripts/experiments/saga-failure.sh`.
8. **Code changes:** **Wiring-level, not new features from scratch:** enable/verify compensation handling so an inventory failure triggers refund and order rollback to a consistent terminal state. (In the starter this compensation path is the Day-7 build; the reference shows one valid implementation.)
9. **Configuration changes:** Ensure failure injection flag/scenario can be triggered (e.g. an out-of-stock or forced failure).
10. **Database changes:** Use existing status columns/state transitions; no new table unless needed to track saga state (prefer event-driven state).
11. **Kafka changes:** Rely on existing failure/refund topics; document saga topic choreography.
12. **Docker/container changes:** None.
13. **Observability changes:** Correlate the saga steps via logs (trace IDs Day 11).
14. **CI/CD changes:** None.
15. **Terraform/cloud changes:** None.
16. **Security changes:** None.
17. **Infrastructure changes:** None.
18. **Learner builds/configures/documents:** Compensation flow; trigger/verify a failing order returns to a consistent state.
19. **Learner must verify:** Payment success + inventory failure → refund emitted, inventory released/un-reserved, order marked failed, notification sent; no stranded money/stock.
20. **Failure/experiment:** Inject inventory failure mid-saga; observe and verify compensation.
21. **Signals to observe:** Event sequence incl. refund/failure topics, status transitions in DBs, notification.
22. **Diagnosis task:** Find where the saga would hang without compensation and why.
23. **Evidence produced:** Compensating-transaction trace (events + DB states) for a failed order.
24. **Completion criteria:** Partial success consistently compensated; behavior + evidence captured; orchestration-vs-choreography trade-off defended.
25. **Expected repository state after mission:** Saga compensation wired/verified; ADR + experiment script; app otherwise stable.
26. **Checkpoint identifier:** `mission-07`.

---

# Day 8 — Reliability Patterns

1. **Mission:** Make the distributed system reliable: transactional outbox, idempotency, bounded retries with backoff, dead-letter topics.
2. **Starting repository state:** Saga works; dual-write risk, duplicate processing risk, and no retry/DLT exist in the starter.
3. **Engineering objective:** Eliminate lost/duplicated events and contain poison messages.
4. **Engineering capability introduced:** Transactional outbox, idempotent consumers, retry/backoff, DLT handling.
5. **Concepts introduced:** Dual-write problem, outbox relay, at-least-once + idempotency, exponential backoff, poison messages, dead-letter topics.
6. **Existing application components used:** order-service (outbox), inventory-service (idempotency + DLT), retry producers/consumers (these are the capabilities learners build; reference shows the target).
7. **New repository artifacts:** `docs/adr/0007-outbox-idempotency-dlt.md`; `scripts/experiments/outbox-crash.sh`, `poison-message.sh`; reliability test notes.
8. **Code changes:** Add/reintroduce **reliability** wiring: outbox table + publisher in order-service; `processed_events` idempotency in consumers; retry topic + DLT routing in inventory. This is the one day with substantial non-Java-feature *plumbing* (it is distributed-systems engineering, taught via the existing app).
9. **Configuration changes:** Kafka producer/consumer retry, backoff, DLT routing; scheduled outbox relay interval.
10. **Database changes:** Add `outbox_events` (order) and `processed_events` (consumers) tables via schema files/migrations.
11. **Kafka changes:** Add `payment-succeeded-retry`, `payment-succeeded-dlt` (and equivalent) topics; configure retry/DLT listeners.
12. **Docker/container changes:** None.
13. **Observability changes:** Log outbox publish/relay and DLT routing (metrics come later).
14. **CI/CD changes:** None.
15. **Terraform/cloud changes:** None.
16. **Security changes:** None.
17. **Infrastructure changes:** None.
18. **Learner builds/configures/documents:** Outbox, idempotency, retry/DLT; document poison-message handling.
19. **Learner must verify:** Crash between DB write and publish → no lost event (outbox); redelivery → no duplicate effect (idempotency); poison message → retried then routed to DLT without blocking the group.
20. **Failure/experiment:** Kill order-service after order commit before Kafka send; send an unprocessable message; verify behavior.
21. **Signals to observe:** Outbox rows published, processed_events entries, retry counts, DLT messages, no duplicates downstream.
22. **Diagnosis task:** Distinguish lost-event vs duplicate-event vs poison-message symptoms.
23. **Evidence produced:** Outbox crash test (zero lost events), idempotency proof, DLT inspection.
24. **Completion criteria:** Zero lost/duplicated events demonstrated; poison messages contained; patterns documented.
25. **Expected repository state after mission:** Reliability patterns present (outbox, idempotency, retry/DLT); schema/topics expanded; ADRs/experiments added.
26. **Checkpoint identifier:** `mission-08`.

---

# Day 9 — Docker & Linux Operations

1. **Mission:** Package and operate the services reliably as containers.
2. **Starting repository state:** App runs on host JVMs; infra runs in Compose; no service images.
3. **Engineering objective:** Build reproducible service images and run the whole platform via Compose with health checks.
4. **Engineering capability introduced:** Containerization, image optimization, Compose orchestration, container runtime debugging.
5. **Concepts introduced:** Image vs container, layers, Dockerfile, multi-stage builds, image size, config/env in containers, volumes, networks, Compose, health checks, logs, lifecycle, tagging, basic image security.
6. **Existing application components used:** All five services (packaged, not rewritten).
7. **New repository artifacts:** Per-service `Dockerfile` (multi-stage); `infra/docker-compose.yml` (full stack: infra + app); `.dockerignore`; `scripts/image-build.sh`; `docs/runbooks/container-basics.md`.
8. **Code changes:** None to business logic.
9. **Configuration changes:** Externalize env via Compose; align service hostnames to the Compose network (`kafka:9092`, postgres service DNS).
10. **Database changes:** No schema change; Postgres runs as a container with a volume.
11. **Kafka changes:** App services join the Compose network and use container listeners; topics persist.
12. **Docker/container changes:** **Primary day:** build images, define services in Compose, healthchecks, depends_on conditions, networks, restart policy, tag images.
13. **Observability changes:** Use `docker logs`/`docker stats`; health check status (Prometheus Day 12).
14. **CI/CD changes:** Images built locally (pipeline build Day 14).
15. **Terraform/cloud changes:** None.
16. **Security changes:** Non-root containers, pinned base images, no secrets baked into images; basic image scan awareness.
17. **Infrastructure changes:** Full local containerized platform.
18. **Learner builds/configures/documents:** Dockerfiles, Compose stack, health checks, image build/run docs.
19. **Learner must verify:** `docker compose up` brings the whole platform healthy; order flows; image size measured; logs accessible.
20. **Failure/experiment:** Misconfigure a health check / network alias; observe unhealthy/not-ready behavior; fix.
21. **Signals to observe:** Container health, restart counts, logs, resource usage, image layer sizes.
22. **Diagnosis task:** Debug a container that starts but is unhealthy/unreachable.
23. **Evidence produced:** Healthy Compose stack status, optimized image sizes, runtime-debug log.
24. **Completion criteria:** Entire platform reproducibly containerized and healthy; operation documented.
25. **Expected repository state after mission:** Dockerfiles + full Compose stack added; app runs in containers; no host-JVM dependency for normal use.
26. **Checkpoint identifier:** `mission-09`.

---

# Day 10 — Testing & Engineering Automation

1. **Mission:** Prove a change didn't break the platform with an automated test pyramid.
2. **Starting repository state:** Baseline smoke tests only; most verification is manual.
3. **Engineering objective:** Establish unit, integration, contract (where useful) and smoke tests that run automatically.
4. **Engineering capability introduced:** Test strategy, automated verification, test execution, artifact readiness.
5. **Concepts introduced:** Unit vs integration vs contract vs smoke tests, Testcontainers, test data, flaky tests, verification gates.
6. **Existing application components used:** All services (tests target real behavior incl. Kafka/DB where valuable).
7. **New repository artifacts:** `src/test` additions per service; `scripts/run-tests.sh`; `docs/testing-strategy.md`; CI-ready test commands.
8. **Code changes:** Add tests (and only minimal production refactors needed for testability) — verification code, not features.
9. **Configuration changes:** Test profiles; Testcontainers config.
10. **Database changes:** Test schemas/ephemeral DBs via containers; no production schema change.
11. **Kafka changes:** Testcontainers Kafka / embedded verification for producer/consumer behavior.
12. **Docker/container changes:** Tests use containers for dependencies.
13. **Observability changes:** None.
14. **CI/CD changes:** Prepare a single local `run-tests` entrypoint (pipeline wired Day 14).
15. **Terraform/cloud changes:** None.
16. **Security changes:** None.
17. **Infrastructure changes:** Test dependency containers.
18. **Learner builds/configures/documents:** Automated tests covering the order flow, saga compensation, outbox/idempotency, and a smoke test.
19. **Learner must verify:** Tests fail when behavior is broken (mutation check) and pass when healthy; one command runs them.
20. **Failure/experiment:** Introduce a deliberate fault; prove tests catch it; revert.
21. **Signals to observe:** Test results, coverage of critical paths, failure output.
22. **Diagnosis task:** Diagnose a failing integration test (env vs behavior).
23. **Evidence produced:** Passing automated suite + a demonstrated "test catches the break" record.
24. **Completion criteria:** Automated suite green and meaningful; critical paths covered; one-command execution.
25. **Expected repository state after mission:** Real test suites added across services; testing docs; no production feature change.
26. **Checkpoint identifier:** `mission-10`.

---

# Day 11 — Observability

1. **Mission:** Make system behavior visible with structured logs, metrics, traces and correlation IDs.
2. **Starting repository state:** Containerized platform; ad-hoc logs only; no actuator/tracing.
3. **Engineering objective:** Instrument services so cross-service behavior can be observed, not guessed.
4. **Engineering capability introduced:** Observability instrumentation (logs/metrics/traces), health/readiness.
5. **Concepts introduced:** Structured logs, Micrometer metrics, distributed tracing, correlation/request IDs, health vs readiness, telemetry.
6. **Existing application components used:** All five services (instrumented).
7. **New repository artifacts:** `observability/` config skeleton; per-service Actuator/Micrometer config; tracing setup; `docs/runbooks/observability.md`.
8. **Code changes:** Add actuator/micrometer dependencies and config; add correlation-ID filter/interceptor; emit key metrics/traces (infrastructure of observability — minimal, standard).
9. **Configuration changes:** Enable actuator endpoints, metrics, tracing exporter; manage via env/config.
10. **Database changes:** None.
11. **Kafka changes:** Trace propagation across Kafka producers/consumers.
12. **Docker/container changes:** Add observability service scaffolding to Compose (metrics endpoint reachable; full Prometheus stack Day 12).
13. **Observability changes:** **Primary day:** structured JSON logs, Micrometer metrics, distributed traces, request IDs, health/readiness.
14. **CI/CD changes:** None.
15. **Terraform/cloud changes:** None.
16. **Security changes:** Secure/limit exposed actuator endpoints; no secrets in logs.
17. **Infrastructure changes:** Local observability endpoints/agents.
18. **Learner builds/configures/documents:** Instrumentation + a cross-service trace demonstration.
19. **Learner must verify:** One order produces a shared correlation ID across logs and traces for all involved services; metrics exposed.
20. **Failure/experiment:** Trigger an error and follow its correlation ID across services.
21. **Signals to observe:** Trace spans, request IDs, metrics endpoint, structured log fields.
22. **Diagnosis task:** Follow one request end to end via correlation ID.
23. **Evidence produced:** A traced cross-service order found by correlation ID.
24. **Completion criteria:** Cross-service behavior observable via logs+metrics+traces; health/readiness exposed.
25. **Expected repository state after mission:** Actuator/Micrometer/tracing present; `observability/` started; app behavior unchanged.
26. **Checkpoint identifier:** `mission-11`.

---

# Day 12 — Monitoring, SLOs & Diagnosis

1. **Mission:** Turn signals into engineering decisions with Prometheus, PromQL, dashboards, SLOs and alerts.
2. **Starting repository state:** Services emit metrics/traces; no collection/alerting.
3. **Engineering objective:** Collect telemetry, define SLOs/error budgets, and practice symptom→signal→diagnosis.
4. **Engineering capability introduced:** Monitoring stack, PromQL, Grafana, alerting, SLI/SLO/error budgets.
5. **Concepts introduced:** Prometheus scrape model, PromQL, Grafana dashboards, alert rules, SLIs, SLOs, error budgets, burn rates.
6. **Existing application components used:** Instrumented services from Day 11.
7. **New repository artifacts:** `observability/prometheus/prometheus.yml` + alert rules; `observability/grafana/` provisioned dashboards/datasources; `docs/runbooks/slo-and-diagnosis.md`.
8. **Code changes:** None beyond (optionally) explicit SLO-named metrics.
9. **Configuration changes:** Scrape configs, recording/alert rules, dashboard definitions.
10. **Database changes:** None.
11. **Kafka changes:** Optionally expose/collect Kafka/consumer-lag metrics.
12. **Docker/container changes:** Add Prometheus (+ Grafana, optionally Alertmanager) to Compose.
13. **Observability changes:** **Primary day:** scrape metrics, dashboards, availability/latency SLO, error budget, alerts.
14. **CI/CD changes:** None.
15. **Terraform/cloud changes:** None (local monitoring only).
16. **Security changes:** Lock down monitoring endpoints/UI access locally.
17. **Infrastructure changes:** Monitoring stack in local Compose.
18. **Learner builds/configures/documents:** Dashboards, SLO definitions, alert rules, a diagnosis runbook.
19. **Learner must verify:** Dashboard shows service SLI; SLO computed; an induced degradation triggers an alert/burn indication.
20. **Failure/experiment:** Induce slowness/errors; walk symptom → signal → root cause using dashboards/PromQL.
21. **Signals to observe:** Error rate, latency percentiles, saturation, SLO burn, alert state.
22. **Diagnosis task:** Diagnose a degraded service from signals, not from reading code.
23. **Evidence produced:** Dashboard/SLO capture + a documented symptom→diagnosis.
24. **Completion criteria:** Monitoring operational; SLOs and alerts working; diagnosis demonstrated.
25. **Expected repository state after mission:** Prometheus/Grafana config + dashboards + SLO/alert definitions added.
26. **Checkpoint identifier:** `mission-12`.

---

# Day 13 — Cloud Architecture & Infrastructure as Code

1. **Mission:** Engineer the cloud foundation and codify it with Terraform.
2. **Starting repository state:** Fully local containerized platform; no cloud.
3. **Engineering objective:** Reason about and reproduce cloud networking/compute/IAM as code instead of click-ops.
4. **Engineering capability introduced:** Cloud networking, IAM, managed services, Terraform workflow (state/plan/apply/modules).
5. **Concepts introduced:** VPC, subnets, route tables, security groups, internet/NAT, IAM/least privilege, compute, managed database/messaging, availability zones; HCL, resources, variables, outputs, state, plan/apply/destroy, modules, reproducibility.
6. **Existing application components used:** None modified; cloud target is the same platform.
7. **New repository artifacts:** `terraform/` (network, compute, managed services, modules, `variables.tf/outputs.tf`, remote-state notes); `docs/adr/0008-cloud-foundation.md`; `scripts/tf-plan-apply.sh` (guarded).
8. **Code changes:** None to application.
9. **Configuration changes:** Cloud config (env, region) via variables; no secrets in code.
10. **Database changes:** Define **managed PostgreSQL** target (same logical DBs; data layer unchanged); no migration tooling beyond provisioning.
11. **Kafka changes:** Define managed Kafka/compatible target (or self-hosted on compute) as a decision; no event change.
12. **Docker/container changes:** Images are what will be deployed to compute (Day 20); ECR-style registry considered.
13. **Observability changes:** Plan cloud observability endpoints (no implementation).
14. **CI/CD changes:** None yet.
15. **Terraform/cloud changes:** **Primary day:** VPC/subnets/route tables/SGs/NAT, IAM roles, compute launch config, managed DB, AZ placement; modularized; plan output captured.
16. **Security changes:** Security groups, IAM least-privilege, secrets in managed store (not state).
17. **Infrastructure changes:** Reproducible cloud foundation defined as code.
18. **Learner builds/configures/documents:** Terraform modules; run plan (apply in a sandbox/account if available); document architecture.
19. **Learner must verify:** `terraform plan` produces the intended network/compute/data topology; state handling understood; destroy works.
20. **Failure/experiment:** Apply→modify→plan to show drift/reproducibility; intentionally over-permissive SG/IAM and tighten.
21. **Signals to observe:** Plan diffs, resource graph, validation outputs.
22. **Diagnosis task:** Diagnose a failed plan/apply (missing IAM / CIDR overlap).
23. **Evidence produced:** Versioned Terraform with plan output and module structure.
24. **Completion criteria:** Cloud foundation reproducible from code; networking/IAM/managed services reasoned; plan reviewed.
25. **Expected repository state after mission:** `terraform/` added; application unchanged; infra now defined for cloud.
26. **Checkpoint identifier:** `mission-13`.

---

# Day 14 — CI/CD & Software Delivery

1. **Mission:** Automate the path to production with GitHub Actions.
2. **Starting repository state:** Local tests/images/cloud-as-code; no pipeline.
3. **Engineering objective:** Build commit → build → test → security checks → artifact/image → deploy workflow; understand deployment strategies.
4. **Engineering capability introduced:** CI/CD pipelines, runners, secrets, artifact/image publishing, automated gates, deploy strategies.
5. **Concepts introduced:** Workflows/jobs/steps, runners, secrets, artifacts, container build/push, automated verification, rolling/blue-green/canary/rollback.
6. **Existing application components used:** All services (built/tested/imaged by the pipeline).
7. **New repository artifacts:** `.github/workflows/ci.yml` (build/test/scan), `release.yml` (image build/push); `docs/delivery/cicd.md`; deployment-strategy notes.
8. **Code changes:** None to business logic; maybe standardize build entrypoints used by CI.
9. **Configuration changes:** CI secrets/variables; build args.
10. **Database changes:** None.
11. **Kafka changes:** None.
12. **Docker/container changes:** Pipeline builds and pushes tagged images; registry integration.
13. **Observability changes:** Publish build/test reports; pipeline status.
14. **CI/CD changes:** **Primary day:** GitHub Actions build+test+security checks+image; deployment-strategy design.
15. **Terraform/cloud changes:** Pipeline references cloud/registry (full deploy Day 20).
16. **Security changes:** Secret management in CI, image/dependency scanning in the pipeline.
17. **Infrastructure changes:** Runner/registry assumptions documented.
18. **Learner builds/configures/documents:** Green pipeline, artifact/image output, rollback plan.
19. **Learner must verify:** Push triggers build/test/scan; image produced; a failed test blocks; rollback path defined.
20. **Failure/experiment:** Push a failing change; show the pipeline blocks; demonstrate a rollback.
21. **Signals to observe:** Pipeline stages, test/scan results, image tags, gate decisions.
22. **Diagnosis task:** Diagnose a flaky/failing pipeline step.
23. **Evidence produced:** Green pipeline run + demonstrated rollback.
24. **Completion criteria:** Automated delivery from commit to image with gates; strategies understood.
25. **Expected repository state after mission:** `.github/workflows/` added; images/automation in place; local app unchanged.
26. **Checkpoint identifier:** `mission-14`.

---

# Day 15 — Deployment Environments & Promotion

1. **Mission:** Promote software safely through Development → Test → Pre-Promotion → Production.
2. **Starting repository state:** Pipeline builds images; single environment.
3. **Engineering objective:** Define environments, promotion gates, smoke tests, approvals, immutable artifacts, and rollback.
4. **Engineering capability introduced:** Environment promotion, release gating, smoke tests, immutable artifacts, GitOps-style desired-state thinking (conceptual).
5. **Concepts introduced:** Environment configuration, promotion gates, smoke tests, release approval, immutable artifacts, rollback, desired-state/reconciliation (no ArgoCD in this flagship).
6. **Existing application components used:** All services (promoted as immutable images).
7. **New repository artifacts:** `infra/environments/{dev,test,preprod,prod}/` config; `docs/delivery/promotion.md`; smoke-test scripts; `scripts/smoke.sh`.
8. **Code changes:** None.
9. **Configuration changes:** Per-environment config (secrets from managed store); same artifact across environments.
10. **Database changes:** Environment-specific DBs; migration/config promotion noted.
11. **Kafka changes:** Per-environment topics/clusters; no cross-env events.
12. **Docker/container changes:** Same immutable image promoted across environments via config/env changes.
13. **Observability changes:** Per-environment dashboards; smoke-test signal.
14. **CI/CD changes:** **Primary day:** environment promotion jobs, manual approval gate, smoke tests, rollback.
15. **Terraform/cloud changes:** Environments provisioned; parameterized per-env.
16. **Security changes:** Approval boundaries; environment-scoped secrets.
17. **Infrastructure changes:** Multiple environments represented in config/IaC.
18. **Learner builds/configures/documents:** Promotion path, gates, smoke tests, rollback runbook.
19. **Learner must verify:** Artifact promotes dev→test→preprod→(gated)prod; smoke test blocks a bad release; rollback works.
20. **Failure/experiment:** Promote a known-bad image; prove the smoke/gate stops it; roll back.
21. **Signals to observe:** Gate status, smoke results, deployed version per environment.
22. **Diagnosis task:** Diagnose an environment-specific failure (config vs code).
23. **Evidence produced:** Documented promotion with gates + a demonstrated rollback.
24. **Completion criteria:** Safe promotion with gates/smoke/approvals; immutable artifact proven.
25. **Expected repository state after mission:** Environment configs + promotion workflow/smoke tests added.
26. **Checkpoint identifier:** `mission-15`.

---

# Day 16 — Scaling & Load Balancing

1. **Mission:** Scale the platform and prove the effect rather than assume it.
2. **Starting repository state:** One replica per service; observability in place.
3. **Engineering objective:** Scale horizontally (services, Kafka partitions, consumers), balance load, and measure throughput/latency.
4. **Engineering capability introduced:** Horizontal scaling, load balancing, capacity reasoning, partition/consumer scaling, bottleneck identification.
5. **Concepts introduced:** Replicas, load balancing, capacity, partition scaling, consumer scaling/rebalancing, bottlenecks, throughput/latency trade-offs.
6. **Existing application components used:** Services (replicated), Kafka (partition/consumer tuning).
7. **New repository artifacts:** `scripts/load/` load generator; `scripts/scale.sh`; `docs/runbooks/scaling.md`; before/after results.
8. **Code changes:** None (statelessness verified/configured; session affinity removed if present).
9. **Configuration changes:** Replica counts, consumer concurrency/partitions, LB config.
10. **Database changes:** Connection pool sizing awareness; no schema change.
11. **Kafka changes:** Increase partitions; scale consumer instances; observe rebalancing.
12. **Docker/container changes:** Scale service replicas in Compose (or cloud) and place a load balancer.
13. **Observability changes:** Use Day-12 dashboards to measure throughput/latency/saturation under load.
14. **CI/CD changes:** None.
15. **Terraform/cloud changes:** Provision LB / scalable compute / managed autoscaling where applicable.
16. **Security changes:** LB security groups/health.
17. **Infrastructure changes:** Load balancer + scaled capacity.
18. **Learner builds/configures/documents:** Scaling procedure + measured before/after results.
19. **Learner must verify:** Load test shows improved throughput / stable latency after scaling; no data corruption; consumers rebalance.
20. **Failure/experiment:** Saturate one service; identify bottleneck; scale the right tier; compare.
21. **Signals to observe:** Throughput, p95/p99 latency, CPU/memory, consumer lag, partition balance.
22. **Diagnosis task:** Identify whether the bottleneck is app, DB, or Kafka.
23. **Evidence produced:** Before/after throughput and latency measurements.
24. **Completion criteria:** Scaling effect measured; bottleneck reasoning correct; capacity documented.
25. **Expected repository state after mission:** Scaling/load scripts + LB/scaled config + results; app logic unchanged.
26. **Checkpoint identifier:** `mission-16`.

---

# Day 17 — Failure Engineering

1. **Mission:** Intentionally break the running system and produce evidence of the full failure cycle.
2. **Starting repository state:** Scaled, observable, reliable platform.
3. **Engineering objective:** Form a hypothesis, inject controlled failure, observe impact, diagnose, mitigate, recover and verify.
4. **Engineering capability introduced:** Controlled failure injection, impact analysis, mitigation, recovery verification.
5. **Concepts introduced:** Failure hypothesis, blast radius, controlled injection, mean time to detect/recover, graceful behavior under failure.
6. **Existing application components used:** Whole platform (services, DB, Kafka, LB).
7. **New repository artifacts:** `scripts/experiments/` failure-injection toolkit; `docs/runbooks/failure-experiments.md`; failure log/timeline template.
8. **Code changes:** None (experiments manipulate runtime/config/containers).
9. **Configuration changes:** Tunable failure triggers (latency, kill, network partition) via scripts/env.
10. **Database changes:** None (may stop/isolate DB as an experiment).
11. **Kafka changes:** Broker/topic/consumer interruption experiments.
12. **Docker/container changes:** Kill/stop containers, network isolation, resource limits.
13. **Observability changes:** Use metrics/traces/alerts to detect and time the failure.
14. **CI/CD changes:** None.
15. **Terraform/cloud changes:** Optionally exercise AZ/instance failures in cloud sandbox.
16. **Security changes:** None (failure testing is authorized/local/sandbox).
17. **Infrastructure changes:** Experiment harness only.
18. **Learner builds/configures/documents:** Failure hypothesis, injection steps, timeline, mitigation, recovery verification.
19. **Learner must verify:** Injected failure is detected via signals; impact bounded; service restored; verification proves recovery.
20. **Failure/experiment:** **Primary day:** e.g. kill a service instance / isolate DB / stop Kafka; observe saga/outbox/retries/DLT keep data consistent.
21. **Signals to observe:** Alerts, error rates, retry/DLT/outbox activity, recovery time, order outcomes.
22. **Diagnosis task:** Root-cause the injected failure from signals and prove recovery.
23. **Evidence produced:** Failure reproduced with hypothesis, timeline, signals, mitigation and recovery.
24. **Completion criteria:** At least one controlled failure cycle completed with evidence and no data corruption.
25. **Expected repository state after mission:** Experiment scripts + runbooks/failure evidence added; app returns to healthy.
26. **Checkpoint identifier:** `mission-17`.

---

# Day 18 — Platform Resilience & High Availability

1. **Mission:** Design for failure and verify redundancy and graceful degradation.
2. **Starting repository state:** Failure experiments run; single points of failure observed.
3. **Engineering objective:** Remove/mitigate SPOFs with redundancy across AZs, health-gated failover, dependency isolation and graceful degradation.
4. **Engineering capability introduced:** HA architecture, redundancy, AZ placement, failover, graceful degradation, SPOF analysis.
5. **Concepts introduced:** Redundancy, replicas, availability zones, health checks/failover, dependency isolation, graceful degradation, SPOFs, availability trade-offs; ties back to Day 2 decisions.
6. **Existing application components used:** Whole platform.
7. **New repository artifacts:** `docs/adr/0009-high-availability.md`; SPOF register; `scripts/experiments/ha-drill.sh`; `docs/runbooks/ha.md`.
8. **Code changes:** None (or minimal timeout/fallback/graceful-degradation config if required).
9. **Configuration changes:** Replica minimums, health-gated routing, timeouts/fallbacks.
10. **Database changes:** HA/backup posture for Postgres documented/configured (managed multi-AZ where used).
11. **Kafka changes:** Replication/failover posture addressed (local single-broker limits noted; cloud multi-AZ).
12. **Docker/container changes:** Multi-replica deployment with health gating.
13. **Observability changes:** HA/availability dashboards; instance-loss alerts.
14. **CI/CD changes:** None.
15. **Terraform/cloud changes:** Multi-AZ compute/LB/DB placement; autoscaling health.
16. **Security changes:** Zonal/network isolation consistent with HA.
17. **Infrastructure changes:** Redundant topology provisioned.
18. **Learner builds/configures/documents:** HA design, SPOF register, instance-loss drill.
19. **Learner must verify:** Remove an instance/AZ; health-gated traffic shifts; **zero failed orders** during the drill; degradation is graceful.
20. **Failure/experiment:** Instance/AZ loss drill under load (builds on Day 17).
21. **Signals to observe:** Request success during failover, failover time, degraded-but-available responses.
22. **Diagnosis task:** Identify remaining SPOFs after redundancy.
23. **Evidence produced:** Instance-loss verification (zero failed orders) + SPOF list.
24. **Completion criteria:** HA design implemented/verified; SPOFs enumerated and mitigated or accepted with trade-offs.
25. **Expected repository state after mission:** HA IaC/config + ADR + drill evidence; resilience connected to Day 2 decisions.
26. **Checkpoint identifier:** `mission-18`.

---

# Day 19 — Security & Disaster Recovery

1. **Mission:** Protect the platform and prove it can be recovered.
2. **Starting repository state:** Production-ish cloud deployment nearing; scattered security basics.
3. **Engineering objective:** Apply security architecture (IAM, secrets, TLS, boundaries, scanning, threat model) and DR (backups, restore, RPO/RTO, validation).
4. **Engineering capability introduced:** Security hardening, threat modeling, dependency/image scanning, secrets/TLS/IAM; backup/restore and recovery validation.
5. **Concepts introduced:** Least privilege, secrets management, TLS, network boundaries, threat modeling, dependency/image scanning; backups, restore, RPO, RTO, recovery validation. Security threads from Day 4 (config/secrets), Day 9 (image security), Day 14 (CI scanning).
6. **Existing application components used:** All services + cloud/IaC/pipeline.
7. **New repository artifacts:** `docs/security/threat-model.md`, `security-checklist.md`; `terraform/` security additions (IAM/SG/secrets/TLS); `docs/runbooks/backup-restore.md`; `scripts/experiments/dr-drill.sh`.
8. **Code changes:** None to business logic; security config/wiring as needed.
9. **Configuration changes:** Secrets from managed store; TLS; least-privilege roles.
10. **Database changes:** Automated backups; documented/scripted restore; RPO/RTO targets.
11. **Kafka changes:** Access control/encryption posture as applicable.
12. **Docker/container changes:** Image scanning enforced; non-root/minimal images verified.
13. **Observability changes:** Security/audit signals; backup/restore monitoring.
14. **CI/CD changes:** Dependency/image scanning gates enforced (from Day 14).
15. **Terraform/cloud changes:** IAM, security groups, KMS/secrets, TLS, backup vaults.
16. **Security changes:** **Primary day (security half):** threat model, IAM least privilege, secrets, TLS, network boundaries, scanning.
17. **Infrastructure changes:** Backup/DR + hardened topology.
18. **Learner builds/configures/documents:** Threat model, hardening checklist, backup policy, restore drill.
19. **Learner must verify:** Scan passes/high findings addressed; a backup restores to a working state; RPO/RTO measured.
20. **Failure/experiment:** Restore drill: lose a volume/DB; restore from backup; validate the platform functions.
21. **Signals to observe:** Scan results, audit logs, backup success, restore verification, RPO/RTO.
22. **Diagnosis task:** Identify the highest-risk threat and confirm its control.
23. **Evidence produced:** Hardening checklist + a validated backup/restore drill with RPO/RTO.
24. **Completion criteria:** Security baseline applied and threat-modeled; DR proven via restore; evidence captured.
25. **Expected repository state after mission:** Security/DR docs, hardened IaC/config, backup/restore runbook and evidence.
26. **Checkpoint identifier:** `mission-19`.

---

# Day 20 — Production Deployment

1. **Mission:** Take the platform from engineered system to production deployment.
2. **Starting repository state:** All prior capabilities exist; environments/scaling/HA/security/delivery in place.
3. **Engineering objective:** Combine design, distributed architecture, runtime, containers, testing, observability, cloud, IaC, CI/CD, environments, scaling, security and resilience into one production deployment with a runbook.
4. **Engineering capability introduced:** End-to-end production release and operational readiness.
5. **Concepts introduced:** Release orchestration, operational readiness, cutover, runbooks, rollback at production scale, ownership.
6. **Existing application components used:** Entire platform deployed to cloud.
7. **New repository artifacts:** `docs/runbooks/production-deployment.md` (runbook), `docs/runbooks/rollback.md`; release checklist; production environment config.
8. **Code changes:** None (integration/config-only).
9. **Configuration changes:** Production config; managed secrets; validated parameters.
10. **Database changes:** Production managed PostgreSQL + migrations/backups confirmed.
11. **Kafka changes:** Production managed/cluster topics and replication.
12. **Docker/container changes:** Immutable images deployed to cloud compute with health gating.
13. **Observability changes:** Production dashboards/SLOs/alerts live.
14. **CI/CD changes:** Promotion to production via the gated pipeline (Days 14–15).
15. **Terraform/cloud changes:** Apply full production stack (network, compute, managed data, LB, HA).
16. **Security changes:** All Day-19 controls enforced in production.
17. **Infrastructure changes:** Full production environment provisioned from code.
18. **Learner builds/configures/documents:** Execute deployment; complete readiness checklist; write the runbook.
19. **Learner must verify:** Public/validated health endpoint; order flows in production; SLOs reporting; rollback ready.
20. **Failure/experiment:** Controlled cutover/rollback rehearsal in production-like conditions.
21. **Signals to observe:** Health, SLOs, traffic, error rates, deployment status.
22. **Diagnosis task:** Triage any deployment issue using runbooks/signals.
23. **Evidence produced:** Production deployment with public health check + runbook.
24. **Completion criteria:** Platform running in production from code, observable, secured, with a validated rollback path.
25. **Expected repository state after mission:** Full production deployment realized; runbooks and release evidence added.
26. **Checkpoint identifier:** `mission-20`.

---

# Day 21 — Incident Response & Engineering Defense

1. **Mission:** Prove you can operate and defend the system: run an incident end to end and defend the architecture.
2. **Starting repository state:** Production platform live with full observability/reliability/security.
3. **Engineering objective:** Receive an incident, establish impact, inspect signals, hypothesize, diagnose, mitigate, verify recovery, write timeline/RCA, and defend architectural decisions/trade-offs.
4. **Engineering capability introduced:** Incident response, RCA, post-incident review, engineering defense.
5. **Concepts introduced:** Incident command, impact assessment, hypothesis-driven diagnosis, mitigation vs fix, verification, blameless timeline/RCA, trade-off defense.
6. **Existing application components used:** Entire platform (the incident requires cross-mission knowledge).
7. **New repository artifacts:** `docs/runbooks/incident-response.md`; `docs/incidents/incident-001/` (timeline, RCA, artifacts); defense notes.
8. **Code changes:** Only the minimal safe fix/mitigation justified by the RCA (and documented).
9. **Configuration changes:** Mitigation actions (rollback, scale, failover, feature toggle) as the incident demands.
10. **Database changes:** Recovery/restore only if needed (per DR runbook).
11. **Kafka changes:** Replay/DLT/offset operations as part of recovery.
12. **Docker/container changes:** Restart/redeploy/failover as mitigation.
13. **Observability changes:** Use all signals; add any missing alert/dashboard revealed by the incident.
14. **CI/CD changes:** Rollback/redeploy via pipeline.
15. **Terraform/cloud changes:** Failover/restore across AZs/regions as required.
16. **Security changes:** Contain if security-related; add preventive control post-RCA.
17. **Infrastructure changes:** Whatever mitigation/recovery requires.
18. **Learner builds/configures/documents:** Incident timeline, RCA, mitigation/verification, decision defense.
19. **Learner must verify:** Service restored and verified; root cause proven; follow-up actions logged; architecture decisions defended.
20. **Failure/experiment:** **Primary day:** a realistic injected production incident that draws on Days 2–20.
21. **Signals to observe:** Full signal stack — metrics, traces, logs, alerts, deployment state, business outcomes.
22. **Diagnosis task:** Diagnose the incident from symptoms and prove the fix (not guess).
23. **Evidence produced:** Post-incident review with timeline, RCA, recovery evidence, and defended trade-offs.
24. **Completion criteria:** Incident resolved and verified; RCA + defense complete; this is the capstone demonstration.
25. **Expected repository state after mission:** Incident artifacts + runbooks + any justified hardening; the learner's repository now contains a complete, operated, defended platform.
26. **Checkpoint identifier:** `mission-21`.

---

## Cross-cutting dependency check (coherence)

- **DB before persistence:** databases provisioned in Day 1 setup; managed Postgres targeted from Day 13. PostgreSQL is the consistent database throughout; **Supabase is not used.**
- **Kafka before integration:** core topics Day 1 → Kafka literacy Day 5 → integration Day 6 → saga Day 7 → reliability Day 8.
- **Containers before container operations:** services containerized Day 9 before any container/ops mission.
- **Observability before diagnosis:** instrumentation Day 11 → monitoring/SLOs Day 12 before failure/HA diagnosis Days 17–18/21.
- **Infrastructure before cloud deploy:** Terraform/cloud foundation Day 13 before CI/CD Day 14, promotion Day 15, production Day 20.
- **CI/CD before promotion:** pipeline Day 14 before environment promotion Day 15.
- **Scaling before HA/failure:** scaling Day 16 before failure engineering Day 17 and HA Day 18 (so redundancy and load behavior are measurable).
- **Application present from Day 1:** the runnable Java/Spring application exists at start; missions engineer *around* it. Java/Spring is never a curriculum pillar.
- **Progressive production infrastructure:** no production-engineering artifact (containers, observability, CI, Terraform, cloud, security) appears before its mission.

## Open Decisions

These are unresolved choices the next phase must settle explicitly; nothing
below should be silently assumed during authoring or starter creation.

1. **Day-1 Postgres provisioning model.** The reference assumes a
   hand-created host Postgres; the starter spec proposes a Dockerized
   Postgres in `infra/docker-compose.infra.yml` (applications still on host
   JVMs until Day 9). Confirm: (a) Day-1 Postgres/Kafka in containers with a
   setup script, vs (b) host Postgres to mirror the reference. Recommendation:
   (a), for reproducibility — but this must not leak Day-9 service images.
2. **Notification-service persistence.** The reference notification service
   is largely fire-and-forget. Decide whether the Day-1 starter gives it a
   small read/outbox-free DB or leaves it DB-less (leaning DB-less until a
   mission needs it). No day should depend on an unresolved choice here.
3. **Day 4 Actuator.** The runtime-understanding mission does not *require*
   Spring Boot Actuator; full metrics/traces arrive Day 11. Decide whether
   Day 4 enables only the `health` endpoint or stays entirely at the
   process/log level (recommendation: do not enable actuator before Day 11 to
   avoid leapfrogging observability).
4. **Day 8 code provenance.** Outbox/idempotency/retry-DLT exist in the
   reference but are removed from the starter. Decide how much Day 8 learners
   author from scratch vs assemble from guided partial code — this determines
   how much reference Java is surfaced as *guidance* (never as a cherry-pick).
5. **Managed Kafka on cloud (Day 13/20).** Choose whether production uses
   Amazon MSK (managed Kafka), Kafka on EC2/ECS, or an in-cluster broker. This
   affects Terraform modules and cost; it does not affect Day 5–8 learning.
6. **Application packaging day.** Services run on host JVMs through Day 8 and
   are containerized Day 9; confirm no earlier mission silently depends on a
   service image (CI in Day 14 builds the Day-9 images).
7. **Schema evolution tooling.** Day 1/13 use hand-managed `*_db.sql`.
   Decide whether/when to introduce Flyway/Liquibase (not present in the
   reference; defer unless a mission genuinely needs migration automation).
8. **Learner repository hosting.** Confirm the learner clones
   `event-driven-microservices-starter` and pushes to their own fork/private
   repo for the Career Evidence bridge; tags `mission-*` live in an
   author-owned canonical repo (checkpoint strategy).

## Risks / concerns

- **The reference is a patterns demo, not an operable platform** (no
  containers for services, no actuator, no CI, no IaC, trivial tests, manual
  DB/topic setup). This is the intended teaching gap for Days 9–21, but it
  means the starter authoring must *remove* the reference's later-mission
  patterns (outbox/idempotency/retry-DLT) so Days 7–8 are not pre-solved.
- **Hardcoded credential in reference** (`siraj123`) must not reach the
  starter; externalize configuration on Day 1.
- **Scope discipline:** the map deliberately introduces no
  Kubernetes/Helm/ArgoCD/MLOps/IDP/multi-cloud; pressure to "use cloud-native"
  tools should be resisted for this flagship (they belong to future courses).
- **Evening out "Java-free" missions:** missions 7–8 include real reliability
  plumbing around the existing app; guard against them drifting into
  "write a feature in Spring" — acceptance stays on behavior/verification.
- **Dependency ordering is real but not strictly linear:** observability (11–12)
  precedes failure/HA (17–18) and scaling (16) precedes HA; reordering would
  break "diagnose from signals" and "prove scaling effect."
