# Rain-erp development and release workflow

The repository is `wweziz0001/Rain-erp`; `main` remains its default stable branch. `develop` is the integration branch. The policy is also binding on automated coding agents through `AGENTS.md`.

## Work delivery

Create one Issue with acceptance criteria, update from develop and create `<type>/<issue>-<description>`. Open a PR to develop and use a Conventional Commit title (maximum 72 characters). The PR body requires these plain-text fields:

```text
Issue: #12
Workflow: development
Reviewed-Head: <full current head SHA>
Reviewed-By: <reviewer's GitHub login>
Review: Actual findings, compatibility assessment and resolutions.
Validation: Commands, outcomes and material limitations.
```

The review can be documented by the author/agent using the same GitHub account. This is not represented as an independent approval. Any new commit invalidates the recorded review. `policy` checks metadata, branch ancestry and release constraints. `verify` runs workflow-tool tests and Maven verification with real tests. Branches must include the current base; protected branches require both checks and resolved conversations, including for administrators.

Squash merge normal development. After successful **branch** CI on develop, the trusted integration workflow finds merged PRs contained in that verified commit, comments with the evidence, closes their Issues and deletes matching work branches only if their tips have not changed. Closing keywords are not the delivery mechanism because main remains the default branch.

## Preparing a release

`Prepare release` runs at 18:00 UTC on days 28–31 and verifies that it is the final calendar day in Asia/Aden (21:00 local). GitHub schedules are best-effort. A newly verified `release:milestone` delivery also starts preparation. Manual dispatch supports `dry_run` (default true) and an optional explicit version.

Only one `kind:release` Issue can be active. Initial release is v0.1.0. Later cycles skip changes consisting only of release/synchronization bookkeeping or merge commits. Conventional features and breaking changes increment MINOR before 1.0; fixes and other changes increment PATCH. After 1.0, breaking changes increment MAJOR. Stable 1.0.0 requires an explicit requested version. The generated Issue records source, requested version and phase.

Automation creates `chore/<issue>-prepare-release` from current develop, updates root Maven revision, BOM, application version and changelog, and opens a PR to develop with review fields pending. These branches are generated; refresh them by rerunning preparation. Automation refuses to overwrite unexpected manual commits. Refreshes preserve history with a merge parent when develop advanced. Changing a candidate resets its review. If a write was interrupted, inspect the Issue's `Release-Generated-Head`, remote commit and generated files before reconciling; never force-push over manual work.

After reviewed preparation is merged and develop CI succeeds, a promotion PR is opened from develop to main. Its `Release-Source` and reviewed head must match current develop. Merge with a **merge commit**. If new work changes the version required by SemVer, rerun preparation and review the refreshed candidate before promotion.

## Publication and synchronization

Only a successful CI **branch** run at current main can publish. The automation validates the workflow path, repository, event, verify job, commit, promotion Issue, source tree, merge parents, version and changelog. It creates an annotated immutable tag and GitHub Release; all 0.x releases are marked prerelease. Reruns keep an existing matching release, but reject tags/releases pointing at another commit. Published notes are not overwritten.

Then `chore/<issue>-sync-main` starts from develop, merges the published main commit, and sets the next patch SNAPSHOT in the three version locations. Its PR also requires a documented review. Merge it with a merge commit. The release Issue closes only after successful develop CI proves that the published commit and next SNAPSHOT are present. Application deployment and Docker publication are separate operations.

## Actions trust and recovery

CI and policy jobs have read-only tokens. Write-capable jobs load tools from protected main, consume API metadata as data, and never execute PR artifacts or scripts. They serialize delivery/release operations, and explicitly dispatch CI/policy for bot-created PRs. PR dispatches are identified separately from branch verification, so they cannot authorize Issue closure or publication or recursively trigger integration.

Repository Actions must allow workflow-created PRs; write permissions are granted only to integration/preparation jobs. Protection requires `policy` and `verify`, applies to administrators, and blocks direct pushes, force pushes and deletion. Work merges use squash; promotions and synchronization use merge commits. Tags matching `v*` reject updates/deletion.

If CI fails, fix through a numbered branch and PR. Issues remain open until a successful verified develop state contains their delivery. Rerun failed Actions after investigating; side effects use existing Issues/PRs/tags and delivery markers to prevent duplicates. A conflict during synchronization is resolved in its work branch, followed by a new review. If promotion was incorrectly squashed, publication stops; repair ancestry through reviewed PRs rather than moving a published tag.

Maintainer commands (use an existing `gh` login locally, or GH_TOKEN in Actions; never inline credentials):

```bash
node tools/workflow/automation.mjs prepare --dry-run
node tools/workflow/automation.mjs prepare
node tools/workflow/automation.mjs prepare --version 1.0.0
node tools/workflow/automation.mjs reconcile --run-id <successful-branch-CI-run> --dry-run
```

Issue #1 is the one-time bootstrap: policy PR to develop, verified bootstrap promotion to the original main base, then protection/Actions activation and ancestry synchronization. It publishes no product release. Future promotions use the release workflow.

## Bootstrap verification record — 2026-10-29

- [Policy PR #2](https://github.com/wweziz0001/Rain-erp/pull/2) was squash-merged after successful current-head checks; [develop verification](https://github.com/wweziz0001/Rain-erp/actions/runs/40934610925) passed on `cb1b82b`.
- [Bootstrap promotion #3](https://github.com/wweziz0001/Rain-erp/pull/3) preserved history with a merge commit; [main verification](https://github.com/wweziz0001/Rain-erp/actions/runs/40935848147) passed on `195265c`.
- [Synchronization #4](https://github.com/wweziz0001/Rain-erp/pull/4) restored main ancestry in develop; [post-merge verification](https://github.com/wweziz0001/Rain-erp/actions/runs/40936991959) passed on `21ac96a`.
- GitHub policy rejected a [missing review](https://github.com/wweziz0001/Rain-erp/actions/runs/40933070887) and a [stale reviewed head](https://github.com/wweziz0001/Rain-erp/actions/runs/40934039332), then accepted the updated review.
- [Release preparation dry-run](https://github.com/wweziz0001/Rain-erp/actions/runs/40937005565) computed `v0.1.0` with no new Issue, tag or Release. Both branches require PRs, `policy`, `verify` and resolved conversations, including administrators; release tag updates/deletion are blocked.

The PR delivering this audit uses the normal `development` workflow under active protection. Its post-merge CI and automated delivery comment on [Issue #1](https://github.com/wweziz0001/Rain-erp/issues/1) provide the final live closure/branch-cleanup evidence. Maven verification reports 920 cases (902 executed, 18 documented existing skips); all 44 workflow tests pass.
