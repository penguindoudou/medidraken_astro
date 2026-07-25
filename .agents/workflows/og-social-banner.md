---
description: Generating OG social share banners for Medidraken using logo and brand typography specifications.
---

Generate an OG social share banner for Medidraken.

Use the `generate_image` tool with reference image `public/assets/images/medidraken-logo_white_background.png`.

Prompt template:
"Minimalist social share banner on a warm beige textured parchment background. Aspect ratio 1200x630 (horizontal banner). On the right side, an elegant golden line-art illustration of a human torso profile showing acupuncture meridian lines along the arm and back. Centered on the left, a circular emblem featuring a central Yin-Yang symbol flanked by two black dragon silhouettes (public/assets/images/medidraken-logo_white_background.png). Crisp, dark navy sans-serif text formatted in four lines:
- Top centered: "Akupunktur & Massage"
- Middle (next to logo): "Medidraken" (bold)
- Below logo: "Medicinsk Qigong · Tai Chi"
- Bottom centered: "Nyköping · Gnesta · Oxelösund"
Clean vector style, sharp typography, professional wellness graphic, high resolution."

After generating image:
1. Save output file to `public/assets/images/og-social-v<N>.png` (incrementing version number based on existing `og-social` files in `public/assets/images`).
