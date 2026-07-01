#!/usr/bin/env node
/**
 * IRIS "direct exe" dependency downloader (cross-platform, zero-dependency).
 *
 * Reads ./manifest.json and downloads every native executable / model that
 * matches the current platform into ./bin, then extracts archives in place.
 *
 * Usage:
 *   node "direct exe/download-dependencies.mjs"            # download all
 *   node "direct exe/download-dependencies.mjs" adb ffmpeg # download by id
 *   node "direct exe/download-dependencies.mjs" --force    # re-download
 *
 * No npm packages required — uses only Node built-ins.
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import https from 'node:https'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HERE = resolve(__dirname)
const args = process.argv.slice(2)
const FORCE = args.includes('--force')
const filters = args.filter((a) => !a.startsWith('--'))

const platform = process.platform // 'win32' | 'darwin' | 'linux'
const manifest = JSON.parse(readFileSync(join(HERE, 'manifest.json'), 'utf8'))
const installDir = join(HERE, manifest.installDir || 'bin')

const log = (...m) => console.log('[iris:deps]', ...m)
const fail = (...m) => console.error('[iris:deps] ERROR:', ...m)

function pickTarget(dep) {
  return dep.targets[platform] || dep.targets.all || null
}

function download(url, dest, redirects = 0) {
  return new Promise((resolvePromise, reject) => {
    if (redirects > 6) return reject(new Error('Too many redirects'))
    mkdirSync(dirname(dest), { recursive: true })
    https
      .get(url, { headers: { 'User-Agent': 'iris-deps/1.0' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          const next = new URL(res.headers.location, url).toString()
          return resolvePromise(download(next, dest, redirects + 1))
        }
        if (res.statusCode !== 200) {
          res.resume()
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        }
        const total = Number(res.headers['content-length'] || 0)
        let received = 0
        let lastPct = -1
        const isTty = process.stdout.isTTY
        const out = createWriteStream(dest)
        res.on('data', (chunk) => {
          received += chunk.length
          if (total) {
            const pct = Math.floor((received / total) * 100)
            if (pct !== lastPct && (isTty || pct % 25 === 0)) {
              lastPct = pct
              const name = dest.split(/[\\/]/).pop()
              process.stdout.write(`${isTty ? '\r' : ''}[iris:deps] downloading ${name} ${pct}%${isTty ? '   ' : '\n'}`)
            }
          }
        })
        res.pipe(out)
        out.on('finish', () => out.close(() => (process.stdout.write('\n'), resolvePromise(dest))))
        out.on('error', reject)
      })
      .on('error', reject)
  })
}

function extract(archive, outDir) {
  mkdirSync(outDir, { recursive: true })
  const lower = archive.toLowerCase()
  let cmd
  if (lower.endsWith('.zip')) {
    cmd =
      platform === 'win32'
        ? ['powershell', ['-NoProfile', '-Command', `Expand-Archive -Force -LiteralPath '${archive}' -DestinationPath '${outDir}'`]]
        : hasBin('unzip')
          ? ['unzip', ['-o', archive, '-d', outDir]]
          : ['tar', ['-xf', archive, '-C', outDir]]
  } else if (lower.endsWith('.tar.xz') || lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
    cmd = ['tar', ['-xf', archive, '-C', outDir]]
  } else {
    return true // not an archive; leave as-is
  }
  const r = spawnSync(cmd[0], cmd[1], { stdio: 'inherit' })
  return r.status === 0
}

function hasBin(bin) {
  const probe = platform === 'win32' ? ['where', [bin]] : ['which', [bin]]
  return spawnSync(probe[0], probe[1], { stdio: 'ignore' }).status === 0
}

async function run() {
  log(`platform=${platform} installDir=${installDir}`)
  let ok = 0
  let skipped = 0
  const failures = []

  for (const dep of manifest.dependencies) {
    if (filters.length && !filters.includes(dep.id)) continue
    const target = pickTarget(dep)
    if (!target) {
      log(`- ${dep.id}: no target for ${platform}, skipping`)
      skipped++
      continue
    }

    const depDir = join(installDir, dep.id)
    const checkPath = target.check ? join(depDir, target.check) : null
    if (!FORCE && checkPath && existsSync(checkPath)) {
      log(`✓ ${dep.id}: already installed`)
      ok++
      continue
    }

    const fileName = target.url.split('/').pop().split('?')[0]
    const archivePath = join(depDir, fileName)
    try {
      log(`↓ ${dep.id}: ${dep.name}`)
      await download(target.url, archivePath)
      if (dep.extract) {
        if (!extract(archivePath, depDir)) throw new Error('extraction failed')
        rmSync(archivePath, { force: true })
      }
      if (checkPath && !existsSync(checkPath)) {
        log(`! ${dep.id}: downloaded but expected file "${target.check}" not found (layout may differ)`)
      }
      log(`✓ ${dep.id}: ready in ${depDir}`)
      ok++
    } catch (e) {
      fail(`${dep.id}: ${e.message}`)
      failures.push(dep.id)
    }
  }

  log(`done. ok=${ok} skipped=${skipped} failed=${failures.length}`)
  if (failures.length) {
    fail(`failed: ${failures.join(', ')}. Re-run with the id, or download manually (see README.md).`)
    process.exitCode = 1
  }
}

run().catch((e) => {
  fail(e.stack || e.message)
  process.exitCode = 1
})
