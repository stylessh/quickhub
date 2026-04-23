# RFC: DiffKit Repo Search MVP on Cloudflare + Livegrep

- Status: Draft
- Date: April 23, 2026
- Owner: DiffKit

## 1. Summary

This RFC proposes a smaller and cheaper search architecture for DiffKit:

- Cloudflare as the control plane and API surface.
- Livegrep as the code search engine.
- Limited initial repository scope (not global internet-scale).

The design optimizes for fast delivery, low operational complexity, and a clean upgrade path.

## 2. Goals

- Ship a working multi-repo code search MVP quickly.
- Keep monthly cost predictable and low.
- Integrate cleanly with existing Cloudflare-backed app infra.
- Handle not-yet-indexed repositories gracefully.

## 3. Non-goals (MVP)

- Indexing all public GitHub repositories.
- Building a custom search engine in v1.
- Full diff-aware semantic retrieval in the first iteration.

## 4. Proposed Architecture

## Control plane (Cloudflare)

- Workers: public search API and repo onboarding API.
- D1: metadata state for repositories, jobs, and index status.
- Queues: async job pipeline (`repo_sync`, `index_build`).
- Cron Triggers: periodic sync scheduling.
- R2: store index build manifests, logs, and backups.
- Optional: Cloudflare Access/JWT for internal admin endpoints.

## Data plane (Livegrep)

Livegrep requires persistent CPU and disk-heavy indexing/search. For MVP, run this as a small dedicated service outside Workers runtime:

- 1 index/search node (or 2 for HA later).
- Local SSD for bare clones + active index.
- Internal endpoint consumed by Worker API layer.

Notes:

- Keep Cloudflare as the product-facing layer.
- Keep Livegrep private behind network policy and only callable from Worker/API gateway.

## 5. Repository Scope Strategy

Start small:

- Tier A: DiffKit org repositories.
- Tier B: user-added repositories.
- Tier C: curated public repositories (manual allowlist).

Explicitly do not crawl all GitHub in MVP.

## 6. Indexing Model

- Clone mode: `--mirror` bare repos.
- Branch policy: default branch only.
- Sync cadence:
  - hot repos: every 15 minutes
  - warm repos: every 1-3 hours
  - cold repos: daily
- Index updates:
  - batch rebuild every hour, or
  - event-triggered rebuild after N repo updates
- Publish model: atomic index swap only when build succeeds.

## 7. Query and Status Flow

1. Client calls Worker search endpoint.
2. Worker checks D1 for repo status and routing metadata.
3. Worker queries Livegrep backend.
4. Worker normalizes and returns results + status.

If repo is not indexed:

- Return `NOT_INDEXED` status in response.
- Enqueue high-priority bootstrap job.
- Return optional ETA bucket (`<10m`, `10-30m`, `>30m`).

This avoids empty-result ambiguity and improves UX.

## 8. D1 Schema (MVP)

Recommended tables:

- `search_repo_registry`
  - `id`
  - `provider` (`github`)
  - `owner`
  - `name`
  - `default_branch`
  - `is_enabled`
  - `tier` (`hot|warm|cold`)
  - `last_seen_head_sha`
  - `last_indexed_head_sha`
  - `last_synced_at`
  - `last_indexed_at`
  - `status` (`ready|syncing|indexing|not_indexed|failed`)

- `search_jobs`
  - `id`
  - `repo_id`
  - `job_type` (`sync|index`)
  - `priority` (`interactive|normal|backfill`)
  - `status` (`queued|running|done|failed`)
  - `attempt`
  - `error`
  - `created_at`
  - `updated_at`

- `search_index_builds`
  - `id`
  - `build_version`
  - `repo_count`
  - `started_at`
  - `finished_at`
  - `status`
  - `manifest_r2_key`

## 9. API Contract (MVP)

`GET /api/search?q=&repo=&path=&lang=&page=`

Response:

- `results`
- `repo_status`
- `partial` (boolean)
- `trace_id`

`POST /api/search/repos`

Body:

- `provider`
- `owner`
- `name`

Behavior:

- validates access/policy
- inserts or updates `search_repo_registry`
- enqueues bootstrap sync+index job

`GET /api/search/repos/:id/status`

Response:

- current lifecycle state
- last indexed commit
- staleness seconds
- latest error (if any)

## 10. Operations and Reliability

Minimum SLOs for MVP:

- Search API p95 latency: < 400ms for indexed repos.
- Freshness:
  - hot repos < 30 minutes
  - warm repos < 6 hours
  - cold repos < 24 hours

Must-have alerts:

- queue depth high for > 15m
- indexing failed repeatedly for same repo
- stale hot repos above threshold
- Livegrep node unreachable

Runbooks:

- full reindex
- single-repo reindex
- promote previous known-good index

## 11. Cost Controls

- Strict repo allowlist in MVP.
- Default branch only.
- Exclude binaries and oversized files.
- Per-tenant repo caps.
- Rate-limit expensive regex queries.
- Auto-downgrade inactive repos from hot to warm/cold.

## 12. Security

- Worker enforces authN/authZ before search.
- Private repo access validated at onboarding and query time.
- Livegrep endpoint not exposed publicly.
- Secrets stored in Cloudflare secrets.
- Audit all admin/reindex actions in D1 logs.

## 13. Implementation Plan

Phase 1 (Week 1):

- D1 tables + migrations.
- Worker endpoints for repo onboarding and status.
- Queue producers/consumers skeleton.

Phase 2 (Week 2):

- Livegrep node deployment.
- Mirror sync worker.
- Hourly index build and atomic swap.

Phase 3 (Week 3):

- Result normalization + UI integration.
- Retry/backoff, alerting, and runbooks.
- Cost guardrails and tenant limits.

## 14. Upgrade Path

When limits are reached:

- split indexing and serving nodes
- introduce shard partitioning
- add diff-specific index pipeline
- migrate to Zoekt/hybrid engine if required

The API contract above should remain stable during these upgrades.

## 15. Open Questions

- Should user-added repos be immediate index (`interactive`) by default?
- What max repository size should MVP allow?
- Do we need branch selection in MVP or keep default-branch-only strictly?
- What retention policy should apply to old index manifests in R2?
