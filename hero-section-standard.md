# Hero Section Standard - Medidraken

This document defines the responsive spacing and layout standards for Hero sections across the Medidraken website, ensuring a consistent and optimized experience between mobile and desktop viewports.

## 1. Container Structure (.hero-section)
All hero sections should use the `.hero-section` class with centralized responsive height and padding.

- **Class**: `.hero-section`
- **Global CSS**:
  ```css
  .hero-section {
    @apply relative text-center flex items-start justify-center text-neutral-50;
    @apply min-h-[45vh] md:min-h-[60vh];
    @apply pt-8 pb-12 lg:pt-24 lg:pb-24;
  }
  ```
- **Goal**: Minimize "zoomed-in" background images on mobile and prevent overwhelming vertical space.

## 2. Typography Spacing

### Hero Title (.hero-title)
- **Class**: `.hero-title`
- **Spacing**: `@apply pb-3 md:pb-4 mb-0;`
- **Font Size**: `clamp(3rem, 12vw, 4.5rem)` (centralized in CSS)

### Subtitle & Body (.hero-text)
The main content box should use the `.hero-text` class for its outer container.
- **Outer Container Spacing**: `@apply mt-2 md:mt-6;`
- **Content Box Padding**: `p-4 md:p-6 rounded-lg backdrop-blur-sm ...`
- **Paragraph Spacing (Inside box)**:
  - First paragraph: `mt-3 md:mt-5`
  - Subsequent paragraphs: `mt-2 md:mt-3`

## 3. Call to Action (CTA) Buttons
- **Container Class**: `mt-6 md:mt-10 flex flex-col sm:flex-row justify-center gap-4`
- **Mobile Behavior**: Stacked vertically (`flex-col`).
- **Desktop Behavior**: Side-by-side (`sm:flex-row`).

## 4. Implementation Example (Astro)
```html
<section class="hero-section">
    <div class="hero-background">
        <Image src={heroImage} alt="..." class="hero-bg-image opacity-80" />
    </div>
    <div class="hero-content">
        <h1 class="hero-title">Page Title</h1>

        <div class="hero-text bg-brand-earth-dark/60 p-4 md:p-6 rounded-lg backdrop-blur-sm border border-white/10">
            <h2 class="hero-subtitle text-xl font-semibold">Compelling Subtitle</h2>
            <p class="hero-text mt-3 md:mt-5">Primary hero text paragraph.</p>
            <p class="hero-text mt-2 md:mt-3">Secondary details or smaller prompt.</p>
        </div>

        <div class="mt-6 md:mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <a href="/link-1" class="btn btn-primary-on-dark">Primary Action</a>
            <a href="/link-2" class="btn btn-secondary-on-dark">Secondary Action</a>
        </div>
    </div>
</section>
```
____

- Some thoughts afterward. Worth to change the mt-3 md:mt-5 to mt-2? To decrease the space between the subtitle and the body text? 
- Is it better with mt-6 md:mt-10 or just mt-8 for the CTA buttons?
