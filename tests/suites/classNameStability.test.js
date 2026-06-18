const fs = require('fs');
const path = require('path');

/**
 * 🛡️ Architecture test: className shape stability (NativeWind upgrade guard).
 *
 * In NativeWind v4 / react-native-css-interop, some Tailwind utilities compile
 * to ruleSets flagged with `variables` or `animation` (verified empirically
 * against this project's config on 2026-06-12: shadow sets --tw-shadow-color;
 * ring, translate/rotate/scale/skew, gradient stops from-/via-/to-, and the
 * transition/animate utilities set vars or the animation flag).
 *
 * If a component GAINS such a class for the first time on a render AFTER its
 * initial mount (e.g. an "active tab" conditional), css-interop marks it
 * SHOULD_UPGRADE and, in dev, prints an upgrade warning that JSON.stringifies
 * the component's props with an unguarded recursive walker. That walk hits
 * react-navigation's NavigationStateContext default value (whose getters
 * throw), crashing the render tree with:
 *   "Couldn't find a navigation context. Have you wrapped your app with
 *    'NavigationContainer'?"
 * In production the warning is skipped but the component still force-remounts.
 *
 * Rule enforced here: upgrade-triggering utilities must NOT appear inside a
 * conditional branch of a className (ternary or &&). Put them in the static
 * part of the template (both branches), or use the style prop instead.
 */

const UI_ROOT = path.resolve(__dirname, '..', '..', 'src', 'ui');

// Base-class prefixes that trigger css-interop upgrades (variant prefixes like
// "dark:" / "active:" are stripped before matching). drop-shadow-*, blur-* and
// plain bg-gradient-to-* were verified as safe and are intentionally excluded.
const TRIGGER_PATTERN =
  /^(shadow($|-)|ring($|-)|transition($|-)|animate-|translate-|rotate-|scale-|skew-|from-|via-|to-|duration-|delay-|ease-)/;

const isTriggerClass = cls => TRIGGER_PATTERN.test(cls.split(':').pop());

const triggerClassesIn = str =>
  str.split(/\s+/).filter(Boolean).filter(isTriggerClass);

const collectJsFiles = dir =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectJsFiles(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });

const findViolations = source => {
  const violations = [];

  // Ternary branches: cond ? 'a b c' : 'd e f' (quotes never span lines, but
  // the ?/: operators may — \s covers newlines).
  const ternary = /\?\s*(['"`])([^'"`]*)\1\s*:\s*(['"`])([^'"`]*)\3/g;
  let match;
  while ((match = ternary.exec(source)) !== null) {
    const inTrue = triggerClassesIn(match[2]);
    const inFalse = triggerClassesIn(match[4]);
    // A trigger class present in BOTH branches keeps the shape stable; only
    // one-branch occurrences are dangerous.
    const oneBranch = [
      ...inTrue.filter(c => !inFalse.includes(c)),
      ...inFalse.filter(c => !inTrue.includes(c)),
    ];
    if (oneBranch.length > 0) {
      violations.push({ snippet: match[0].slice(0, 120), classes: oneBranch });
    }
  }

  // Logical AND: cond && 'a b c' — single-branch by definition.
  const logicalAnd = /&&\s*(['"`])([^'"`]*)\1/g;
  while ((match = logicalAnd.exec(source)) !== null) {
    const found = triggerClassesIn(match[2]);
    if (found.length > 0) {
      violations.push({ snippet: match[0].slice(0, 120), classes: found });
    }
  }

  return violations;
};

describe('className stability — NativeWind upgrade-crash guard', () => {
  const files = collectJsFiles(UI_ROOT);

  it('scans a plausible number of UI files', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('has no upgrade-triggering Tailwind class inside a conditional className branch', () => {
    const report = [];

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const violations = findViolations(source);
      for (const v of violations) {
        report.push(
          `${path.relative(UI_ROOT, file)} → [${v.classes.join(', ')}] in: ${v.snippet}`,
        );
      }
    }

    if (report.length > 0) {
      throw new Error(
        `Found ${report.length} conditional upgrade-triggering class(es). ` +
          `These crash dev builds (css-interop upgrade warning → navigation-context throw) ` +
          `and force remounts in production. Move the class to the static part of the ` +
          `className (both branches) or to the style prop.\n\n${report.join('\n')}`,
      );
    }
  });
});
