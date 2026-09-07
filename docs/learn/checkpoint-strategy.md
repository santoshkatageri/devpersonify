# Checkpoint Strategy — Mission Tags, Branches and Recovery

> **Status:** Planning artifact. No tags/branches are created in this phase.

A **checkpoint** captures a known-good *engineering state* of the learner's
repository at the end of a mission. Checkpoints are about the evolving
**engineering system** (design artifacts, configuration, infra, observability,
delivery, resilience), **not** about Java-development milestones.

---

## 1. Recommendation (evaluated, not assumed)

**Recommended model:**

- **`main`** of `event-driven-microservices-starter` = the Day-1 starting
  state (defined in [starter-repository-spec.md](./starter-repository-spec.md)).
- **Immutable annotated tags** `mission-01` … `mission-21` mark the
  author-prepared, known-good state *after* each mission.
- Learners work on their **own clone/branch history**, commit freely, and
  **never** cherry-pick solution commits.
- During **course authoring**, short-lived branches may be used to build up
  each mission state; once validated, the state is tagged and the branch can be
  merged to an author-only integration line. Tags, not branches, are the
  published reference.

### Why tags are the right primitive here

| Option | Verdict | Reasoning |
|---|---|---|
| **Git tags** on `mission-N` states | **Recommended** | Immutable, cheap, named to missions; easy `checkout`/inspect/diff; works offline; clearly "a point in history." |
| Long-lived branches (`mission-04-solution`) | Not as the learner surface | Mutable, invite merges/cherry-picks, clutter the learner's own branch list, and blur "reference" vs "workspace." Fine only during authoring. |
| Plain commits (no tag) | Insufficient | Hard to discover/recall a mission boundary; a learner cannot reliably diff "my Day 7" vs "the reference Day 7." |
| Separate solution repository | Rejected as primary | Doubles maintenance, guarantees drift, and effectively ships the answer in a second clone; the reference repo already serves this role conceptually. |
| The reference repo itself as checkpoint source | Not for learners | It is the **completed** system (see [reference-vs-starter.md](./reference-vs-starter.md)); checking it out reveals later-mission work all at once. |

**Tags win** because they are immutable, mission-aligned, and let a learner
say precisely: "here is my state at the end of Day 8; here is the author's
known-good Day 8; the *behavior and verification* match even if the files
differ."

### Why not a separate solution repository

A separate `…-solution` repo would (a) duplicate the starter and drift from it,
(b) be a strong temptation to copy wholesale, and (c) still need per-mission
states. Tags on the starter give per-mission states with one object graph,
and the existing `event-driven-microservices` repo remains the end-state
*architectural* reference. So: **tags for mission states; reference repo for
the complete-system comparison.**

---

## 2. What a checkpoint represents

A `mission-N` tag is the repository state after mission N's **engineering
capability** has been added. It is:

- One **valid** implementation state — **not the only correct solution**.
- A boundary that lets later missions be meaningful (dependency-ordered;
  see [repository-evolution.md](./repository-evolution.md)).
- A reference for **behavior, operational outcome, verification, and evidence**
  — not a diff the learner must match.

Tags are created in an author-owned canonical clone of the starter (or an
author fork). Learners do **not** need write access; they fetch tags only if
they want to compare or recover.

---

## 3. Tag scheme

| Tag | Meaning |
|---|---|
| `day0` (optional) | Orientation state: evidence log + readiness; no infra changes. |
| `mission-01` | After Day 1: runnable app, verified baseline, repository hygiene. |
| `mission-02` … `mission-21` | After each mission's engineering capability is in place. |

- Use annotated tags: `git tag -a mission-07 -m "Day 7: choreography saga + compensation"`.
- Tags point to the author-prepared evolution line, **not** to `main` after
  Day 1 (main stays the clean start state).
- The tag's tree reflects the repository evolution map for that day
  (design docs, config, compose, tests, observability, CI, Terraform, etc.).

---

## 4. Learner usage model

- The learner clones `event-driven-microservices-starter` at `main` (Day 1).
- They work on their own branch (e.g. `learn/day-04`) or directly on their
  clone's main; commits are their engineering history.
- Normal progression: implement/verify the mission against the mission's
  completion criteria and verification steps.
- Tags are **reference/recovery only**:
  - Inspect: `git show mission-08:<path>` to see how the reference state
    expresses a capability (without copying blindly).
  - Compare: `git diff mission-07 mission-08 -- infra/ docs/adr` to see the
    *shape* of the expected evolution.
- **The learner does not cherry-pick or merge tag commits into their own
  line.** Mission acceptance is based on behavior + reasoning + verification
  + evidence, not on reproducing the tag's diff.

---

## 5. Recovery checkpoints

If a learner irrecoverably breaks their environment:

1. Identify the last mission they completed and verified.
2. They can reset **their own** repo to their own last commit (preferred — keeps
   their history), or, if that is unusable, inspect `mission-N` to understand
   the target state and rebuild forward.
3. Recovery uses the mission **verification criteria** (from the evolution map)
   — "services run, order flows, signals present, checks green" — rather than a
   file-by-file match.
4. Evidence is self-reported and not erased by a repository reset.

A recovery should never require cloning the completed `event-driven-microservices`
reference; that would expose later-mission answers.

---

## 6. Authoring workflow (course team only)

For each mission N (using a throwaway author branch):

1. Start from `mission-(N-1)` state.
2. Make the engineering changes described in the evolution map for Day N.
3. Run that mission's **verification** steps and capture expected signals
   (commands, output excerpts, dashboard/metric evidence) — these feed the
   mission content.
4. Confirm dependency prerequisites exist (the map's "starting state" holds).
5. Commit with a clear mission message; tag `mission-N`; record the expected
   repository state and any ADRs.
6. Do not leak future-mission capabilities into the tag (keep the day's scope).

Tags are validated to (a) start cleanly, (b) pass the mission's verification,
and (c) contain no earlier-tag drift.

---

## 7. Guardrails

- Checkpoints encode **engineering-system evolution**, not "Java feature N done."
- No checkpoint may introduce out-of-scope tech (Kubernetes/Helm/ArgoCD, MLOps,
  Backstage/IDP, multi-cloud, Jenkins, Redis, Ansible/Pulumi).
- No checkpoint may require learners to clone the completed reference repo.
- `main` remains the pristine Day-1 start; published states advance via tags.
- A mismatch between a learner's repo and a tag is **not** failure — only a
  failed behavior/verification/evidence outcome is.
