import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { config, ensure, fields, issueNumber, pullRequestNumber, validatePR, validateVersions, changelogEntry, nextVersion, releaseNotes, verifyRun } from './core.mjs';
import { GitHub } from './github.mjs';

export async function releaseContext(api, head, requested) {
  const latest = await api.latestRelease();
  const base = latest ? await api.tagCommit(latest.tag_name) : config.bootstrapBase;
  const commits = await api.commits(base, head);
  return { latest, commits, expectedVersion: nextVersion(latest?.tag_name.slice(1), commits, requested) };
}

async function verifiedBranch(api, branch, sha) {
  const runs = await api.list(`actions/workflows/ci.yml/runs?branch=${branch}&head_sha=${sha}&status=success`, 'workflow_runs');
  for (const run of runs) {
    if (!['push', 'workflow_dispatch'].includes(run.event) || /^CI: PR #/.test(run.display_title ?? '')) continue;
    const jobs = await api.list(`actions/runs/${run.id}/jobs`, 'jobs');
    try { verifyRun(run, jobs, branch, sha); return true; } catch { /* Never substitute PR CI for branch verification. */ }
  }
  return false;
}

export async function checkPR(api, pr, files) {
  const issue = await api.get(`issues/${issueNumber(pr.body)}`);
  const meta = fields(pr.body), issueMeta = fields(issue.body);
  const revision = validateVersions(files);
  const context = { revision, baseContained: await api.contains(pr.base.sha, pr.head.sha) };
  if (pr.base.ref === config.stableBranch) {
    ensure(await verifiedBranch(api, config.integrationBranch, pr.head.sha), 'Successful develop branch verification is required before promotion.');
    if (meta.Workflow === 'bootstrap' && issue.number === config.bootstrapIssue && pr.base.sha !== config.bootstrapBase) {
      const [tags, releases] = await Promise.all([api.list('tags'), api.list('releases')]);
      context.bootstrapCorrection = !tags.length && !releases.length &&
        await api.contains(config.bootstrapBase, pr.base.sha) && await verifiedBranch(api, config.stableBranch, pr.base.sha);
    }
    if (meta.Workflow === 'migration') {
      const [tags, releases] = await Promise.all([api.list('tags'), api.list('releases')]);
      context.migrationAllowed = !tags.length && !releases.length &&
        [config.ownershipMigration.from, config.ownershipMigration.to].includes(config.repository);
    }
  }
  if (['release', 'promotion'].includes(meta.Workflow)) {
    const requested = issueMeta['Release-Requested-Version'];
    Object.assign(context, await releaseContext(api, pr.head.sha, requested === 'auto' ? undefined : requested));
    context.changelogValid = changelogEntry(files['CHANGELOG.md'] ?? '', revision) ===
      releaseNotes(revision, context.commits, issue.number).trim();
    if (meta.Workflow === 'promotion') {
      const preparations = await api.list(`pulls?state=closed&base=${config.integrationBranch}`);
      let prepared = false;
      for (const item of preparations) {
        if (!item.merged_at || fields(item.body).Workflow !== 'release' || fields(item.body).Issue !== `#${issue.number}` ||
            fields(item.body)['Release-Version'] !== `v${revision}`) continue;
        if (await api.contains(item.merge_commit_sha, pr.head.sha)) { prepared = true; break; }
      }
      ensure(prepared, 'A merged release-preparation PR is required before promotion.');
    }
  }
  if (meta.Workflow === 'sync') {
    context.releaseCommitContained = Boolean(issueMeta['Release-Commit']) &&
      await api.contains(issueMeta['Release-Commit'], pr.head.sha);
  }
  return validatePR(pr, issue, context);
}

async function main() {
  const number = pullRequestNumber(process.env.PR_NUMBER);
  const api = new GitHub();
  await api.verifyRepository();
  const files = Object.fromEntries([...config.versionFiles, 'CHANGELOG.md'].map(path => [path, readFileSync(path, 'utf8')]));
  const pr = await api.get(`pulls/${number}`);
  const checkout = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (checkout !== pr.head.sha) throw new Error('The checked-out head differs from the current PR head.');
  console.log(JSON.stringify(await checkPR(api, pr, files)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
