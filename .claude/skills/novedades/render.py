"""
Genera la imagen de novedades de una entrega de Magastore a partir de su JSON.

Uso:
    python .claude/skills/novedades/render.py docs/novedades/<id>.json

Escribe <id>.html (intermedio, se borra al final) y <id>.png junto al JSON.
Renderiza con Edge o Chrome en modo headless y recorta el blanco sobrante
con Pillow. Todo el texto visible sale del JSON: aquí no se inventa nada.
"""
import base64
import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from PIL import Image, ImageChops

# Colores de marca (tailwind.config.js y logo): negro, dorado y turquesa.
BRAND = {
    'gold': '#ffcd3c',
    'teal': '#5ec4aa',
    'blue': '#0ea5e9',
    'black': '#111111',
    'gray': '#9c9a94',
}
# Dorado y turquesa no se leen como texto sobre blanco: títulos y números usan estos tonos.
READABLE = {**BRAND, 'gold': '#b58a00', 'teal': '#3f9c85', 'blue': '#0369a1', 'gray': '#6e6c67'}

REPO_ROOT = Path(__file__).resolve().parents[3]
LOGO = REPO_ROOT / 'public' / 'logo' / 'magastore-logo-principal-transparente.png'

SCREENSHOT_TIMEOUT_SECONDS = 30

BROWSERS = [
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
]

MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
          'septiembre', 'octubre', 'noviembre', 'diciembre']


def inline(text: str) -> str:
    """Escapa HTML y convierte *cursiva* en <em>, lo único que se permite marcar."""
    escaped = html.escape(text)
    return re.sub(r'\*([^*]+)\*', r'<em>\1</em>', escaped)


def long_date(iso: str) -> str:
    year, month, day = iso.split('-')
    return f'{int(day)} de {MONTHS[int(month) - 1]} de {year}'


def logo_data_uri() -> str:
    return 'data:image/png;base64,' + base64.b64encode(LOGO.read_bytes()).decode('ascii')


def build_html(data: dict) -> str:
    rows = []
    number = 0
    for section in data['secciones']:
        color = READABLE[section.get('color', 'teal')]
        rows.append(
            f'<tr class="sec"><td colspan="5" style="color:{color}">'
            f'{html.escape(section["nombre"])}</td></tr>'
        )
        for item in section['mejoras']:
            number += 1
            badge = '<span class="new">NUEVO</span>' if item.get('nuevo') else ''
            rows.append(
                '<tr>'
                f'<td class="n"><span style="background:{color}">{number}</span></td>'
                f'<td class="what">{inline(item["titulo"])}{badge}</td>'
                f'<td class="where">{inline(item["donde"])}</td>'
                f'<td class="before">{inline(item["antes"])}</td>'
                f'<td class="now">{inline(item["ahora"])}</td>'
                '</tr>'
            )

    subtitle = data.get('subtitulo') or (
        f'Mejoras disponibles desde el {long_date(data["fecha"])}' if data.get('fecha') else 'Nueva entrega'
    )
    footer_left = data.get('nota_pie') or (
        'Todas las mejoras se revisaron en el entorno de pruebas antes de publicarse.'
        if data.get('revisado_en_pruebas') else ''
    )

    return f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
<style>
  *{{box-sizing:border-box}}
  body{{margin:0;background:#fff;font-family:'Montserrat',system-ui,sans-serif;color:#1f1e1d}}
  .page{{width:1060px;padding:0 0 20px}}
  .head{{display:flex;align-items:center;gap:22px;background:#111;padding:20px 26px;border-bottom:4px solid {BRAND['gold']}}}
  .head img{{height:72px}}
  h1{{margin:0;font-size:24px;font-weight:700;color:#fff}}
  .sub{{margin:6px 0 0;color:{BRAND['gold']};font-size:14px;font-weight:500}}
  .body{{padding:6px 22px 0}}
  table{{width:100%;border-collapse:collapse}}
  th{{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6e6c67;font-weight:600;text-align:left;padding:14px 12px 10px;border-bottom:2px solid #e7e5e0}}
  td{{padding:13px 12px;border-bottom:1px solid #e7e5e0;vertical-align:top;font-size:13.5px;line-height:1.5}}
  tr.sec td{{border-bottom:none;padding:22px 12px 8px;font-size:12.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}}
  .n{{width:46px}}
  .n span{{display:inline-flex;width:24px;height:24px;border-radius:50%;color:#fff;font-size:12px;font-weight:700;align-items:center;justify-content:center}}
  .what{{width:210px;font-weight:600;font-size:14.5px}}
  .where{{width:180px;color:#4a4947}}
  .before{{width:205px;color:#9c9a94}}
  .new{{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:999px;background:#fff3d1;color:#b58a00;font-size:10px;font-weight:700;letter-spacing:.04em;vertical-align:2px}}
  .foot{{display:flex;justify-content:space-between;gap:24px;margin-top:16px;padding:0 22px;color:#6e6c67;font-size:12px}}
</style></head>
<body><div class="page">
  <div class="head">
    <img src="{logo_data_uri()}" alt="">
    <div>
      <h1>{html.escape(data.get('titulo') or 'Novedades · Magastore')}</h1>
      <p class="sub">{html.escape(subtitle)}</p>
    </div>
  </div>
  <div class="body">
    <table>
      <thead><tr><th>#</th><th>Mejora</th><th>Dónde</th><th>Antes</th><th>Ahora</th></tr></thead>
      <tbody>{''.join(rows)}</tbody>
    </table>
  </div>
  <div class="foot"><span>{html.escape(footer_left)}</span><span>Magastore · Compras por internet</span></div>
</div></body></html>"""


def find_browser() -> str:
    for path in BROWSERS:
        if os.path.exists(path):
            return path
    found = shutil.which('msedge') or shutil.which('chrome') or shutil.which('google-chrome')
    if not found:
        sys.exit('No se encontró Edge ni Chrome para renderizar la imagen.')
    return found


def render(json_path: Path) -> Path:
    json_path = json_path.resolve()
    data = json.loads(json_path.read_text(encoding='utf-8'))
    html_path = json_path.with_suffix('.html')
    png_path = json_path.with_suffix('.png')
    raw_path = json_path.with_name(json_path.stem + '.raw.png')
    html_path.write_text(build_html(data), encoding='utf-8')

    # Perfil propio: con Edge o Chrome abiertos, el headless se une a esa
    # sesión y sale sin escribir la captura.
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as profile_dir:
        subprocess.run(
            [find_browser(), '--headless=new', '--disable-gpu', '--hide-scrollbars',
             '--force-device-scale-factor=2', '--virtual-time-budget=6000',
             '--window-size=1060,3000', f'--user-data-dir={profile_dir}',
             f'--screenshot={raw_path}', html_path.resolve().as_uri()],
            check=True, capture_output=True,
        )
        # En Windows msedge.exe vuelve antes de que el proceso headless escriba la captura.
        deadline = time.monotonic() + SCREENSHOT_TIMEOUT_SECONDS
        while not raw_path.exists() and time.monotonic() < deadline:
            time.sleep(0.25)
        if not raw_path.exists():
            sys.exit('El navegador no generó la captura.')

    image = Image.open(raw_path).convert('RGB')
    box = ImageChops.difference(image, Image.new('RGB', image.size, (255, 255, 255))).getbbox()
    image.crop((0, 0, image.width, min(image.height, box[3] + 40))).save(png_path, optimize=True)

    raw_path.unlink()
    html_path.unlink()
    return png_path


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('Uso: python render.py docs/novedades/<id>.json')
    print(render(Path(sys.argv[1])))
