/**
 * CP26B - Fetch design foundation smoke proof.
 *
 * Static and DB-free. Guards the approved decision records, inert Inter/token
 * plumbing, namespaced primitives, accessibility contracts, route stability,
 * and the exact checkpoint file fence.
 */

import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

function source(path: string): string {
  return readFileSync(path, 'utf8')
}

function shell(command: string): string {
  return execSync(command, { encoding: 'utf8' }).trim()
}

function pathsFor(command: string): string[] {
  const output = shell(command)
  return output ? output.split('\n') : []
}

function changedFiles(): string[] {
  return Array.from(new Set([
    ...pathsFor('git diff --name-only origin/main..HEAD'),
    ...pathsFor('git diff --name-only'),
    ...pathsFor('git diff --name-only --cached'),
    ...pathsFor('git ls-files --others --exclude-standard'),
  ])).sort()
}

function routeFiles(ref?: string): string[] {
  const command = ref ? `git ls-tree -r --name-only ${ref}` : 'git ls-files app'
  return shell(command)
    .split('\n')
    .filter((path) => path.startsWith('app/') && (path.endsWith('/page.tsx') || path.endsWith('/route.ts')))
    .sort()
}

async function main() {
  const system = source('docs/design/FETCHI_DESIGN_SYSTEM.md')
  const components = source('docs/design/FETCHI_COMPONENT_CONTRACTS.md')
  const semantics = source('docs/design/FETCHI_SEMANTIC_COLOR_CONTRACTS.md')
  const layout = source('app/layout.tsx')
  const globals = source('app/globals.css')
  const tailwind = source('tailwind.config.ts')

  assert(system.includes('CP26B interaction decisions'), 'Approved CP26B interaction decisions are not recorded')
  assert(system.includes('Standard product links use indigo'), 'Standard link ownership must be indigo')
  assert(system.includes('Evidence-source links use blue'), 'Evidence-source link ownership must be blue')
  assert(system.includes('scale(0.98)') && system.includes('120ms'), 'Press motion decision must be 0.98 over 120ms')
  assert(system.includes('compact spinner') && system.includes('visible label'), 'Loading must use a compact spinner with a stable label')
  assert(system.includes('focus ring overlays'), 'Focus must overlay rather than replace selection')
  assert(semantics.includes('Active navigation uses indigo'), 'Active navigation ownership must be indigo')
  assert(components.includes('CP26B approved behavior'), 'Primitive behavior decisions must be recorded')

  assert(layout.includes("import { Inter,"), 'Inter must be loaded through next/font/google')
  assert(layout.includes("variable: '--font-inter'"), 'Inter must expose --font-inter')
  assert(layout.includes('inter.variable'), 'The Inter variable must be present on the html element')
  assert(!/font-family:\s*var\(--font-inter\)/.test(globals), 'CP26B must not globally switch existing route typography')

  for (const token of [
    '--fetchi-bg: #08090A',
    '--fetchi-surface: #0F1011',
    '--fetchi-raised: #141516',
    '--fetchi-overlay: #191A1C',
    '--fetchi-border: #23252A',
    '--fetchi-text: #F7F8F8',
    '--fetchi-text-secondary: #8A8F98',
    '--fetchi-accent: #5E6AD2',
    '--fetchi-accent-hover: #828FFF',
    '--fetchi-accent-press: #5058C0',
    '--fetchi-blue: #4C8DF6',
    '--fetchi-red: #EB5C57',
    '--fetchi-radius-md: 8px',
    '--fetchi-control-sm: 28px',
    '--fetchi-control-md: 32px',
    '--fetchi-control-lg: 40px',
    '--fetchi-touch-min: 44px',
    '--fetchi-duration-press: 120ms',
  ]) {
    assert(globals.includes(token), `Missing exact namespaced token: ${token}`)
  }
  assert(globals.includes('.fetchi-theme-light'), 'Namespaced light-theme overrides must exist')
  assert(globals.includes('--fetchi-bg: #FBFBFC'), 'Exact light background token is missing')
  assert(globals.includes('--fetchi-surface: #FFFFFF'), 'Exact light surface token is missing')
  assert(tailwind.includes("inter: ['var(--font-inter)'"), 'Tailwind must expose font-inter')
  assert(tailwind.includes("fetchi: ['var(--font-inter)'"), 'Tailwind must expose font-fetchi')

  const primitivePaths = [
    'components/fetchi-ui/button.tsx',
    'components/fetchi-ui/input.tsx',
    'components/fetchi-ui/textarea.tsx',
    'components/fetchi-ui/field.tsx',
    'components/fetchi-ui/checkbox.tsx',
  ]
  assert(existsSync(primitivePaths[0]), `Missing CP26B primitive: ${primitivePaths[0]}`)
  const button = source(primitivePaths[0])
  assert(button.includes('FetchiButton'), 'Button must use the namespaced FetchiButton API')
  for (const variant of ['primary', 'secondary', 'ghost', 'subtle', 'danger']) {
    assert(button.includes(`${variant}:`), `Button variant is missing: ${variant}`)
  }
  for (const size of ['sm:', 'md:', 'lg:']) {
    assert(button.includes(size), `Button size is missing: ${size}`)
  }
  assert(button.includes('h-[28px]') && button.includes('h-[32px]') && button.includes('h-[40px]'), 'Button heights must match the approved tokens')
  assert(button.includes('bg-[var(--fetchi-accent)]'), 'Primary Button must use indigo')
  assert(button.includes('bg-[var(--fetchi-red)]'), 'Danger Button must use red')
  assert(button.includes('active:scale-[0.98]'), 'Button must use the approved press scale')
  assert(button.includes('[transition-duration:var(--fetchi-duration-press)]'), 'Button must use the approved press duration token')
  assert(button.includes('[transition-timing-function:var(--fetchi-ease)]'), 'Button must use the approved motion curve without ambiguous Tailwind utilities')
  assert(button.includes('motion-reduce:transform-none'), 'Button must remove press scaling under reduced motion')
  assert(button.includes('LoaderCircle'), 'Button loading must use the approved compact spinner')
  assert(button.includes('aria-busy={isLoading || undefined}'), 'Button loading must expose busy state')
  assert(button.includes('disabled={disabled || isLoading}'), 'Button loading must block duplicate activation')
  assert(button.includes('{children}'), 'Button loading must retain its visible label')
  assert(button.includes('React.isValidElement(children)'), 'asChild must validate its single element contract')
  assert(button.includes('React.cloneElement'), 'asChild loading content must be cloned into the intended element')

  assert(existsSync(primitivePaths[1]), `Missing CP26B primitive: ${primitivePaths[1]}`)
  assert(existsSync(primitivePaths[2]), `Missing CP26B primitive: ${primitivePaths[2]}`)
  const input = source(primitivePaths[1])
  const textarea = source(primitivePaths[2])
  for (const control of [input, textarea]) {
    assert(control.includes('font-fetchi'), 'Form controls must use the Inter-based Fetchi font')
    assert(control.includes('focus-visible:shadow-[var(--fetchi-focus-ring)]'), 'Form controls need approved focus-visible geometry')
    assert(control.includes('aria-invalid:border-[var(--fetchi-red)]'), 'Form controls need red invalid treatment')
    assert(control.includes('disabled:cursor-not-allowed'), 'Form controls need disabled treatment')
  }
  assert(input.includes('h-[28px]') && input.includes('h-[32px]') && input.includes('h-[40px]'), 'Input heights must match the approved tokens')
  assert(textarea.includes('resize-y'), 'Textarea must retain vertical resize')

  assert(existsSync(primitivePaths[3]), `Missing CP26B primitive: ${primitivePaths[3]}`)
  const field = source(primitivePaths[3])
  assert(field.includes('React.cloneElement'), 'Field must wire accessibility attributes into its control')
  assert(field.includes("'aria-describedby'"), 'Field must associate hint or error text')
  assert(field.includes("'aria-errormessage'"), 'Field must associate error text')
  assert(field.includes("'aria-invalid'"), 'Field must expose invalid state')
  assert(field.includes('required'), 'Field must expose required state programmatically')
  assert(field.includes('htmlFor={id}'), 'Field label must target the control id')
  assert(field.includes('role={error ? \'alert\' : undefined}'), 'Field error must be announced')

  assert(existsSync(primitivePaths[4]), `Missing CP26B primitive: ${primitivePaths[4]}`)
  const checkbox = source(primitivePaths[4])
  assert(checkbox.includes('@radix-ui/react-checkbox'), 'Checkbox must use Radix checkbox semantics')
  assert(checkbox.includes('group-data-[state=indeterminate]/indicator'), 'Checkbox icon must follow the live Radix indeterminate state')
  assert(checkbox.includes('Check') && checkbox.includes('Minus'), 'Checkbox must use real state icons')
  assert(checkbox.includes('min-h-[var(--fetchi-touch-min)]'), 'Checkbox row must meet the 44px touch target')
  assert(checkbox.includes('aria-describedby={descriptionId}'), 'Checkbox description must be programmatically associated')
  assert(checkbox.includes('disabled={disabled}'), 'Checkbox must expose disabled state')

  const foundationSource = [button, input, textarea, field, checkbox].join('\n')
  assert(!/coral/i.test(foundationSource), 'Coral must be absent from CP26B product primitives')

  const allProductSource = shell("rg -l 'components/fetchi-ui|@/components/fetchi-ui' app components --glob '!components/fetchi-ui/**' || true")
  assert.equal(allProductSource, '', 'CP26B primitives must remain unreferenced by production routes and existing components')

  const baseRoutes = routeFiles('origin/main')
  const currentRoutes = routeFiles()
  assert.deepEqual(currentRoutes, baseRoutes, 'Route file list changed')

  const allowed = [
    'app/globals.css',
    'app/layout.tsx',
    'components/fetchi-ui/button.tsx',
    'components/fetchi-ui/checkbox.tsx',
    'components/fetchi-ui/field.tsx',
    'components/fetchi-ui/input.tsx',
    'components/fetchi-ui/textarea.tsx',
    'docs/design/FETCHI_COMPONENT_CONTRACTS.md',
    'docs/design/FETCHI_DESIGN_SYSTEM.md',
    'docs/design/FETCHI_SEMANTIC_COLOR_CONTRACTS.md',
    'docs/superpowers/plans/2026-07-21-cp26b-fetch-design-foundation.md',
    'scripts/pm/cp26b-fetch-design-foundation-smoke.ts',
    'tailwind.config.ts',
  ].sort()
  assert.deepEqual(changedFiles(), allowed, 'CP26B changed files must match the approved file fence')

  console.log(JSON.stringify({
    ok: true,
    mode: 'cp26b_fetch_design_foundation',
    changedFilesAllowedOnly: true,
    routeCount: currentRoutes.length,
    routesChanged: false,
    primitivesProductionReferenced: false,
    interLoadedNotActivatedGlobally: true,
    exactTokenNamespacePresent: true,
    decisionsRecorded: true,
    buttonAccessibleStatesPresent: true,
    formAccessibilityWiringPresent: true,
    reducedMotionPresent: true,
    coralProductSemanticsAbsent: true,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
