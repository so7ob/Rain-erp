import { readFileSync, writeFileSync } from 'node:fs';
import { config, setVersion, validateVersions } from './core.mjs';

const files = Object.fromEntries(config.versionFiles.map(path => [path, readFileSync(path, 'utf8')]));
if (process.argv[2]) {
  for (const path of config.versionFiles) writeFileSync(path, setVersion(path, files[path], process.argv[2]));
}
console.log(validateVersions(Object.fromEntries(config.versionFiles.map(path => [path, readFileSync(path, 'utf8')]))));
