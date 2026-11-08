import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
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
      const ast = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true,
      );
      for (const match of source.matchAll(
        /(?:from\s*|import\s*\()\s*['"]([^'"]+)['"]/g,
      )) {
        if (match[1] === '@lib-infrastructure/database/contracts') {
          // Shared repository interfaces moved to the lib; only type imports are allowed here.
          const imports = ast.statements.filter(
            (statement): statement is ts.ImportDeclaration =>
              ts.isImportDeclaration(statement) &&
              ts.isStringLiteral(statement.moduleSpecifier) &&
              statement.moduleSpecifier.text === match[1],
          );
          expect(imports.length).toBeGreaterThan(0);
          expect(
            imports.every((statement) => statement.importClause?.isTypeOnly),
          ).toBe(true);
          continue;
        }
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

it('shared database contracts contain only framework-independent interfaces', () => {
  const file = path.resolve(
    __dirname,
    '../../lib-infrastructure/libs/database/src/lib/profiles/types.ts',
  );
  const ast = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  expect(ast.statements.length).toBeGreaterThan(0);
  expect(ast.statements.every(ts.isInterfaceDeclaration)).toBe(true);
});
