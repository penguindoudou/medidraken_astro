import os
import re
import sys
from pathlib import Path

def migrate_file(twig_path, astro_path):
    print(f"Migrating {twig_path} to {astro_path}")
    with open(twig_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract Title
    title = ""
    title_match = re.search(r'SEO Title:\s*(.*)', content)
    if title_match:
        title = title_match.group(1).split('|')[0].strip()
    
    if not title:
        title = Path(twig_path).stem.capitalize()

    # Remove Twig comments
    content = re.sub(r'\{#.*?#\}', '', content, flags=re.DOTALL)
    
    # Process images
    images = []
    def img_replacer(match):
        img_tag = match.group(0)
        src_match = re.search(r'src=["\']\{\{\s*theme\.link\s*\}\}/dev-assets/images/([^"\']+)["\']', img_tag)
        if not src_match:
            return img_tag
        
        filename = src_match.group(1)
        var_name = re.sub(r'[^a-zA-Z0-9]', '_', Path(filename).stem) + "Image"
        var_name = re.sub(r'^(\d)', r'img\1', var_name)
        
        images.append((var_name, filename))
        
        # Replace src
        img_tag = re.sub(r'src=["\'].*?["\']', f'src={{{var_name}}}', img_tag)
        
        # Replace img with Image
        img_tag = img_tag.replace('<img ', '<Image ').replace('<img\n', '<Image\n')
        
        # Make self closing
        if not img_tag.strip().endswith('/>'):
            img_tag = re.sub(r'>\s*$', ' />', img_tag)
            
        return img_tag

    content = re.sub(r'<img[^>]+>', img_replacer, content)
    
    unique_images = []
    seen = set()
    for var, file in images:
        if var not in seen:
            unique_images.append((var, file))
            seen.add(var)

    # Relative paths
    file_rel = Path(astro_path).resolve().relative_to((Path.cwd() / "src" / "pages").resolve())
    depth = len(file_rel.parts) - 1
    up = '../' * (depth + 1)

    # Process icons
    def icon_replacer(match):
        icon_name = match.group(1)
        class_match = re.search(r"with\s*\{'class':\s*'([^']+)'\}", match.group(0))
        class_str = class_match.group(1) if class_match else ""
        class_str = class_str.replace('\n', ' ').strip()
        class_str = re.sub(r'\s+', ' ', class_str)
        
        return f'<Icon name="{Path(icon_name).stem}" class="{class_str}" />'

    content = re.sub(r'\{%\s*include\s*[\'"]icons/([^\'"]+)[\'"].*?%\}', icon_replacer, content, flags=re.DOTALL)

    # Convert Twig logic tags to Astro comments
    content = re.sub(r'\{%\s*(.*?)\s*%\}', r'{/* {%\1%} */}', content, flags=re.DOTALL)

    # Convert Twig output tags to visible placeholders
    content = re.sub(r'\{\{\s*(.*?)\s*\}\}', r'[\1]', content)

    # Fix <br> -> <br />
    content = re.sub(r'<br\s*>', '<br />', content)

    # Build Astro content
    astro_imports = f"""---
import {{ Image }} from 'astro:assets';
import BaseLayout from '{up}layouts/BaseLayout.astro';
import Icon from '{up}components/Icon.astro';

// Images
"""
    for var, file in unique_images:
        astro_imports += f"import {var} from '{up}assets/images/{file}';\n"
        
    astro_imports += f"---\n\n<BaseLayout title=\"{title}\">\n"
    
    astro_content = astro_imports + content.strip() + "\n</BaseLayout>\n"

    os.makedirs(os.path.dirname(astro_path), exist_ok=True)
    
    with open(astro_path, 'w', encoding='utf-8') as f:
        f.write(astro_content)
    
    print(f"Done: {astro_path}")

if __name__ == "__main__":
    files_to_migrate = [
        ("legacy_wp_site/templates/page-content/kurser/instruktorsutbildning.twig", "src/pages/kurser/instruktorsutbildning.astro"),
        ("legacy_wp_site/templates/page-content/kurser/medicinsk-qigong.twig", "src/pages/kurser/medicinsk-qigong.astro"),
        ("legacy_wp_site/templates/page-content/kurser/tai-chi.twig", "src/pages/kurser/tai-chi.astro"),
    ]
    for twig, astro in files_to_migrate:
        if os.path.exists(twig):
            migrate_file(twig, astro)
        else:
            print(f"Skipping missing: {twig}")
