# Spicy Lyrics as a visual research reference

Reference: https://github.com/Spikerko/spicy-lyrics (reviewed 2026-11-01 via GitHub connector).

The repository is a Spicetify lyrics extension with live animated backgrounds. Its `src/components/DynamicBG/dynamicBackground.ts` uses `@kawarp/core`, with configuration values for warping, blur passes, animation speed, saturation, and tint, plus a capped animation-frame controller. The repository reports license `AGPL-3.0`.

ORBIT uses **the idea** of a softly animated, blurred, shifting multicolor visual plane under readable controls. ORBIT deliberately does not copy or bundle any Spicy Lyrics source or assets, and does not import Kawarp. It implements its own layered CSS radial colors with long-duration transform animations, a pale overlay scrim, transparent widget surfaces, and motion/transparency alternatives.

Reasoning: copying upstream code would require separately analyzing compliance with its copyright/license obligations; it is not necessary to achieve the user's desired aesthetic. For future adoption of Kawarp or original upstream code, perform an explicit license review before touching the product's dependency architecture.

Performance: current background relies on compositor-friendly transform animation rather than continuously changing blur radii, and it disables animation under `prefers-reduced-motion`. Test on mobile Safari and lower-end Android devices before shipping.
