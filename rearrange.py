import re

with open('src/pages/kontakt.astro', 'r') as f:
    content = f.read()

# Define patterns to extract the blocks. We'll use start/end comments that exist in the file.
# "<!-- Box 1: Symptom -->" to "<!-- Box 2: Hälsomål -->"
box1 = re.search(r'(<!-- Box 1: Symptom -->.*?)(?=<!-- Box 2: Hälsomål -->)', content, re.DOTALL).group(1)
box2 = re.search(r'(<!-- Box 2: Hälsomål -->.*?)(?=<!-- Box 3: Specifik Tjänst -->)', content, re.DOTALL).group(1)
box3 = re.search(r'(<!-- Box 3: Specifik Tjänst -->.*?)(?=</div>\s*</div>\s*<!-- Dynamiska val under Symptom -->)', content, re.DOTALL).group(1)

dyn_symptom = re.search(r'(<!-- Dynamiska val under Symptom -->.*?)(?=<!-- Dynamiska val under Hälsomål -->)', content, re.DOTALL).group(1)
dyn_health = re.search(r'(<!-- Dynamiska val under Hälsomål -->.*?)(?=<!-- Dropdown för Specifik Tjänst)', content, re.DOTALL).group(1)
dyn_service = re.search(r'(<!-- Dropdown för Specifik Tjänst.*?)(?=<!-- Bokningspreferenser \(Tid & Dag\) -->)', content, re.DOTALL).group(1)

# Now we construct the new block to replace the grid and all dynamic options up to Bokningspreferenser.
new_block = f"""<div class="space-y-4">
                                <div>
                                    {box1.strip()}
                                    
                                    <div class="mt-2">
                                        {dyn_symptom.strip()}
                                    </div>
                                </div>

                                <div>
                                    {box2.strip()}
                                    
                                    <div class="mt-2">
                                        {dyn_health.strip()}
                                    </div>
                                </div>

                                <div>
                                    {box3.strip()}
                                    
                                    <div class="mt-2">
                                        {dyn_service.strip()}
                                    </div>
                                </div>
                            </div>
"""

# Replace the original big block with new_block
original_full_block = re.search(r'<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">.*?</div>\s*</div>\s*<!-- Dynamiska val under Symptom -->.*?<!-- Övrigt Text Input -->.*?(?=<!-- Bokningspreferenser \(Tid & Dag\) -->)', content, re.DOTALL).group(0)

new_content = content.replace(original_full_block, new_block + "\n                        ")

with open('src/pages/kontakt.astro', 'w') as f:
    f.write(new_content)

print("Replaced!")
