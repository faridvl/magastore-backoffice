---
name: novedades
description: Genera la imagen de "Novedades · Magastore" (tabla Mejora / Dónde / Antes / Ahora, con la marca negra y dorada) con los cambios de una entrega y la registra en docs/novedades/HISTORIAL.md. Usar cuando se pida la imagen, el resumen de cambios, el changelog o las "novedades" de Magastore. Toma solo los commits posteriores a la última entrega registrada.
---

# Novedades

Imagen para el negocio con lo que cambió en una entrega, más un historial que dice qué commits
cubre cada una, para no mezclar entregas. `docs/novedades/` es solo local (está en `.gitignore`):
el repo es público.

## Archivos

| Qué | Dónde |
|---|---|
| Historial, de la más nueva a la más antigua | `docs/novedades/HISTORIAL.md` |
| Datos e imagen de cada entrega | `docs/novedades/<id>.json` y `<id>.png` |
| Generador | `.claude/skills/novedades/render.py` |

`<id>` = `AAAA-MM-DD-tema-corto`.

## 1. Qué entra

1. Leer la primera entrada de `HISTORIAL.md`: su **Hasta** es el último commit cubierto.
2. `git fetch -q` y `git log --no-merges --format="%h %s%n%b" <hasta>..origin/develop`
   (o `origin/main` si se habla de lo ya publicado).
3. Sin commits nuevos, no hay imagen. Nunca repetir un commit de una entrega anterior.

## 2. Redactar: resumido y sin jerga

- **Solo lo obvio e importante** para el operador o el dueño, una fila por mejora (no por commit),
  entre 8 y 12 filas en total.
- Lo demás va junto en una sección **"Ajustes varios"** (diseño, textos, correcciones chicas) o en
  la nota del pie.
- Secciones por área con un color de la marca: `teal`, `gold`, `blue`, `black`, `gray`
  (`gray` solo para "Ajustes varios"). Mantener el color que un área ya tuvo.
- Columnas: `titulo` corto; `donde` como ruta en la app con `→`; `antes` (o "No existía."); `ahora`
  en una o dos frases; `*texto*` sale en cursiva; `nuevo: true` solo para funciones enteras nuevas.
- Sin términos técnicos (endpoint, migración, API, componente, commit). Tildes siempre, tuteo.
- **Nunca mencionar Panamá**: la imagen se puede compartir y el cliente no debe saberlo.
- **El rastreo público no va en la imagen**, por decisión del dueño.
- Honestidad: no afirmar lo que no se verificó.

## 3. JSON e imagen

Formato del JSON: ver la entrega más reciente en `docs/novedades/`. Campos: `id`, `fecha`
(`AAAA-MM-DD` o `null`), `titulo`, `subtitulo`, `estado` (`pendiente` / `publicada`),
`revisado_en_pruebas`, `nota_pie`, `commits.backoffice.desde/hasta`, `secciones[]`.

```bash
python .claude/skills/novedades/render.py docs/novedades/<id>.json
```

Mirar el PNG con Read antes de entregarlo (texto cortado, tildes) y enviarlo con SendUserFile.

## Cuándo se genera

- Al abrir el PR de `develop` a `main`: se arma o se amplía la entrega con lo que trae el PR.
- Si entran más commits al PR antes del merge: se amplía la misma entrega y se regenera.
- Al mergear a `main`: `estado: publicada`, fecha del merge y se regenera.

## 4. Historial

Agregar la entrega **arriba** en `HISTORIAL.md`:

```markdown
## AAAA-MM-DD · Tema
- **Estado:** pendiente de publicar (faridvl/magastore-backoffice#N)
- **Commits:** `desde` → `hasta`
- **Imagen:** [<id>.png](<id>.png)

1. Título — resumen del "ahora".
```

Al publicarse: `estado: publicada`, poner `fecha`, regenerar y actualizar **Estado**. Si entran
más commits antes de publicar, ampliar `hasta` en la misma entrega. Una entrega publicada no se reabre.
