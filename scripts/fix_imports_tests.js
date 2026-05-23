const fs = require('fs');
const path = require('path');

const searchDir = dir => {
  let r = [];
  if (!fs.existsSync(dir)) return r;
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      r = r.concat(searchDir(p));
    } else if (p.endsWith('.js')) {
      r.push(p);
    }
  });
  return r;
};

const files = [...searchDir('./tests/suites')];

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let r = false;

  c = c.replace(
    /import\s+([A-Za-z0-9_]+)\s+from\s+['"]@ui\/components\/[A-Za-z0-9_]+['"];/g,
    (match, p1) => {
      r = true;
      return `import { ${p1} } from '@ui/components';`;
    },
  );

  if (r) {
    fs.writeFileSync(f, c);
    console.log(`Fixed imports in ${f}`);
  }
});
