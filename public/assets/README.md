# Consultant Portrait Assets (`public/assets/consultant/`)

The interactive 3D Egypt Maquette portfolio is pre-wired with processed, web-optimized photographs of **Abdullah Ibrahim Mohamed (`عبدالله ابراهيم محمد` — Senior Property Consultant)** inside `public/assets/consultant/`:

| Asset Path | Role | Consumer | Format & Framing |
|---|---|---|---|
| `/assets/consultant/hero-leaning.png` | Rim-anchored transparent cutout leaning on the 3D Egypt maquette | `CONSULTANT_PROFILE.portraitUrl` (M2 `HeroMaquetteEngine`) | 4:5 `RGBA` PNG (`< 500 KB`), defringed against warm obsidian (`#141210`), seated flush at bottom rim |
| `/assets/consultant/profile-portrait.webp` | Executive studio headshot for consultant identity card & modal | `CONSULTANT_PROFILE.profilePhotoUrl` (M5 `ConsultantProfileModal`) | 4:5 `RGB` WebP (`640×800`, `< 150 KB`), warm obsidian-plaster atelier studio backdrop |

## Swapping Portraits (1-Line Update)

1. Save replacement assets inside `public/assets/consultant/` (keeping a transparent RGBA PNG/WebP for the 3D maquette cutout and a 4:5 WebP/JPEG headshot for the profile modal).
2. Update `portraitUrl` and/or `profilePhotoUrl` in `src/data/consultant.ts`.
3. Optionally fine-tune hero placement via `portraitAnchor: { x, y, scale }` or profile crop alignment via `portraitFallback.profileObjectPosition`.

## Automatic SVG Fallback (`EC-15`)

Both `portraitUrl` and `profilePhotoUrl` support `string | null` and include `portraitFallback.svgFallbackEnabled: true`. If either image is set to `null` or fails to load at runtime, the Hero engine and Profile modal automatically render the bespoke architectural SVG studio silhouette / `AIM` monogram medallion with zero broken image icons or console errors.
