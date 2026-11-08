import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const src = path.resolve(__dirname, '../src');
type CoreLayer = 'domain' | 'application';

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(path.join(dir, entry.name))
      : entry.name.endsWith('.ts')
        ? [path.join(dir, entry.name)]
        : [],
  );
}

// Include type-only dependencies and re-exports: emitted JavaScript alone cannot enforce DIP.
function dependencies(source: string): string[] {
  const ast = ts.createSourceFile(
    'module.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const modules: string[] = [];
  const add = (node: ts.Node) => {
    modules.push(
      ts.isStringLiteralLike(node) ? node.text : '<computed module>',
    );
  };
  const visit = (node: ts.Node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier
    ) {
      add(node.moduleSpecifier);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression
    ) {
      add(node.moduleReference.expression);
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument)
    ) {
      add(node.argument.literal);
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'require'))
    ) {
      if (node.arguments[0]) add(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return modules;
}

function violations(layer: CoreLayer, file: string, source: string): string[] {
  const allowed = layer === 'domain' ? ['domain'] : ['domain', 'application'];
  return dependencies(source).filter((module) => {
    if (!module.startsWith('.')) return true;
    const resolved = path.resolve(path.dirname(file), module);
    return !allowed.some((name) =>
      resolved.startsWith(path.join(src, name) + path.sep),
    );
  });
}

it.each<CoreLayer>(['domain', 'application'])(
  '%s and its unit tests depend only on permitted inner layers',
  (layer) => {
    for (const file of files(path.join(src, layer))) {
      expect({
        file: path.relative(src, file),
        forbiddenDependencies: violations(
          layer,
          file,
          readFileSync(file, 'utf8'),
        ),
      }).toEqual({
        file: path.relative(src, file),
        forbiddenDependencies: [],
      });
    }
  },
);

describe('dependency boundary regression checks', () => {
  const file = path.join(src, 'application/example.ts');
  it.each([
    "import type { UserRepository } from '../infrastructure/repository';",
    "export type { UserRepository } from '../infrastructure/repository';",
    "export * from '../presentation/contracts';",
    "type Repository = import('../infrastructure/repository').UserRepository;",
    "const repository = import('../infrastructure/repository');",
    "const repository = require('../infrastructure/repository');",
    "import repository = require('../infrastructure/repository');",
    "import { Injectable } from '@nestjs/common';",
    "import type { Model } from 'mongoose';",
    'const repository = import(moduleName);',
  ])('rejects outer dependencies in %s', (source) => {
    expect(violations('application', file, source)).toHaveLength(1);
  });
  it('allows application-owned ports and domain models', () => {
    expect(
      violations(
        'application',
        file,
        `
      import type { UserRepositoryPort } from './ports/user-repository.port';
      import type { User } from '../domain/models/user';
    `,
      ),
    ).toEqual([]);
  });
  it('rejects application dependencies in domain', () => {
    expect(
      violations(
        'domain',
        path.join(src, 'domain/example.ts'),
        "import type { Port } from '../application/ports/port';",
      ),
    ).toEqual(['../application/ports/port']);
  });
});
