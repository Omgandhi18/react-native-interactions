// Creates a new interaction from scripts/templates/interaction and registers it.
// Usage: pnpm new <slug> "<Title>"     e.g. pnpm new card-stack "Card Stack"
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INTERACTIONS_DIR = path.join(ROOT, 'src', 'interactions');
const REGISTRY_FILE = path.join(INTERACTIONS_DIR, 'registry.ts');
const TEMPLATE_DIR = path.join(ROOT, 'scripts', 'templates', 'interaction');
const IMPORTS_MARKER = '// @new-interaction:imports';
const ENTRIES_MARKER = '// @new-interaction:entries';
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const USAGE = 'Usage: pnpm new <slug> "<Title>"   (slug: lowercase words joined by dashes)';

function toPascalCase(slug) {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function toCamelCase(slug) {
  const pascal = toPascalCase(slug);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function localDate() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function fillTemplate(template, values) {
  return Object.entries(values).reduce(
    (text, [placeholder, value]) => text.replaceAll(placeholder, value),
    template,
  );
}

function insertBeforeMarker(source, marker, line) {
  const lines = source.split('\n');
  const markerIndex = lines.findIndex((existing) => existing.trim() === marker);
  if (markerIndex === -1) {
    throw new Error(`Marker "${marker}" not found in ${REGISTRY_FILE}`);
  }
  const indent = lines[markerIndex].match(/^\s*/)[0];
  lines.splice(markerIndex, 0, indent + line);
  return lines.join('\n');
}

async function main() {
  const [slug, title] = process.argv.slice(2);
  if (!slug || !title || !SLUG_PATTERN.test(slug)) {
    console.error(USAGE);
    process.exit(1);
  }

  const targetDir = path.join(INTERACTIONS_DIR, slug);
  if (await exists(targetDir)) {
    console.error(`An interaction named "${slug}" already exists.`);
    process.exit(1);
  }

  const componentName = toPascalCase(slug);
  const values = {
    __COMPONENT__: componentName,
    __SLUG__: slug,
    __TITLE__: title.replaceAll("'", "\\'"),
    __DATE__: localDate(),
  };

  const [componentTemplate, indexTemplate] = await Promise.all([
    readFile(path.join(TEMPLATE_DIR, 'Component.tsx.tpl'), 'utf8'),
    readFile(path.join(TEMPLATE_DIR, 'index.ts.tpl'), 'utf8'),
  ]);

  await mkdir(targetDir);
  await writeFile(path.join(targetDir, `${componentName}.tsx`), fillTemplate(componentTemplate, values));
  await writeFile(path.join(targetDir, 'index.ts'), fillTemplate(indexTemplate, values));

  const variableName = toCamelCase(slug);
  let registry = await readFile(REGISTRY_FILE, 'utf8');
  registry = insertBeforeMarker(registry, IMPORTS_MARKER, `import { interaction as ${variableName} } from './${slug}';`);
  registry = insertBeforeMarker(registry, ENTRIES_MARKER, `${variableName},`);
  await writeFile(REGISTRY_FILE, registry);

  console.log(`Created src/interactions/${slug}/${componentName}.tsx and registered it.`);
  console.log(`Next: build it in ${componentName}.tsx and add a one-line description in index.ts.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
