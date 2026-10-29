import { config, ensure, compareVersions } from './core.mjs';
import { spawnSync } from 'node:child_process';

export class GitHub {
  constructor({ token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN, fetcher = fetch, runner = spawnSync, dryRun = false } = {}) {
    this.token = token;
    this.fetcher = fetcher;
    this.runner = runner;
    this.dryRun = dryRun;
    this.operations = [];
  }

  async request(method, path, body, { optional = false } = {}) {
    ensure(path.startsWith(`/repos/${config.repository}/`), 'Unexpected repository API path.');
    if (method !== 'GET' && this.dryRun) {
      this.operations.push({ method, path, body });
      return null;
    }
    if (!this.token) {
      const args = ['api', '--method', method, '-H', 'Accept: application/vnd.github+json',
        '-H', 'X-GitHub-Api-Version: 2022-11-28', path.slice(1)];
      if (body !== undefined) args.push('--input', '-');
      const result = this.runner('gh', args, { encoding: 'utf8', input: body === undefined ? undefined : JSON.stringify(body) });
      if (optional && /HTTP 404/.test(result.stderr ?? '')) return null;
      ensure(result.status === 0, `GitHub ${method} ${path} failed: ${result.stderr || result.error?.message || 'gh authentication required'}`);
      return result.stdout.trim() ? JSON.parse(result.stdout) : null;
    }
    const response = await this.fetcher(`https://api.github.com${path}`, {
      method,
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${this.token}`,
        'X-GitHub-Api-Version': '2022-11-28', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (optional && response.status === 404) return null;
    if (response.status === 204) return null;
    const data = await response.json();
    ensure(response.ok, `GitHub ${method} ${path}: ${response.status} ${data.message ?? ''}`);
    return data;
  }

  get(path, options) { return this.request('GET', `/repos/${config.repository}/${path}`, undefined, options); }
  write(method, path, data) { return this.request(method, `/repos/${config.repository}/${path}`, data); }

  async list(path, key) {
    const result = [];
    for (let page = 1; ; page++) {
      const data = await this.get(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
      const values = key ? data[key] : data;
      result.push(...values);
      if (values.length < 100) return result;
    }
  }

  async branch(name) { return this.get(`branches/${encodeURIComponent(name)}`); }
  async contains(ancestor, descendant) {
    if (ancestor === descendant) return true;
    const result = await this.get(`compare/${ancestor}...${descendant}`);
    return ['ahead', 'identical'].includes(result.status);
  }

  async commits(base, head) {
    const values = [];
    for (let page = 1; ; page++) {
      const result = await this.get(`compare/${base}...${head}?per_page=100&page=${page}`);
      ensure(['ahead', 'identical'].includes(result.status), 'Release history must include the previous release.');
      values.push(...result.commits);
      if (values.length >= result.total_commits || result.commits.length < 100) return values;
    }
  }

  async file(path, ref, optional = false) {
    const value = await this.get(`contents/${path}?ref=${encodeURIComponent(ref)}`, { optional });
    return value ? Buffer.from(value.content, 'base64').toString('utf8') : null;
  }

  async files(ref) {
    const values = await Promise.all([...config.versionFiles, 'CHANGELOG.md'].map(async path =>
      [path, await this.file(path, ref, path === 'CHANGELOG.md')]));
    return Object.fromEntries(values);
  }

  async tagCommit(tag) {
    let object = (await this.get(`git/ref/tags/${encodeURIComponent(tag)}`, { optional: true }))?.object;
    for (let i = 0; object?.type === 'tag' && i < 5; i++) object = (await this.get(`git/tags/${object.sha}`)).object;
    ensure(!object || object.type === 'commit', 'Release tag must resolve to a commit.');
    return object?.sha ?? null;
  }

  async latestRelease() {
    const values = (await this.list('releases')).filter(item => !item.draft && /^v(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/.test(item.tag_name));
    return values.sort((a, b) => compareVersions(b.tag_name.slice(1), a.tag_name.slice(1)))[0] ?? null;
  }

  async commentOnce(issue, marker, body) {
    const comments = await this.list(`issues/${issue}/comments`);
    if (!comments.some(comment => comment.body.includes(marker))) {
      await this.write('POST', `issues/${issue}/comments`, { body: `${marker}\n${body}` });
      return true;
    }
    return false;
  }

  async commitFiles(branch, parent, files, message, mergeParent) {
    const base = await this.get(`git/commits/${mergeParent ?? parent}`);
    const tree = await this.write('POST', 'git/trees', { base_tree: base.tree.sha,
      tree: Object.entries(files).map(([path, content]) => ({ path, mode: '100644', type: 'blob', content })) });
    const commit = await this.write('POST', 'git/commits', {
      message, tree: tree.sha, parents: mergeParent ? [parent, mergeParent] : [parent]
    });
    await this.write('PATCH', `git/refs/heads/${branch}`, { sha: commit.sha, force: false });
    return commit.sha;
  }

  async dispatch(pr) {
    const inputs = { pr_number: String(pr.number) };
    for (const workflow of ['ci.yml', 'policy.yml']) {
      await this.write('POST', `actions/workflows/${workflow}/dispatches`, { ref: pr.head.ref, inputs });
    }
  }
}
