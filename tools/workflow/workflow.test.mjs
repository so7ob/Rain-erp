import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { config, fields, issueNumber, parseVersion, nextVersion, nextSnapshot, validateVersions, setVersion,
  validatePR, reviewBody, isMonthEndAden, verifyRun, tagAction, changelogEntry, updateChangelog, releaseNotes, pullRequestNumber } from './core.mjs';
import { GitHub } from './github.mjs';
import { prepare, reconcile } from './automation.mjs';
import { checkPR } from './policy.mjs';

const head = 'a'.repeat(40), base = 'b'.repeat(40), other = 'c'.repeat(40);
const versionFiles = (version = '0.1.0-SNAPSHOT') => ({
  'pom.xml': `<project><properties><revision>${version}</revision></properties></project>`,
  'yudao-dependencies/pom.xml': `<project><properties><revision>${version}</revision></properties></project>`,
  'yudao-server/src/main/resources/application.yaml': `yudao:\n  info:\n    version: ${version}\n  swagger:\n    version: \${yudao.info.version}\n`,
  'CHANGELOG.md': '# Changelog\n\n## [Unreleased]\n\n'
});
const issue = () => ({ number: 12, state: 'open', labels: [], body: 'Goal and acceptance criteria.' });
const body = (extra = {}) => reviewBody({ issue: 12, kind: 'development', head,
  reviewer: 'wweziz0001', review: 'Reviewed behavior, compatibility and resolved findings.',
  validation: 'Maven verify and workflow tests passed.', ...extra });
const pr = (extra = {}) => ({ number: 20, title: 'feat: add sales workflow', body: body(), draft: false,
  head: { sha: head, ref: 'feat/12-sales', repo: { full_name: config.repository } },
  base: { ref: 'develop', sha: base }, merge_commit_sha: other, merged_at: '2026-10-29', html_url: 'https://example.test/pr/20', ...extra });
const commit = (message, parents = 1) => ({ sha: other, commit: { message }, parents: Array.from({length: parents}, () => ({sha: base})) });
const run = (extra = {}) => ({ id: 99, path: config.ciPath, event: 'push', head_branch: 'develop', head_sha: head,
  repository: {full_name: config.repository}, head_repository: {full_name: config.repository},
  status: 'completed', conclusion: 'success', html_url: 'https://example.test/run/99', ...extra });
const jobs = [{ name: 'verify', conclusion: 'success' }];

test('numbered Issue and exact reviewed head permit ordinary delivery', () => {
  assert.equal(validatePR(pr(), issue(), {baseContained: true}).kind, 'development');
  assert.equal(issueNumber(body()), 12);
});
test('missing Issue cannot enter delivery', () => assert.throws(() => issueNumber('Review: something'), /Issue/));
test('a PR cannot masquerade as its Issue', () => assert.throws(() => validatePR(pr(), {...issue(), pull_request: {}}, {baseContained: true}), /Issue/));
test('closed Issue blocks new development', () => assert.throws(() => validatePR(pr(), {...issue(), state:'closed'}, {baseContained:true}), /open/));
test('a push invalidates the previous review', () => assert.throws(() => validatePR(pr({head:{...pr().head,sha:other}}), issue(), {baseContained:true}), /older head/));
test('placeholder review is rejected', () => assert.throws(() => validatePR(pr({body:body({review:'pending — review later'})}), issue(), {baseContained:true}), /Review/));
test('unreviewed draft is rejected', () => assert.throws(() => validatePR(pr({draft:true}), issue(), {baseContained:true}), /ready/));
test('branch number must equal its Issue', () => assert.throws(() => validatePR(pr({head:{...pr().head,ref:'feat/13-sales'}}), issue(), {baseContained:true}), /issue-number/));
test('stale base blocks merging', () => assert.throws(() => validatePR(pr(), issue(), {baseContained:false}), /current develop/));
test('ordinary work cannot target main', () => assert.throws(() => validatePR(pr({base:{ref:'main',sha:base}}), issue(), {baseContained:true}), /Only develop/));
test('foreign repository work is rejected', () => assert.throws(() => validatePR(pr({head:{...pr().head,repo:{full_name:'other/repo'}}}), issue(), {baseContained:true}), /repository/));
test('bootstrap promotion needs its labeled setup Issue and an allowed base', () => {
  const candidate=pr({body:body({issue:1,kind:'bootstrap'}),head:{...pr().head,ref:'develop'},base:{ref:'main',sha:config.bootstrapBase}});
  const setup={...issue(),number:1,labels:['kind:bootstrap']};
  assert.equal(validatePR(candidate,setup,{baseContained:true}).kind,'bootstrap');
  assert.throws(() => validatePR({...candidate,base:{ref:'main',sha:base}},setup,{baseContained:true}),/Bootstrap corrections/);
  assert.throws(() => validatePR(candidate,{...setup,labels:[]},{baseContained:true}));
});
test('promotion freezes source, version, notes and release Issue', () => {
  const tracked={...issue(),labels:['kind:release'],body:'Release-Version: v0.1.0'};
  const candidate=pr({body:body({kind:'promotion',extra:{'Release-Version':'v0.1.0','Release-Source':head}}),head:{...pr().head,ref:'develop'},base:{ref:'main',sha:base}});
  const context={baseContained:true,revision:'0.1.0',expectedVersion:'0.1.0',changelogValid:true};
  assert.equal(validatePR(candidate,tracked,context).kind,'promotion');
  assert.throws(()=>validatePR(candidate,tracked,{...context,expectedVersion:'0.2.0'}),/Refresh/);
  assert.throws(()=>validatePR(candidate,tracked,{...context,changelogValid:false}),/changelog/);
  assert.throws(()=>validatePR({...candidate,body:candidate.body.replace(`Release-Source: ${head}`,`Release-Source: ${other}`)},tracked,context),/candidate moved/);
});
test('synchronization must contain published main and next SNAPSHOT', () => {
  const tracked={...issue(),labels:['kind:release'],body:'Release-Version: v0.1.0'};
  const candidate=pr({body:body({kind:'sync'}),head:{...pr().head,ref:'chore/12-sync-main'}});
  assert.equal(validatePR(candidate,tracked,{baseContained:true,releaseCommitContained:true,revision:'0.1.1-SNAPSHOT'}).kind,'sync');
  assert.throws(()=>validatePR(candidate,tracked,{baseContained:true,releaseCommitContained:false}),/published main/);
});
test('version synchronization preserves dependency and Spring placeholder values', () => {
  const files=versionFiles();
  const changed=Object.fromEntries(config.versionFiles.map(path=>[path,setVersion(path,files[path],'0.2.0')]));
  assert.equal(validateVersions(changed),'0.2.0');
  assert.throws(()=>validateVersions({...changed,'pom.xml':files['pom.xml']}),/must match/);
  assert.equal(nextSnapshot('0.2.0'),'0.2.1-SNAPSHOT');
  for(const bad of ['01.2.3','1.2','v1.2.3','1.2.3-SNAPSHOT','1.2.3;echo unsafe'])assert.throws(()=>parseVersion(bad));
});
test('SemVer distinguishes fixes, features and breaking changes before and after 1.0', () => {
  assert.equal(nextVersion(null,[]),'0.1.0');
  assert.equal(nextVersion('0.1.0',[commit('fix: repair login')]),'0.1.1');
  assert.equal(nextVersion('0.1.0',[commit('feat: add sales')]),'0.2.0');
  assert.equal(nextVersion('0.1.0',[commit('fix!: replace contract')]),'0.2.0');
  assert.equal(nextVersion('1.1.0',[commit('fix: change\n\nBREAKING CHANGE: contract')]),'2.0.0');
  assert.equal(nextVersion('1.1.0',[commit('feat: compatible addition')]),'1.2.0');
  assert.equal(nextVersion('0.9.0',[commit('feat: readiness')],'1.0.0'),'1.0.0');
  assert.throws(()=>nextVersion('0.1.0',[commit('feat: add sales')],'0.1.1'),/SemVer/);
});
test('release bookkeeping and merges do not generate empty releases', () => {
  assert.equal(nextVersion('0.1.0',[commit('chore(sync): resume 0.1.1-SNAPSHOT'),commit('Merge pull request',2)]),null);
  assert.throws(()=>nextVersion('0.1.0',[],'0.1.1'),/No unpublished/);
});
test('Aden month end handles short months, leap years and UTC boundary', () => {
  assert.equal(isMonthEndAden(new Date('2026-02-28T18:00:00Z')),true);
  assert.equal(isMonthEndAden(new Date('2028-02-28T18:00:00Z')),false);
  assert.equal(isMonthEndAden(new Date('2028-02-29T18:00:00Z')),true);
  assert.equal(isMonthEndAden(new Date('2026-10-31T21:01:00Z')),false);
});
test('only exact successful branch verification authorizes side effects', () => {
  verifyRun(run(),jobs,'develop',head);
  for(const broken of [run({conclusion:'failure'}),run({head_sha:other}),run({event:'pull_request'}),run({path:'untrusted.yml'}),run({head_repository:{full_name:'attacker/fork'}})]) {
    assert.throws(()=>verifyRun(broken,jobs,'develop',head));
  }
  assert.throws(()=>verifyRun(run(),[{name:'verify',conclusion:'skipped'}],'develop',head),/verify job/);
});
test('a bot PR dispatch on develop cannot recurse or publish', () => {
  assert.throws(()=>verifyRun(run({event:'workflow_dispatch',display_title:'CI: PR #42'}),jobs,'develop',head),/PR dispatch/);
  verifyRun(run({event:'workflow_dispatch',display_title:'CI: branch develop'}),jobs,'develop',head);
});
test('published tags cannot be moved', () => {
  assert.equal(tagAction(null,head),'create');
  assert.equal(tagAction(head,head),'keep');
  assert.throws(()=>tagAction(other,head),/immutable/);
});
test('changelog rejects missing, empty and duplicate version entries', () => {
  assert.equal(changelogEntry('# Changelog\n\n## [0.1.0]\n\n','0.1.0'),null);
  const log=updateChangelog('# Changelog\n\n## [Unreleased]\n\n','0.1.0','- Fix $& and $1 literal text');
  assert.equal(changelogEntry(log,'0.1.0'),'- Fix $& and $1 literal text');
  assert.equal(changelogEntry(log+'\n## [0.1.0]\n\n- duplicate\n','0.1.0'),null);
});

function preparationAPI({pending=[],latest=null,commits=[commit('feat: add feature')]}={}) {
  return {writes:[],list:async()=>pending,branch:async()=>({commit:{sha:head}}),latestRelease:async()=>latest,
    tagCommit:async tag=>latest?.tag_name===tag?base:null,commits:async()=>commits,files:async()=>versionFiles(),
    write:async function(...args){this.writes.push(args);throw new Error('Unexpected mutation');}};
}
test('release dry-run computes the first release without any write',async()=>{
  const api=preparationAPI();
  assert.equal((await prepare(api,{dryRun:true})).version,'v0.1.0');
  assert.deepEqual(api.writes,[]);
});
test('published release awaiting sync prevents a second active release',async()=>{
  const api=preparationAPI({pending:[{...issue(),body:'Release-Phase: published'}]});
  assert.equal((await prepare(api,{dryRun:true})).action,'waiting-for-synchronization');
  assert.equal(api.writes.length,0);
});
test('multiple active release Issues fail rather than duplicate preparation',async()=>{
  await assert.rejects(()=>prepare(preparationAPI({pending:[issue(),issue()]}),{dryRun:true}),/More than one/);
});
test('no-change release and non-month-end schedule have no writes',async()=>{
  const api=preparationAPI({latest:{tag_name:'v0.1.0'},commits:[commit('chore(sync): next version')]});
  assert.equal((await prepare(api,{dryRun:true})).action,'skip');
  assert.equal((await prepare(api,{scheduled:true,date:new Date('2026-10-29T18:00:00Z')})).action,'skip');
  assert.equal(api.writes.length,0);
});

function deliveryAPI({ci=run(),tip=head,branchHead=head,tracked=issue(),candidate=pr()}={}) {
  const api={writes:[],branch:async()=>({commit:{sha:tip}}),contains:async()=>true,
    list:async path=>path.includes('/jobs')?jobs:[candidate],
    get:async path=>path.startsWith('actions/runs/')?ci:path.startsWith('pulls/')?candidate:path.startsWith('issues/')?tracked:path.startsWith('git/commits/')?{parents:[{sha:base}]}:{object:{sha:branchHead}},
    commentOnce:async function(...args){this.writes.push(['comment',...args]);return true;},
    write:async function(...args){this.writes.push(args);return {};}};
  return api;
}
test('delivery closes only after successful verified develop and deletes only its unchanged work branch',async()=>{
  const api=deliveryAPI();
  await reconcile(api,99);
  assert(api.writes.some(([method,path,body])=>method==='PATCH'&&path==='issues/12'&&body.state==='closed'));
  assert(api.writes.some(([method,path])=>method==='DELETE'&&path==='git/refs/heads/feat/12-sales'));
});
test('failed or stale CI has zero delivery writes',async()=>{
  for(const api of [deliveryAPI({ci:run({conclusion:'failure'})}),deliveryAPI({tip:other})]) {
    await assert.rejects(()=>reconcile(api,99));
    assert.equal(api.writes.length,0);
  }
});
test('dry-run delivery preserves the Issue and branch',async()=>{
  const api=deliveryAPI();
  assert.equal((await reconcile(api,99,{dryRun:true})).results[0].action,'close-development-issue');
  assert.equal(api.writes.length,0);
});
test('unverified delivery ancestry and mismatched Issue cannot close work',async()=>{
  const api=deliveryAPI();api.contains=async()=>false;
  assert.equal((await reconcile(api,99)).results.length,0);
  assert.equal(api.writes.length,0);
  const mismatch=deliveryAPI({candidate:pr({body:body({issue:13})})});
  mismatch.get=async path=>path.startsWith('actions/')?run():path.startsWith('pulls/')?pr({body:body({issue:13})}):{...issue(),number:13};
  await assert.rejects(()=>reconcile(mismatch,99),/numbered work branch/);
  assert.equal(mismatch.writes.length,0);
});
test('a reused branch with newer work is retained',async()=>{
  const api=deliveryAPI({branchHead:other});
  await reconcile(api,99);
  assert(!api.writes.some(([method])=>method==='DELETE'));
});
test('an incorrect development merge method cannot close the Issue',async()=>{
  const api=deliveryAPI();const original=api.get;
  api.get=async path=>path.startsWith('git/commits/')?{parents:[{sha:base},{sha:head}]}:original(path);
  await assert.rejects(()=>reconcile(api,99),/Use squash/);
  assert.equal(api.writes.length,0);
});
test('API dry-run never sends a mutating network request',async()=>{
  const api=new GitHub({dryRun:true,fetcher:async()=>{throw new Error('network write');}});
  await api.write('PATCH','issues/12',{state:'closed'});
  assert.equal(api.operations.length,1);
  await assert.rejects(()=>api.request('POST','/repos/other/repo/issues',{}),/Unexpected/);
});
test('API pagination retains all pages',async()=>{
  const api=new GitHub({token:'fixture',fetcher:async url=>({ok:true,status:200,json:async()=>new URL(url).searchParams.get('page')==='1'?Array(100).fill(1):[2]})});
  assert.equal((await api.list('issues')).length,101);
});
test('ancestry API requires ahead or identical, not behind/diverged',async()=>{
  for(const status of ['ahead','identical','behind','diverged']) {
    const api=new GitHub({token:'fixture',fetcher:async url=>{
      assert(url.endsWith(`compare/${base}...${head}`));
      return {ok:true,status:200,json:async()=>({status})};
    }});
    assert.equal(await api.contains(base,head),['ahead','identical'].includes(status));
  }
});
test('JUnit report fails real failures, additional skips and duplicate reports',()=>{
  const directory=mkdtempSync(join(tmpdir(),'rain-workflow-test-'));
  try {
    const target=join(directory,'module/target/surefire-reports');mkdirSync(target,{recursive:true});
    const allow=join(directory,'allowed.json');writeFileSync(allow,'["Test.allowed"]');
    const check=()=>spawnSync('python3',['tools/workflow/test_report.py','--root',directory,'--allowlist',allow],{encoding:'utf8'});
    const report=xml=>writeFileSync(join(target,'TEST-case.xml'),xml);
    report('<testsuite><testcase classname="Test" name="ok"/></testsuite>');assert.equal(check().status,0);
    report('<testsuite><testcase classname="Test" name="bad"><failure/></testcase></testsuite>');assert.notEqual(check().status,0);
    report('<testsuite><testcase classname="Test" name="allowed"><skipped/></testcase></testsuite>');assert.equal(check().status,0);
    report('<testsuite><testcase classname="Test" name="new"><skipped/></testcase></testsuite>');assert.notEqual(check().status,0);
    report('<testsuite><testcase classname="Test" name="ok"/><testcase classname="Test" name="ok"/></testsuite>');assert.notEqual(check().status,0);
  } finally {rmSync(directory,{recursive:true,force:true});}
});

function publicationAPI({existing=null,tag=null,parents=2,tree='tree',closed=false,pendingReview=false,verified=true,prepared=true,notesMismatch=false}={}) {
  const tracked={...issue(),state:closed?'closed':'open',labels:['kind:release'],body:'Release-Version: v0.1.0\nRelease-Phase: promotion'};
  const candidate=pr({body:body({kind:'promotion',head:pendingReview?'pending':other,
    extra:{'Release-Version':'v0.1.0','Release-Source':other}}),
    head:{...pr().head,sha:other,ref:'develop'},base:{ref:'main',sha:base},merge_commit_sha:head});
  const files=versionFiles('0.1.0');files['CHANGELOG.md']=updateChangelog(files['CHANGELOG.md'],'0.1.0',releaseNotes('0.1.0',[],12));
  if(notesMismatch)files['CHANGELOG.md']=files['CHANGELOG.md'].replace('Initial experimental','Old incomplete');
  const api={writes:[],branch:async()=>({commit:{sha:head}}),contains:async()=>true,
    list:async path=>path.includes('/jobs')?jobs:path.startsWith('actions/workflows/')?(verified?[run({head_sha:other})]:[]):
      path.includes('base=develop')?(prepared?[pr({body:body({kind:'release',extra:{'Release-Version':'v0.1.0'}})})]:[]):[candidate],
    get:async path=>{
      if(path.startsWith('actions/runs/'))return run({head_branch:'main'});
      if(path.startsWith('pulls/'))return candidate;
      if(path.startsWith('issues/'))return tracked;
      if(path===`git/commits/${head}`)return {parents:[{sha:base},{sha:other}].slice(0,parents),tree:{sha:tree}};
      if(path===`git/commits/${other}`)return {tree:{sha:'tree'}};
      if(path.startsWith('releases/tags/'))return existing;
      throw new Error('Unexpected GET '+path);
    },files:async()=>files,latestRelease:async()=>null,commits:async()=>[],tagCommit:async()=>tag,
    write:async function(...args){this.writes.push(args);throw new Error('Unexpected publication in dry-run');}};
  return api;
}
test('publication dry-run validates reviewed source and creates no tag or release',async()=>{
  const api=publicationAPI();
  const result=await reconcile(api,99,{dryRun:true});
  assert.equal(result.results[0].action,'publish-release');
  assert.equal(result.results[0].tagAction,'create');
  assert.equal(api.writes.length,0);
});
test('publication rejects squashed promotion, changed tree and missing review before writing',async()=>{
  for(const api of [publicationAPI({parents:1}),publicationAPI({tree:'changed'}),publicationAPI({pendingReview:true})]) {
    await assert.rejects(()=>reconcile(api,99,{dryRun:true}));
    assert.equal(api.writes.length,0);
  }
});
test('existing tag at another SHA cannot be published or replaced',async()=>{
  const api=publicationAPI({existing:{id:1,draft:false},tag:base});
  await assert.rejects(()=>reconcile(api,99,{dryRun:true}),/immutable/);
  assert.equal(api.writes.length,0);
});
test('rerunning a completed release does not create another synchronization PR',async()=>{
  const api=publicationAPI({existing:{id:1,draft:false},tag:head,closed:true});
  const result=await reconcile(api,99);
  assert.equal(result.results[0].action,'already-published-and-synchronized');
  assert.equal(api.writes.length,0);
});
test('release needs verified develop, merged preparation and current complete notes',async()=>{
  for(const options of [{verified:false},{prepared:false},{notesMismatch:true}]) {
    const api=publicationAPI(options);
    await assert.rejects(()=>reconcile(api,99,{dryRun:true}));
    assert.equal(api.writes.length,0);
  }
});
test('a reserved tag stops preparation before any Issue or branch is created',async()=>{
  const api=preparationAPI();api.tagCommit=async()=>head;
  await assert.rejects(()=>prepare(api,{dryRun:true}),/tag already exists/);
  assert.equal(api.writes.length,0);
});
test('annotated tag lookup resolves its commit rather than the tag object',async()=>{
  const api=new GitHub({token:'fixture',fetcher:async url=>({ok:true,status:200,json:async()=>
    url.includes('/git/ref/tags/')?{object:{type:'tag',sha:base}}:{object:{type:'commit',sha:head}}})});
  assert.equal(await api.tagCommit('v0.1.0'),head);
});
test('local execution reuses gh authentication without extracting credentials',async()=>{
  const api=new GitHub({token:'',runner:(command,args,options)=>{
    assert.equal(command,'gh');assert(args.includes('repos/wweziz0001/Rain-erp/issues/12'));
    assert(!args.some(arg=>arg.includes('Authorization')));
    assert.deepEqual(JSON.parse(options.input),{state:'closed'});
    return {status:0,stdout:'{"number":12}',stderr:''};
  }});
  assert.equal((await api.write('PATCH','issues/12',{state:'closed'})).number,12);
});
test('policy dispatch rejects missing, malformed and unsafe PR numbers at the CLI',()=>{
  assert.equal(pullRequestNumber('12'),12);
  for(const value of ['', 'invalid', '0', '-1', '1.5', '1e2', '9007199254740993']) {
    const result=spawnSync(process.execPath,['tools/workflow/policy.mjs'],{encoding:'utf8',env:{...process.env,PR_NUMBER:value}});
    assert.equal(result.status,1,value);
    assert.match(result.stderr,/PR_NUMBER must be/);
    assert(!result.stdout.includes('Version:'));
  }
});
test('bootstrap correction requires verified main, no releases/tags and an open setup Issue',async()=>{
  const setup={...issue(),number:1,labels:['kind:bootstrap']};
  const candidate=pr({body:body({issue:1,kind:'bootstrap'}),head:{...pr().head,ref:'develop'},base:{ref:'main',sha:other}});
  for(const [tagged,released,mainVerified,open,expected] of [[false,false,true,true,true],[true,false,true,true,false],[false,true,true,true,false],[false,false,false,true,false],[false,false,true,false,false]]) {
    const api={get:async()=>({...setup,state:open?'open':'closed'}),contains:async()=>true,
      list:async path=>path==='tags'?(tagged?[{}]:[]):path==='releases'?(released?[{}]:[]):path.includes('/jobs')?jobs:
        path.includes('branch=main')?(mainVerified?[run({head_branch:'main',head_sha:other})]:[]):[run()]};
    if(expected)assert.equal((await checkPR(api,candidate,versionFiles())).kind,'bootstrap');
    else await assert.rejects(()=>checkPR(api,candidate,versionFiles()));
  }
});
