#!/usr/bin/env python3
"""Summarize actual Surefire cases and reject undocumented disabled tests."""
import argparse
import json
import os
from pathlib import Path
import xml.etree.ElementTree as ET

parser = argparse.ArgumentParser()
parser.add_argument('--root', default='.')
parser.add_argument('--allowlist', default=str(Path(__file__).with_name('disabled-tests.json')))
args = parser.parse_args()
allowed = set(json.loads(Path(args.allowlist).read_text()))
seen = set()
counts = dict(tests=0, failures=0, errors=0, skipped=0)
unexpected = []
for path in Path(args.root).glob('**/target/surefire-reports/TEST-*.xml'):
    if '.runtime' in path.parts:
        continue
    suite = ET.parse(path).getroot()
    for case in suite.findall('.//testcase'):
        name = case.attrib['classname'] + '.' + case.attrib['name']
        if name in seen:
            raise SystemExit('Duplicate reported testcase: ' + name)
        seen.add(name)
        counts['tests'] += 1
        for kind, element in [('failures', 'failure'), ('errors', 'error'), ('skipped', 'skipped')]:
            if case.find(element) is not None:
                counts[kind] += 1
                if kind == 'skipped' and name not in allowed:
                    unexpected.append(name)
print(json.dumps(counts))
if os.environ.get('GITHUB_STEP_SUMMARY'):
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
        summary.write('### Maven verification\n\n' + ', '.join(f'{k}: {v}' for k, v in counts.items()) + '\n')
if unexpected:
    raise SystemExit('Undocumented skipped tests: ' + ', '.join(unexpected))
if not counts['tests'] or counts['failures'] or counts['errors']:
    raise SystemExit('Verification must report tests with no failures or errors.')
