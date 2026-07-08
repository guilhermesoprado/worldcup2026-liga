from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path('tmp') / 'design-smoke'
out.mkdir(parents=True, exist_ok=True)

routes = [
    ('home', 'http://127.0.0.1:3000/'),
    ('segunda-fase', 'http://127.0.0.1:3000/segunda-fase'),
    ('confrontos', 'http://127.0.0.1:3000/confrontos'),
    ('mais-escalados', 'http://127.0.0.1:3000/jogadores-mais-escalados'),
    ('admin-login', 'http://127.0.0.1:3000/admin/login'),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1200})
    results = []
    for name, url in routes:
        try:
            page.goto(url, wait_until='domcontentloaded', timeout=45000)
            page.wait_for_load_state('networkidle', timeout=45000)
            page.screenshot(path=str(out / f'{name}.png'), full_page=True)
            results.append(f'{name}: ok')
        except Exception as exc:
            results.append(f'{name}: fail -> {exc}')
    browser.close()

print('\n'.join(results))
