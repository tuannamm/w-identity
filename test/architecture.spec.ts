import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? files(path.join(dir, e.name))
      : e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts')
        ? [path.join(dir, e.name)]
        : [],
  );
}
it('keeps domain and application independent of frameworks, transport and infrastructure', () => {
  for (const layer of ['domain', 'application']) {
    for (const file of files(path.resolve(__dirname, '../src', layer))) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(
        /(?:from\s*|import\s*\()\s*['"]([^'"]+)['"]/g,
      )) {
        expect(match[1].startsWith('.')).toBe(true);
        const resolved = path.resolve(path.dirname(file), match[1]);
        const allowed =
          layer === 'domain' ? ['domain'] : ['domain', 'application'];
        expect(
          allowed.some((name) =>
            resolved.startsWith(
              path.resolve(__dirname, '../src', name) + path.sep,
            ),
          ),
        ).toBe(true);
      }
    }
  }
});
