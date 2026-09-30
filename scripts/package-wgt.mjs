#!/usr/bin/env node
/**
 * Packages dist/ as a signed Tizen widget (.wgt) for Samsung TVs.
 *
 *   npm run build && npm run package
 *
 * Stages build/wgt/ = dist/ + tizen/config.xml (version stamped from
 * package.json) + tizen/icon.png, then signs it with the Tizen CLI:
 *   tizen package -t wgt -s $TIZEN_PROFILE -- build/wgt
 * Output: build/FifiRecipes-<version>.wgt
 *
 * TIZEN_PROFILE (default "fifi") must be an existing security profile —
 * create one with scripts/tizen-profile.sh (dev certificate, or your Samsung
 * author/distributor certificates for Seller Office). The Tizen CLI is found
 * via $TIZEN_CLI, `tizen` on PATH, or ~/tizen-studio/tools/ide/bin/tizen.
 * Without it an UNSIGNED archive is written (inspection only: TVs and Seller
 * Office reject unsigned widgets).
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const stage = join(root, 'build', 'wgt');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

if (!/^\d{1,3}\.\d{1,3}\.\d{1,5}$/.test(version)) throw new Error(`package.json version ${version} is not Tizen x.y.z`);
if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/ is missing — run `npm run build` first.');
  process.exit(1);
}

rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
cpSync(dist, stage, { recursive: true });
writeFileSync(join(stage, 'config.xml'), readFileSync(join(root, 'tizen', 'config.xml'), 'utf8').replace('@VERSION@', version));
cpSync(join(root, 'tizen', 'icon.png'), join(stage, 'icon.png'));

const out = join(root, 'build', `FifiRecipes-${version}.wgt`);
rmSync(out, { force: true });

const cli = [process.env.TIZEN_CLI, 'tizen', join(homedir(), 'tizen-studio', 'tools', 'ide', 'bin', 'tizen')]
  .filter(Boolean)
  .find((c) => {
    try {
      execFileSync(c, ['version'], { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  });

if (cli) {
  const profile = process.env.TIZEN_PROFILE || 'fifi';
  execFileSync(cli, ['package', '-t', 'wgt', '-s', profile, '--', stage], { stdio: 'inherit' });
  const built = readdirSync(stage).find((f) => f.endsWith('.wgt'));
  if (!built) throw new Error('tizen package produced no .wgt');
  renameSync(join(stage, built), out);
  // `tizen package` only warns when the profile is missing or unreadable and
  // still writes an unsigned archive — refuse to hand that on.
  const listing = execFileSync('unzip', ['-Z1', out], { encoding: 'utf8' }).split('\n');
  for (const sig of ['author-signature.xml', 'signature1.xml']) {
    if (!listing.includes(sig)) {
      rmSync(out, { force: true });
      throw new Error(`${sig} missing — security profile "${profile}" did not sign the package (run scripts/tizen-profile.sh)`);
    }
  }
  console.log(`\nSigned package (profile "${profile}"): ${out}`);
} else {
  const unsigned = out.replace(/\.wgt$/, '-unsigned.wgt');
  rmSync(unsigned, { force: true });
  execFileSync('zip', ['-qr', unsigned, '.'], { cwd: stage });
  console.warn(`\nTizen CLI not found — wrote UNSIGNED ${unsigned} (not installable). See README › Packaging.`);
}
