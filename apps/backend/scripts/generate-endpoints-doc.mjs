// Genera docs/api/endpoints.md directo desde los decoradores reales de los
// controllers (@Controller, @Get/@Post/@Patch/@Delete, @Roles, @UseGuards,
// @ApiOperation summary) — asi la matriz de permisos no puede quedar
// desactualizada a mano: o coincide con el codigo, o `--check` falla en CI.
//
// Uso:
//   node scripts/generate-endpoints-doc.mjs           # escribe docs/api/endpoints.md
//   node scripts/generate-endpoints-doc.mjs --check   # falla (exit 1) si el archivo
//                                                       committeado quedo desactualizado

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, '..', 'src');
const OUTPUT_PATH = join(__dirname, '..', '..', '..', 'docs', 'api', 'endpoints.md');
const HTTP_VERBS = ['Get', 'Post', 'Patch', 'Delete', 'Put'];

function findControllerFiles(dir) {
  const resultados = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      resultados.push(...findControllerFiles(full));
    } else if (entry.name.endsWith('.controller.ts') && !entry.name.endsWith('.spec.ts')) {
      resultados.push(full);
    }
  }
  return resultados;
}

function extraerConstantesDeRoles(contenido) {
  const mapa = new Map();
  const regex = /const\s+([A-Z_]+)\s*=\s*\[([^\]]*)\]/g;
  let match;
  while ((match = regex.exec(contenido))) {
    const roles = [...match[2].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    if (roles.length > 0) mapa.set(match[1], roles);
  }
  return mapa;
}

function extraerRoles(bloqueMetodo, constantes) {
  const match = bloqueMetodo.match(/@Roles\(([^)]*)\)/);
  if (!match) return null;
  const contenido = match[1].trim();
  if (contenido.startsWith('...')) {
    return constantes.get(contenido.slice(3)) ?? [];
  }
  return [...contenido.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

function extraerResumen(bloqueMetodo, textoAnterior) {
  const match = bloqueMetodo.match(/@ApiOperation\(\{[^}]*summary:\s*(['"`])((?:(?!\1)[\s\S])*?)\1/);
  if (match) return match[2].replace(/\s+/g, ' ').trim();

  // Sin @ApiOperation (ej. controllers excluidos de Swagger como health): si el
  // decorador de metodo viene inmediatamente precedido por un comentario JSDoc
  // (nada mas que espacios en blanco entre uno y otro), se usa ese como resumen.
  const finConEspacios = textoAnterior.replace(/\s+$/, '');
  if (finConEspacios.endsWith('*/')) {
    const jsdocMatch = finConEspacios.match(/\/\*\*\s*((?:(?!\*\/)[\s\S])*?)\s*\*\/$/);
    if (jsdocMatch) return jsdocMatch[1].replace(/\s+/g, ' ').trim();
  }

  return '';
}

function parsearControlador(filePath) {
  const contenido = readFileSync(filePath, 'utf-8');
  const claseIdx = contenido.indexOf('export class');
  if (claseIdx === -1) return null;

  const encabezado = contenido.slice(0, claseIdx);
  const cuerpo = contenido.slice(claseIdx);

  const controllerMatch = encabezado.match(/@Controller\(\s*(?:(['"`])([^'"`]*)\1)?\s*\)/);
  const basePath = controllerMatch?.[2] ?? '';
  const tieneGuardsDeClase = /@UseGuards\(/.test(encabezado);

  const constantes = extraerConstantesDeRoles(contenido);

  const verbRegex = new RegExp(
    `@(${HTTP_VERBS.join('|')})\\(\\s*(?:(['"\`])([^'"\`]*)\\2)?\\s*\\)`,
    'g',
  );
  const matches = [...cuerpo.matchAll(verbRegex)];

  const endpoints = matches.map((match, i) => {
    const [, verbo, , rutaMetodo] = match;
    const inicio = match.index;
    const finAnterior = i > 0 ? matches[i - 1].index : 0;
    const fin = i + 1 < matches.length ? matches[i + 1].index : cuerpo.length;
    const bloque = cuerpo.slice(inicio, fin);
    const textoAnterior = cuerpo.slice(finAnterior, inicio);

    const roles = extraerRoles(bloque, constantes);
    const tieneGuardsDeMetodo = /@UseGuards\(/.test(bloque);
    const autenticado = tieneGuardsDeClase || tieneGuardsDeMetodo || (roles?.length ?? 0) > 0;

    const partes = [basePath, rutaMetodo].filter(Boolean).join('/');
    const ruta = ('/' + partes).replace(/\/+/g, '/');

    return {
      metodo: verbo.toUpperCase(),
      ruta,
      rol: roles && roles.length > 0 ? roles.join(', ') : autenticado ? '—' : 'público',
      resumen: extraerResumen(bloque, textoAnterior),
    };
  });

  return { basePath, endpoints };
}

function generarMarkdown(controladores) {
  const lineas = [
    '# Referencia de endpoints',
    '',
    '> **Generado automaticamente desde los decoradores reales de cada controller**',
    '> (`@Controller`, `@Get`/`@Post`/`@Patch`/`@Delete`, `@Roles`, `@UseGuards`,',
    '> `@ApiOperation summary`) — no se edita a mano. Para regenerar:',
    '> `node apps/backend/scripts/generate-endpoints-doc.mjs`. CI falla si este',
    '> archivo queda desactualizado respecto al codigo (`--check`).',
    '',
    'Todas las rutas viven bajo `/api/v1` salvo `health`. "Rol" es el minimo',
    'requerido — "—" significa que cualquier usuario autenticado de la',
    'organizacion puede llamarlo (incluido `MIEMBRO`). Request/response',
    'completos: Swagger en `/api/docs`.',
    '',
  ];

  for (const { nombre, basePath, endpoints } of controladores) {
    if (endpoints.length === 0) continue;
    const nombreCorto = basePath || basename(nombre).replace(/\.controller\.ts$/, '');
    lineas.push(`## \`${nombreCorto}\``, '');
    lineas.push('| Método | Ruta | Rol | Qué hace |', '|---|---|---|---|');
    for (const ep of endpoints) {
      lineas.push(`| ${ep.metodo} | \`${ep.ruta}\` | ${ep.rol} | ${ep.resumen} |`);
    }
    lineas.push('');
  }

  return lineas.join('\n');
}

function main() {
  const archivos = findControllerFiles(SRC_DIR).sort();
  const controladores = archivos
    .map((filePath) => {
      const parsed = parsearControlador(filePath);
      if (!parsed) return null;
      return { nombre: relative(SRC_DIR, filePath), ...parsed };
    })
    .filter(Boolean);

  const markdown = generarMarkdown(controladores);
  const check = process.argv.includes('--check');

  if (check) {
    const actual = readFileSync(OUTPUT_PATH, 'utf-8');
    if (actual !== markdown) {
      console.error(
        `docs/api/endpoints.md esta desactualizado respecto al codigo.\n` +
          `Corre: node apps/backend/scripts/generate-endpoints-doc.mjs`,
      );
      process.exit(1);
    }
    console.log('docs/api/endpoints.md esta actualizado.');
    return;
  }

  writeFileSync(OUTPUT_PATH, markdown, 'utf-8');
  console.log(`Escrito: ${OUTPUT_PATH}`);
}

main();
