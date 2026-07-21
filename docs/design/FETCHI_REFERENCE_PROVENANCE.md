# Fetchi Design Reference Provenance

Status: CP26A source audit and conflict ledger. Audit performed 2026-07-20
before repository editing. ZIPs were extracted under
`/private/tmp/fetchi-cp26av2-source-audit`, outside the repository.

## Audit method

- Fetched and verified the required repository base before reading source
  packages.
- Hashed each supplied top-level artifact with SHA-256.
- Extracted both ZIPs outside the repository.
- Hashed every extracted file in deterministic path order and hashed the
  resulting file-hash manifest.
- Compared the standalone design-system extraction, the broader archive's
  nested design-system payload, and the loose design-system directory by path
  and bytes.
- Parsed the manifest as JSON, inspected all token CSS, component declarations,
  component prompts, component source, foundation specimens, README, RTF, v3,
  v4, and v5 brand sheets, and rendered both pages of the supplied PDF.
- Treated exact text/CSS/manifest/component declarations as explicit. Visual
  appearance alone did not create an exact token or behavior.

No source package, extracted file, screenshot, PDF, brand asset, Linear image,
SerpApi image, or pricing image was copied into the repository.

## Required-source availability

| Requested artifact | Local result |
| --- | --- |
| `Fetchi Design System.zip` | Found |
| `FETCHI.AI.zip` | Found |
| `FETCHI.AI.pdf` | Found |
| `FETCHI.AI(1).pdf` | User-confirmed duplicate copy of `FETCHI.AI.pdf`; no additional authority or revision |
| loose `styles.css` | Found under the loose `Fetchi Design System/` directory |
| loose `_ds_bundle.js` | Found under the loose `Fetchi Design System/` directory |
| loose `_ds_manifest.json` | Found under the loose `Fetchi Design System/` directory |
| loose `Fetchi Components.html` | Found both at source root and inside the loose design-system directory |

The source directory also contained `fetchi_design_system_context_01.rtf`; it
duplicates the design-system README content and was used as corroborating text.

## Supplied artifact inventory

All timestamps are local MDT filesystem timestamps. Hashes are SHA-256.

| Artifact | Bytes | Modified | SHA-256 |
| --- | ---: | --- | --- |
| `FETCHI.AI.zip` | 123,652,079 | 2026-07-20 14:36:26 | `409b93b30a188dcc82cdb13fed5004b1b7b27865d5fff09c0c9390b716275fdd` |
| `Fetchi Design System.zip` | 19,598,768 | 2026-07-20 00:56:52 | `3bea1c60e01aadb9f6149e9ee85660752cd8be24f05297dc4d5327edf2a8efa2` |
| `FETCHI.AI.pdf` | 1,634,947 | 2026-07-20 14:35:52 | `d5e42dc6d80db4127180122cd57fac8e36d22a43d7f7c14e1d8c98b01239ef26` |
| root `Fetchi Components.html` | 2,706,437 | 2026-07-20 00:55:49 | `a5f6b2be56c10177fcd9165680616c4beace55c4a075d4b69cbd934a61a3c4fe` |
| `fetchi_design_system_context_01.rtf` | 26,883 | 2026-07-20 00:54:56 | `bf51060939ad77f5b21e6b9b3739157dfc5f237c5fe6a88dfd36340563f9264e` |
| loose `styles.css` | 258 | 2026-07-20 00:56:48 | `625a5c22a62f81f59f8bbb8ab4a89c1c893bbc2fc50013bfce450dd8bedf6a92` |
| loose `_ds_bundle.js` | 50,990 | 2026-07-20 00:56:47 | `544bf8d2b8a8c0e26b527c9fdee34f71a0a5d02050296d718c8510a4c32dd3fd` |
| loose `_ds_manifest.json` | 23,750 | 2026-07-20 00:56:47 | `f5e6398ff189fe050ed5226c2fe7ea9849701f597ff7bc9695813e0c05cb1491` |
| loose nested `Fetchi Components.html` | 2,706,437 | 2026-07-20 00:56:47 | `a5f6b2be56c10177fcd9165680616c4beace55c4a075d4b69cbd934a61a3c4fe` |

## Archive inventory and duplication

### `FETCHI.AI.zip`

- 486 files; extracted size approximately 132,536 KiB.
- Extension inventory: 15 CSS, 60 HTML, 36 JPG, 2 JS, 3 JSON, 54 JSX,
  37 Markdown, 3 PDF, 236 PNG, 5 SVG, 2 thumbnail, 27 TypeScript,
  4 TTF, 1 TXT, and 1 WEBP.
- Deterministic extracted file-manifest digest:
  `28637f3ec9cc2e39198cbd5c59d9abf7375b3bbef9c588a0e1b5d1e06df3717d`.
- Contains v3, v4, and v5 brand sheets, screen explorations, reference uploads,
  and a nested `uploads/Fetchi Design System/` payload.
- Its direct `fetchi-ds/` directory is an 11-file runtime subset. Every file in
  that subset is byte-identical to the corresponding nested design-system file.

### `Fetchi Design System.zip`

- 163 files; extracted size approximately 21,120 KiB.
- Extension inventory: 7 CSS, 25 HTML, 11 JPG, 1 JS, 2 JSON, 23 JSX,
  24 Markdown, 40 PNG, 4 SVG, 1 thumbnail, 23 TypeScript, and 2 TTF.
- Deterministic extracted file-manifest digest:
  `30d847bcfbffb3fa8a32ceb1a2dffa5ed073e2a779a3054c703f27cae751ce6c`.
- Manifest namespace: `FetchiDesignSystem_8db62e`.
- Manifest inventory: 23 components, 23 foundation/component cards, 169 token
  entries, one light theme, and two Inter variable font faces.

### Duplicate conclusion

The standalone 163-file design-system extraction is byte-for-byte identical to
`FETCHI.AI.zip/uploads/Fetchi Design System/`. The existing loose
`Fetchi Design System/` directory is also byte-for-byte identical to the
standalone ZIP extraction. The root loose `Fetchi Components.html` matches the
archive copy exactly.

Key canonical payload hashes:

| Path in design-system payload | SHA-256 |
| --- | --- |
| `readme.md` | `6c211220775b6ef36df447b835d68bc9d9434c96ee031b48e4a819285a5ce626` |
| `styles.css` | `625a5c22a62f81f59f8bbb8ab4a89c1c893bbc2fc50013bfce450dd8bedf6a92` |
| `_ds_bundle.js` | `544bf8d2b8a8c0e26b527c9fdee34f71a0a5d02050296d718c8510a4c32dd3fd` |
| `_ds_manifest.json` | `f5e6398ff189fe050ed5226c2fe7ea9849701f597ff7bc9695813e0c05cb1491` |
| `Fetchi Components.html` | `a5f6b2be56c10177fcd9165680616c4beace55c4a075d4b69cbd934a61a3c4fe` |
| `tokens/colors.css` | `e9b32fd6d2ff62d3e993b723834fbddb1e843a8ede78959cff09d3229c1590f0` |
| `tokens/typography.css` | `cb6d3cca3eee026b634591b7c38efacd7870f580b3adc8327a5614e26a42f1a8` |
| `tokens/spacing.css` | `1ab630242d70a8230519068c03c6c5daecff865dc9ddd7465dd10fcc4e96ae03` |
| `tokens/effects.css` | `35fc28f1a281c93007024664195ab3bc79276a1215cbe8f2c303ec9f32c0c111` |
| `tokens/fonts.css` | `74a7d0a6f45df807379f54c4232bdb9dfb49c7f92024b5f39797e99704d8d396` |
| `tokens/base.css` | `45b39d60a27a4c04f5c4ea061e7e4ba803286bb2ea8e44116900b7f8bcd2b365` |

## Revision conclusion

`FETCHI.AI.zip` is the newest and most complete archive by timestamp, file
count, and breadth. Its current design-system payload is nevertheless exactly
the same 163-file payload as the standalone ZIP, so the smaller archive is the
cleanest canonical package boundary for tokens and components.

The broad archive includes historical and alternate work. Its v5 brand sheet
explicitly says it supersedes v4, retires the coral/cream shell and
Outfit/DM-Sans, adopts the neutral-dark/Inter/indigo system, and keeps coral only
in the mark. The loose root `tokens.css` is an older warm green/coral/parchment
and Outfit/DM-Sans system; it is not the v5 token source. The canonical
`fetchi-ds/` subset and nested full package agree byte-for-byte on the v5 token
files.

`FETCHI.AI.pdf` is the reviewed two-page Brand System v5 artifact. It is titled
`FETCHI.AI`, with creation/modification metadata `20260720203415+00'00'`.
Its text and rendered pages identify
“FETCHI BRAND SYSTEM V5,” repeat the neutral-dark/Inter/indigo values, and say
v5 supersedes v4. Adam confirms that `FETCHI.AI(1).pdf` is only a duplicate
copy of `FETCHI.AI.pdf`. The duplicate introduces no additional authority,
revision, or unresolved provenance question.

## Explicit versus inferred material

| Classification | Material used in CP26A |
| --- | --- |
| Explicit exact values | Token CSS, parsed manifest, v5 PDF text, v5 brand-sheet text, component declarations/source/prompts, README |
| Explicit behavior | Named component variants/states, selected-row treatment, control sizes, touch minimum, product laws, semantic role prose |
| Derived repository guardrail | Native semantics, keyboard parity, reduced motion, WCAG AA verification, non-color cues, implementation test requirements |
| Visual-only evidence | Rendered PDF pages, component board, screenshots, older screen studies |
| Excluded from exact values | Eyedropped pixels, approximate geometry, apparent contrast, raster screenshot measurements, Linear visual resemblance |

Derived guardrails add no replacement token values. Every exact value in the
new documentation maps to the supplied token CSS, manifest, component source,
or v5 text/PDF.

## Conflict ledger

None of these conflicts was silently merged.

| Conflict | Source evidence | CP26A treatment |
| --- | --- | --- |
| Coral ownership | Existing Fetchi law permits evidence-backed urgent actions; Claude v5 says mark-only | **PM decision required**; no coral action in CP26B until resolved |
| Accent hover | `colors.css`, manifest, README/PDF use `#828FFF`; `guidelines/colors-accent.html` paints `#6E79D9` | JSON records token/manifest value; specimen value quarantined; **PM decision required** before implementation |
| Accent press | `colors.css`, manifest, README/PDF use `#5058C0`; accent specimen paints `#505ABF` | JSON records token/manifest value; specimen value quarantined; **PM decision required** |
| Border ramp | CSS/manifest/PDF use `#191A1D`, `#23252A`, `#34343A`; border specimen caption and README prose include nearby alternate values | JSON records CSS/manifest values; captions quarantined; **PM decision required** |
| Light-theme accent caption | Light specimen renders `var(--accent)` but labels it `#F45B3B` | Treated as a stale caption; **PM decision required** to correct source package |
| Token comments | `colors.css` header calls coral the single accent and `effects.css` calls the focus ring coral; actual values and v5 prose are indigo | Values preserved; comments treated as stale; **PM decision required** to correct source package |
| Link ownership | V5 interaction prose assigns links to indigo; semantic prose also assigns links to blue | **PM decision required** |
| Active navigation | Interaction prose assigns active/selected states to indigo; semantic prose assigns active nav to green | **PM decision required** |
| Focus geometry | Prose says a `2px` indigo ring on a gap; `--ring` uses a `2px` gap then a `3.5px` outer extent; form specimen uses a different three-pixel shadow | Exact tokens preserved; combined geometry **PM decision required** |
| Press scale | V5/readme/state specimen use `scale(.97)`; exported `Button.jsx` uses `scale(0.98)` | **PM decision required** |
| Loading | README says three-dot green loader; exported Button uses a circular spinner | **PM decision required** |
| Wordmark tracking | Base/component source applies `-0.03em`; the wordmark prompt says never add tracking | **PM decision required** |
| Lifecycle coverage | Repo taxonomy includes Responded; exported `StatusGlyph` omits it | **PM decision required** |
| Time-sensitive signal | `SignalBars` level 4 is amber but has no dated-artifact input/gate | **PM decision required** |
| Vertical/contact-confidence encoding | Export has arbitrary label-dot color and no contact-confidence primitive | **PM decision required** |
| Focus plus selection | Both use indigo; no combined-state specimen or emphasis rule exists | **PM decision required** |

## Reference restrictions

- Linear screenshots remain quality and interaction evidence only and were not
  committed.
- Linear layouts, terminology, branding, and icons are not Fetchi authority.
- SerpApi and pricing images were not used as design references.
- Existing production UI was read only as migration context and no production
  file changed in CP26A.
