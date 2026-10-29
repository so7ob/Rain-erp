import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { config, ensure, fields, issueNumber, validatePR, validateVersions, changelogEntry, nextVersion, releaseNotes, verifyRun } from './core.mjs';
import { GitHub } from './github.mjs';

export async function releaseContext(api, head, requested) {
  const latest = await api.latestRelease();
  const base = latest ? await api.tagCommit(latest.tag_name) : config.bootstrapBase;
  const commits = await api.commits(base, head);
  return { latest, commits, expectedVersion: nextVersion(latest?.tag_name.slice(1), commits, requested) };
}

export async function checkPR(api, pr, files) {
  const issue = await api.get(`issues/${issueNumber(pr.body)}`);
  const meta = fields(pr.body), issueMeta = fields(issue.body);
  const revision = validateVersions(files);
  const context = { revision, baseContained: await api.contains(pr.base.sha, pr.head.sha) };
  if (pr.base.ref === config.stableBranch) {
    const runs = await api.list(`actions/workflows/ci.yml/runs?branch=${config.integrationBranch}&head_sha=${pr.head.sha}&status=success`, 'workflow_runs');
    let verified = false;
    for (const run of runs) {
      if (!['push', 'workflow_dispatch'].includes(run.event) || /^CI: PR #/.test(run.display_title ?? '')) continue;
      const jobs = await api.list(`actions/runs/${run.id}/jobs`, 'jobs');
      try { verifyRun(run, jobs, config.integrationBranch, pr.head.sha); verified = true; break; } catch { /* Try another branch verification, never PR CI. */ }
    }
    ensure(verified, 'Successful develop branch verification is required before promotion.');
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
  const api = new GitHub();
  const number = Number(process.env.PR_NUMBER || '0');
  const files = Object.fromEntries([...config.versionFiles, 'CHANGELOG.md'].map(path => [path, readFileSync(path, 'utf8')]));
  if (!number) {
    console.log(`Version: ${validateVersions(files)}`);
    return;
  }
  const pr = await api.get(`pulls/${number}`);
  const checkout = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (checkout !== pr.head.sha) throw new Error('The checked-out head differs from the current PR head.');
  console.log(JSON.stringify(await checkPR(api, pr, files)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
