# Medidraken: Traditional Chinese Medicine & Wellness Center

Source code for the **Medidraken** website — a Swedish TCM and wellness practice specializing in TuiNa, Acupuncture, Medical Qigong, and Tai Chi.

> [!NOTE]
> Shared publicly as part of a professional portfolio.
>
> **History**: Unstructured vanilla HTML/CSS → WordPress → rebuilt in **Astro**, with content rewritten and expanded — new SEO pages, Swedish copy, and AI-enhanced imagery.
>
> **Status**: 🟡 **Feature-complete. Contact form testing in progress.**

---

## 🚀 Project Overview

Full-featured digital hub for Traditional Chinese Medicine (TCM) in Swedish, with SEO-optimized symptom pages, health goal funnels, corporate wellness offerings, and experience packages.

---

## ✅ Completed

### Core
- Homepage, Contact page, About Us
- Privacy Policy & Terms of Service
- Gift card (`presentkort`) page
- Friskvårdsbidrag (wellness benefit) information page
- 404 page

### Treatments
- TuiNa Massage
- Oil Massage
- Acupuncture

### Courses & Training
| Section | Pages |
|---|---|
| Tai Chi | Index, weekend course, private lessons |
| Medical Qigong | Index, weekend course, private lessons |

### Symptom Pages (`/symtom/`)
| Category | Subpages |
|---|---|
| Rygg & Ländryggsbesvär | Index, Akut ryggont, Ischias, Långvarig värk & stelhet |
| Ledvärk & Idrottsskador | Index, Ont i knän, Ont i höfter, Tennisarm/musarm |
| Nacke, Axlar & Skuldror | Index, Nackspärr/stel nacke, Ont i axlar & skuldror |
| Huvudvärk | Index, Migrän, Spänningshuvudvärk, Balansproblem |
| Standalone | Sömnproblem, Utbrändhet & trötthet, Ofta förkyld |

### Health Goals (`/na-dina-halsomal/`)
- Index
- Minska stress & hitta inre lugn
- Öka energi & livskraft
- Stärk fokus & mental styrka
- Stärka motståndskraften
- Förbättra balans, rörlighet & kroppskontroll

### Corporate Services (`/for-foretag/`)
- Index
- Hälsa på arbetsplatsen
- Företagsevent & aktiviteter
- Samarbeten med hälsoföretag
- Kontakt & offert

### Experiences (`/upplevelser/`)
- Index
- Hälsoresor
- Skräddarsydda hälsodagar
- Workshops & gruppaktiviteter

---

## 🚧 In Progress

- **Contact form**: End-to-end testing of form submission, validation, and Cloudflare Worker email delivery

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Astro](https://astro.build/) |
| Styling | Vanilla CSS |
| Icons | Custom SVG components |
| Deployment | Cloudflare Pages + Workers |
| Email | Cloudflare Email Worker |

---

## 🧞 Commands

Run from project root:

| Command | Action |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at `localhost:4321` |
| `npm run build` | Build to `./dist/` |
| `npm run preview` | Preview production build locally |

---

## 📄 License & Copyright

**Copyright (c) 2026 Din Hälsa-Medidraken. All rights reserved.**

Shared for demonstration and educational purposes only. No part may be copied, reproduced, or distributed without express written permission.

---

*Developed by Simon Mao · [LinkedIn](https://www.linkedin.com/in/simon-mao-808aa1191/)*
