import {execFileSync} from 'node:child_process';
const git = args => execFileSync('git',args,{encoding:'utf8',maxBuffer:20*1024*1024});
const files=git(['diff','--cached','--name-only','--diff-filter=ACMR','-z']).split('\0').filter(Boolean);
if(!files.length)throw Error('No staged files; audit was not performed');
  const allowed = file => /^(public\/(?!site-data\.json$|reference-assets\.json$)|src\/|migrations\/|tests\/|docs\/|scripts\/|\.github\/workflows\/|\.gitignore$|\.gitattributes$|package(?:-lock)?\.json$|wrangler(?:\.generation)?\.jsonc$|site\.config\.json$|AGENTS\.md$|README\.md$|DEPLOYMENT\.md$|SUBMISSION-AUDIT\.md$|研究与验收\.md$)/.test(file);
const forbidden = /(^|\/)(?:reference|\.local|\.wrangler|node_modules|dist)(\/|$)|(^|\/)\.env|(^|\/)\.dev\.vars|\.(?:pem|key|p12|pfx)$/;
const patterns = [
  ['private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['GitHub token',/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,})\b/],
  ['provider secret',/\b(?:sk_live_|sk_test_|sk-proj-)[A-Za-z0-9_-]{16,}/],
  ['AWS access key',/\bAKIA[A-Z0-9]{16}\b/],
  ['JWT',/\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\b/],
  ['literal credential',/(?:api[_-]?key|api[_-]?token|access[_-]?token|client[_-]?secret|password)\s*[:=]\s*["'][A-Za-z0-9_\-./+]{20,}["']/i],
  ['personal Windows path',/[CD]:[\\/](?:Users[\\/]|1副业[\\/])/],
];
let problems=0;
for(const file of files){
  if(!allowed(file)||forbidden.test(file)){console.error(`NOT ALLOWED: ${file}`);problems++;continue;}
  if(/\.(?:mp4|webp|png|jpg|ico|woff2)$/.test(file))continue;
  const content=git(['show',`:${file}`]);
  for(const [name,pattern] of patterns)if(pattern.test(content)){console.error(`REVIEW REQUIRED (${name}): ${file}`);problems++;}
}
if(problems)throw Error(`${problems} staged audit findings; values were not printed`);
console.log(`PASS: ${files.length} staged files match the submission allowlist; no credential patterns or personal paths detected`);
