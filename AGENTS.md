# Rain-erp development policy

Repository: `so7ob/Rain-erp`. Product: Rain-erp by so7ob-tech (سحب التقنية).

## Required delivery path

1. Verify the checkout, origin, current branch and local changes. Preserve unrelated work.
2. Create or use one GitHub Issue with a goal and acceptance criteria for every code, configuration, test or documentation change.
3. Start from current `origin/develop`, using `<type>/<issue-number>-<description>` (for example `fix/12-login-error`). Use Conventional Commits.
4. Run focused checks while developing, then the complete gate once stable: `node --test tools/workflow/*.test.mjs` and `mvn -B -ntp -pl yudao-server -am verify`. Report genuine failures; do not add skips or disable tests to obtain a green check.
5. Open a PR to `develop`. Its body must contain the fields in the PR template. Review the diff and document the actual review, reviewer, validation and exact `Reviewed-Head`. This is a documented review, not an independent GitHub approval. New commits invalidate the recorded head.
6. Wait for `policy` and `verify` to succeed on the current head, with the branch updated from its base and conversations resolved. Squash merge ordinary work.
7. Verify post-merge `develop` CI. Only then close the Issue and delete the completed work branch. The delivery workflow normally does this; if automation fails, investigate and reconcile using successful branch CI evidence. Never delete `main` or `develop`.

Do not push directly to `main` or `develop`, bypass protection, force-push protected branches, or silently change acceptance criteria. Never record credentials in tracked files or logs. `.runtime/`, local `.env`, databases and build artifacts are local runtime state and must not be committed.

## Release path

The last day of each month at 21:00 Asia/Aden, verified `release:milestone` work, and manual dispatch can **prepare** a release. Preparation does not approve or merge it.

- A release Issue (`kind:release`) owns an automation-managed numbered preparation branch and PR to `develop`. Review it normally. Use the preparation workflow again to refresh generated metadata; do not manually overwrite automation-managed release branches.
- After verified preparation, review a `develop` → `main` promotion PR. Freeze its `Release-Source` and reviewed head. If develop changes, refresh preparation as needed and repeat review and checks.
- Promotion uses a merge commit. Successful CI on the resulting main commit authorizes creation of its immutable tag and GitHub Release. Initial version is `v0.1.0`; all 0.x releases are prereleases. Stable 1.0.0 requires an explicit version request.
- A numbered synchronization branch starts from develop, merges the published main commit, and resumes the next patch `-SNAPSHOT`. Review its PR and merge it with a merge commit. Close the release Issue after verified synchronization.
- Maven root `revision` is authoritative. `node tools/workflow/version.mjs <version>` synchronizes BOM and application metadata; Swagger references the application version. Record changes in `CHANGELOG.md`.
- Before 1.0, features and breaking changes increment MINOR, other changes increment PATCH. From 1.0 onward, breaking changes increment MAJOR.

GitHub Release publication does not authorize application deployment, database changes, Docker publication or enabling optional modules.

## Bootstrap exception

Issue #1 bootstraps this policy from commit `606b3a2a1e49b947e1e12054c7faf3f6232137bc`: numbered work branch → reviewed develop PR → verified develop → reviewed develop-to-main policy promotion → verified main → protection and automation checks. It uses `Workflow: bootstrap` and the `kind:bootstrap` label, with no product tag/release. Corrections within this setup phase also require verified main, ancestry from the original base, and no existing tags/releases. The setup Issue must remain open until correction, synchronization and acceptance checks pass; its closure ends the bootstrap exception.

See `CONTRIBUTING.md`, `docs/development-workflow.md`, and `docs/testing.md` for commands and recovery procedures.

## Owner-authorized repository transfer

Issue #9 authorizes transfer of this same repository (immutable GitHub ID `1438705941`) from `wweziz0001/Rain-erp` to `so7ob/Rain-erp`. Automation resolves the GitHub repository context and verifies this ID before policy checks or privileged delivery. A clone with another repository ID cannot publish or close Issues.

The administrative `Workflow: migration` uses labeled Issue #9, numbered work branches and exact-head review. Its single develop-to-main promotion is restricted to main base `8adf706eaa39992678d67a7eaacdfb0da45005b1`, verified develop, SNAPSHOT metadata and zero product tags/releases. It uses a merge commit and creates no product release. Keep the Issue open through reviewed ancestry synchronization, transfer and successful post-transfer verification. Close it through a final normal development delivery; completed Issues and the pinned main base prevent reuse of this exception. Normal development/release policy otherwise continues.
