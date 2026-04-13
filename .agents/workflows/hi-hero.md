---
description: Creating a suitable hero image displaying before & after states for a health intervention for symptoms and health goal pages.
---

To demonstrate the effect of a treatment or training method on a specific page given by the user.

If the symtom/health goal is clear generate a suitable text prompt - otherwise ask the user.

For example, if the symptom is migraine, provide something similar to:

"Seamless panoramic cinematic shot, 1 ar 16:9. Continuous, unified wellness clinic room with softly blurred beige walls providing massive empty negative space in the wide center. On one side of the room: A woman in her 30s looking stressed rubbing her temples, with a vivid, soft glowing red energy aura around her forehead and jaw representing tension, cool muted lighting. On the other side of the same room: The same woman in soft beige linen clothing, bathed in warm golden morning sunlight, eyes closed, peaceful smile, one hand resting gently on her chest in a relaxed breathing posture. The two states of the woman must appear naturally in the same continuous space. High-end editorial photography, elegant --ar 16:9"

Generate a similar prompt following the same theme. Explain clearly what the "red energy aura" will highlight based on the symptom. Let the gender and age vary between 30-60, and make it relevant to whatever symptom or health goal and ask the user for any desired changes.

If the user accepts then proceed to generate the image with nano banana with ar: 16:9.

Check if the page uses an existing image.

If it does use that name add a number to indicate the version - e.g. if "image.png" exist, name it "image2.png".

Save it to src/assets/images. 

Make sure we are using this on the page we are working on.