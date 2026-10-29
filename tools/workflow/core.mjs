import { readFileSync } from 'node:fs';

export function repositoryConfig(settings, env = process.env) {
  const repository = env.GITHUB_REPOSITORY || env.GH_REPO || settings.repository;
  ensure(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository), 'Use an owner/repository context.');
  ensure(Number.isSafeInteger(settings.repositoryId) && settings.repositoryId > 0, 'Pin the immutable repository ID.');
  return { ...settings, canonicalRepository: settings.repository, repository };
}
export const config = repositoryConfig(JSON.parse(readFileSync(new URL('./config.json', import.meta.url))));
const types = '(?:feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)';
export const workBranch = new RegExp(`^${types}/([1-9][0-9]*)-[a-z0-9]+(?:-[a-z0-9]+)*$`);
export const conventional = new RegExp(`^${types}(?:\\([^()\\r\\n]+\\))?!?: .+`);
export const shaPattern = /^[a-f0-9]{40}$/;

export function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

export function fields(body = '') {
  return Object.fromEntries(body.split(/\r?\n/).flatMap(line => {
    const match = /^([A-Za-z][A-Za-z-]+):\s*(.+?)\s*$/.exec(line);
    return match ? [[match[1], match[2]]] : [];
  }));
}

export function issueNumber(body) {
  const match = /^#([1-9][0-9]*)$/.exec(fields(body).Issue ?? '');
  ensure(match, 'PR body must contain Issue: #<number>.');
  return Number(match[1]);
}

export function pullRequestNumber(value) {
  ensure(/^[1-9][0-9]*$/.test(value ?? '') && Number.isSafeInteger(Number(value)),
    'PR_NUMBER must be a positive, safe integer; policy never runs without a PR.');
  return Number(value);
}

export function parseVersion(version) {
  const match = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.exec(version);
  ensure(match, `Invalid release version: ${version}`);
  return match.slice(1).map(Number);
}

export function compareVersions(a, b) {
  const left = parseVersion(a), right = parseVersion(b);
  return left.reduce((result, value, i) => result || Math.sign(value - right[i]), 0);
}

export function nextSnapshot(version) {
  const [major, minor, patch] = parseVersion(version);
  return `${major}.${minor}.${patch + 1}-SNAPSHOT`;
}

export function meaningfulCommits(commits) {
  return commits.filter(item => (item.parents?.length ?? 1) < 2 &&
    !/^chore\((?:release|sync)\):/.test(item.commit.message));
}

export function nextVersion(latest, commits, requested) {
  const changes = meaningfulCommits(commits);
  if (requested) {
    parseVersion(requested);
    const minimum = nextVersion(latest, commits);
    ensure(!latest || compareVersions(requested, latest) > 0, 'Version must increase.');
    ensure(!latest || changes.length > 0, 'No unpublished changes.');
    ensure(minimum && compareVersions(requested, minimum) >= 0, 'Requested version is below the required SemVer increment.');
    return requested;
  }
  if (!latest) return config.initialVersion;
  if (!changes.length) return null;
  let [major, minor, patch] = parseVersion(latest);
  const breaking = changes.some(item => /^\w+(?:\([^)]*\))?!:/.test(item.commit.message) ||
    /(?:^|\n)BREAKING[ -]CHANGE:/.test(item.commit.message));
  const feature = changes.some(item => /^feat(?:\([^)]*\))?!?:/.test(item.commit.message));
  if (breaking && major > 0) { major++; minor = 0; patch = 0; }
  else if (feature || breaking) { minor++; patch = 0; }
  else patch++;
  return `${major}.${minor}.${patch}`;
}

function replaceOnce(text, pattern, replacement) {
  ensure([...text.matchAll(new RegExp(pattern.source, 'g'))].length === 1,
    'Expected exactly one project version field.');
  return text.replace(pattern, replacement);
}

export function versionOf(path, text) {
  const pattern = path.endsWith('pom.xml') ? /<revision>([^<]+)<\/revision>/ : /\n  info:\r?\n    version: ([^\s#]+)/;
  const match = pattern.exec(text);
  ensure(match, `Missing version in ${path}.`);
  return match[1];
}

export function setVersion(path, text, version) {
  parseVersion(version.replace(/-SNAPSHOT$/, ''));
  return path.endsWith('pom.xml')
    ? replaceOnce(text, /(<revision>)[^<]+(<\/revision>)/, `$1${version}$2`)
    : replaceOnce(text, /(\n  info:\r?\n    version: )[^\s#]+/, `$1${version}`);
}

export function validateVersions(files) {
  const versions = config.versionFiles.map(path => versionOf(path, files[path]));
  ensure(versions.every(value => value === versions[0]), 'Maven, BOM and application versions must match.');
  parseVersion(versions[0].replace(/-SNAPSHOT$/, ''));
  ensure(files[config.versionFiles[2]].includes('version: ${yudao.info.version}'),
    'Swagger must use yudao.info.version.');
  return versions[0];
}

export function isMonthEndAden(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Aden', year: 'numeric', month: 'numeric', day: 'numeric'
  }).formatToParts(date).map(item => [item.type, item.value]));
  return Number(parts.day) === new Date(Date.UTC(Number(parts.year), Number(parts.month), 0)).getUTCDate();
}

export function reviewBody({ issue, kind, head = 'pending', review = 'pending', validation = 'pending', reviewer = 'pending', extra = {} }) {
  return Object.entries({ Issue: `#${issue}`, Workflow: kind, 'Reviewed-Head': head,
    'Reviewed-By': reviewer, Review: review, Validation: validation, ...extra })
    .map(([key, value]) => `${key}: ${value}`).join('\n') + '\n';
}

export function validatePR(pr, issue, context = {}) {
  const meta = fields(pr.body);
  const labels = new Set(issue.labels.map(label => typeof label === 'string' ? label : label.name));
  ensure(!pr.draft, 'Mark the PR ready after documenting its review.');
  ensure(conventional.test(pr.title) && pr.title.length <= 72, 'Use a Conventional Commit PR title of at most 72 characters.');
  ensure(issueNumber(pr.body) === issue.number && !issue.pull_request, 'A matching Issue is required.');
  ensure(issue.state === 'open', 'The linked Issue must be open.');
  ensure(pr.head.repo?.full_name === config.repository, 'Use a work branch in this repository.');
  ensure(meta['Reviewed-Head'] === pr.head.sha && shaPattern.test(meta['Reviewed-Head']), 'Review is missing or belongs to an older head.');
  ensure(/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(meta['Reviewed-By'] ?? '') && meta['Reviewed-By'] !== 'pending', 'Document who reviewed the change.');
  for (const [key, minimum] of [['Review', 20], ['Validation', 10]]) {
    ensure((meta[key]?.length ?? 0) >= minimum && !/^(?:pending|todo|\[)/i.test(meta[key]), `Document ${key}.`);
  }
  const kind = meta.Workflow;
  const bootstrap = kind === 'bootstrap' && issue.number === config.bootstrapIssue && labels.has('kind:bootstrap');
  const migration = kind === 'migration' && issue.number === config.ownershipMigration.issue && labels.has('kind:migration');
  if (pr.base.ref === config.stableBranch) {
    ensure(pr.head.ref === config.integrationBranch, 'Only develop may target main.');
    ensure(context.baseContained, 'Synchronize main into develop before promotion.');
    if (bootstrap) ensure(pr.base.sha === config.bootstrapBase || context.bootstrapCorrection,
      'Bootstrap corrections require verified main and an active unreleased setup.');
    else if (migration) ensure(pr.base.sha === config.ownershipMigration.mainBase && context.migrationAllowed &&
      context.revision?.endsWith('-SNAPSHOT'), 'Ownership migration is limited to its verified, unreleased pinned main base.');
    else {
      ensure(kind === 'promotion' && labels.has('kind:release'), 'main requires a release promotion.');
      ensure(meta['Release-Source'] === pr.head.sha, 'The release candidate moved; repeat its review.');
    }
  } else {
    ensure(pr.base.ref === config.integrationBranch, 'Work PRs must target develop.');
    const branch = workBranch.exec(pr.head.ref);
    ensure(branch && Number(branch[1]) === issue.number, 'Use <type>/<issue-number>-<description>.');
    ensure(context.baseContained, 'Update the work branch from current develop.');
    ensure(['development', 'release', 'sync'].includes(kind) || bootstrap || migration, 'Invalid workflow kind.');
    if (kind === 'development') ensure(!labels.has('kind:release'), 'Release Issues use the release workflow.');
    if (kind === 'release') ensure(labels.has('kind:release'), 'Release preparation requires a release Issue.');
    if (kind === 'sync') {
      ensure(labels.has('kind:release') && context.releaseCommitContained, 'Synchronization must contain the published main commit.');
      ensure(context.revision === nextSnapshot(fields(issue.body)['Release-Version']?.replace(/^v/, '')), 'Resume the next SNAPSHOT after synchronization.');
    }
  }
  if (['release', 'promotion'].includes(kind)) {
    const declared = fields(issue.body)['Release-Version'];
    ensure(declared === meta['Release-Version'] && declared === `v${context.revision}`, 'Release version differs from its Issue or source.');
    parseVersion(context.revision);
    ensure(context.expectedVersion === context.revision, 'Refresh release preparation for the current changes.');
    ensure(context.changelogValid, 'Exactly one nonempty changelog entry is required.');
  }
  return { kind, issue: issue.number, meta };
}

export function verifyRun(run, jobs, branch, currentSha) {
  ensure(run.repository.full_name === config.repository && run.head_repository.full_name === config.repository, 'Untrusted workflow repository.');
  ensure(run.path === config.ciPath && ['push', 'workflow_dispatch'].includes(run.event), 'Only branch verification may perform post-merge operations.');
  ensure(!/^CI: PR #/.test(run.display_title ?? '') &&
    (run.event !== 'workflow_dispatch' || run.display_title === `CI: branch ${branch}`),
    'PR dispatches cannot authorize integration or publication.');
  ensure(run.head_branch === branch && run.head_sha === currentSha, 'The verified branch head is stale.');
  ensure(run.status === 'completed' && run.conclusion === 'success', 'Verification did not succeed.');
  ensure(jobs.some(job => job.name === 'verify' && job.conclusion === 'success'), 'The required verify job did not pass.');
}

export function tagAction(existingSha, targetSha) {
  ensure(shaPattern.test(targetSha), 'Invalid target commit.');
  if (!existingSha) return 'create';
  ensure(existingSha === targetSha, 'Published tags are immutable.');
  return 'keep';
}

export function changelogEntry(text, version) {
  const entries = [...text.matchAll(/^## \[([^\]]+)\][^\n]*\n([\s\S]*?)(?=^## \[|$(?![\s\S]))/gm)]
    .filter(match => match[1] === version);
  return entries.length === 1 && entries[0][2].trim().length > 0 ? entries[0][2].trim() : null;
}

export function releaseNotes(version, commits, issue) {
  const changes = meaningfulCommits(commits);
  const lines = changes.map(item => {
    const title = item.commit.message.split('\n')[0];
    return `- ${title} ([${item.sha.slice(0, 7)}](https://github.com/${config.repository}/commit/${item.sha}))`;
  });
  return `Rain-erp v${version}\n\n${lines.length ? lines.join('\n') : '- Initial experimental release of Rain-erp.'}\n\nRelease tracking: https://github.com/${config.repository}/issues/${issue}\n`;
}

export function updateChangelog(text, version, notes) {
  const escaped = version.replaceAll('.', '\\.');
  const section = new RegExp(`^## \\[${escaped}\\][^\\n]*\\n[\\s\\S]*?(?=^## \\[|$(?![\\s\\S]))`, 'gm');
  const entry = `## [${version}]\n\n${notes.trim()}\n\n`;
  if (section.test(text)) return text.replace(section, () => entry);
  return text.replace(/^(# Changelog\s*\n)/, header => `${header}\n${entry}`);
}
