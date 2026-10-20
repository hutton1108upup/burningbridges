"""Check project/tutorial coverage and responsive local pages without submitting jobs."""
import argparse
import json
from pathlib import Path
from urllib.parse import unquote, urlsplit
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument("--base-url", default="http://localhost:4198")
parser.add_argument("--output", default=".local/howto-qa")
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
output = Path(args.output).resolve()
output.mkdir(parents=True, exist_ok=True)
audit = json.loads((root / "docs/research/howto-coverage-2026-10-20.json").read_text(encoding="utf-8"))
config = json.loads((root / "site.config.json").read_text(encoding="utf-8"))
hub = BeautifulSoup((root / "public/blog/index.html").read_text(encoding="utf-8"), "html.parser")
results = {"coverage": [], "viewports": [], "screenshots": []}
routes = {"/blog"}

for item in audit["projects"]:
    guide, project = item["guide"], item["project"]
    routes.update([guide, project])
    doc = BeautifulSoup((root / ("public" + guide) / "index.html").read_text(encoding="utf-8"), "html.parser")
    detail = BeautifulSoup((root / ("public" + project) / "index.html").read_text(encoding="utf-8"), "html.parser")
    assert hub.select_one(f'main a[href="{guide}"]'), ("missing hub link", guide)
    assert detail.select_one(f'main a[href="{guide}"]'), ("missing project backlink", project)
    assert doc.select_one(f'main a[href="{project}"]'), ("missing guide backlink", guide)
    assert guide in config["routes"]
    assert len(doc.select("h1")) == 1
    assert doc.select_one('link[rel="canonical"]')["href"] == config["origin"] + guide
    assert not doc.select_one('meta[name="robots"][content*="noindex"]')
    if item["status"] == "added":
        schemas = [json.loads(tag.string) for tag in doc.select('script[type="application/ld+json"]')]
        assert {"BlogPosting", "BreadcrumbList", "FAQPage"} <= {s["@type"] for s in schemas}
        faq = next(s for s in schemas if s["@type"] == "FAQPage")
        for question in faq["mainEntity"]:
            assert question["name"] in doc.main.get_text()
            assert question["acceptedAnswer"]["text"] in doc.main.get_text()
        assert doc.select_one('main a[href^="https://"]'), ("missing source", guide)
        # Check local anchors and linked resources in the article, including cross-page anchors.
        for anchor in doc.main.select("a[href]"):
            url = urlsplit(anchor["href"])
            if url.scheme or url.netloc:
                continue
            target_route = url.path or guide
            target = root / ("public" + target_route)
            if target.is_dir():
                target /= "index.html"
            assert target.exists(), (guide, anchor["href"])
            if url.fragment:
                linked = BeautifulSoup(target.read_text(encoding="utf-8"), "html.parser")
                assert linked.find(id=unquote(url.fragment)), (guide, anchor["href"])
        words = len(doc.main.get_text(" ", strip=True).split())
        results["coverage"].append({"guide": guide, "words": words, "status": "pass"})

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    for width in (320, 390, 768, 1280):
        page.set_viewport_size({"width": width, "height": 900})
        for route in sorted(routes):
            response = page.goto(args.base_url + route, wait_until="networkidle")
            assert response.status == 200, (route, response.status)
            page.evaluate("document.fonts.ready")
            assert page.locator("h1").is_visible(), route
            # Check actual element bounds as well as document width; overflow-x:hidden must not mask defects.
            overflow = page.evaluate("""() => {
              const width = document.documentElement.clientWidth;
              const bad = [...document.querySelectorAll('main h1, main h2, main p, main a, main img, main summary')]
                .filter(el => {
                  if (el.closest('[hidden], .dual-reference-track, .video-project-menu')) return false;
                  const style = getComputedStyle(el), r = el.getBoundingClientRect();
                  if (style.display === 'none' || !r.width || !r.height) return false;
                  // Deliberate horizontal video carousels are not page overflow.
                  for (let parent=el.parentElement; parent && parent.tagName!=='MAIN'; parent=parent.parentElement) {
                    if (['auto','scroll'].includes(getComputedStyle(parent).overflowX)) return false;
                  }
                  return r.left < -1 || r.right > width + 1;
                }).map(el => ({tag:el.tagName,text:el.textContent.slice(0,60)}));
              return {document:document.documentElement.scrollWidth > width+1,bad};
            }""")
            assert not overflow["document"] and not overflow["bad"], (width, route, overflow)
            if route in [i["guide"] for i in audit["projects"] if i["status"] == "added"]:
                page.locator('a[href="#faq"]').click()
                assert page.url.endswith("#faq")
                faq = page.locator("#faq details").first
                faq.locator("summary").click()
                assert faq.get_attribute("open") is not None
                image = page.locator("main img").first
                image.scroll_into_view_if_needed()
                assert image.evaluate("(el)=>el.complete && el.naturalWidth > 0")
            if width == 390 and route == "/blog":
                button = page.get_by_role("button", name="Open navigation", exact=True)
                button.click()
                assert button.get_attribute("aria-expanded") == "true"
                button.click()
            if (route == "/blog/how-to-make-flying-entrance-ai-video" and width in (390,1280)) or (width == 390 and route in ("/blog","/examples/ai-smalltown-boy")):
                page.evaluate("window.scrollTo(0,0)")
                filename = output / (route.strip("/").replace("/","-") + f"-{width}.png")
                page.screenshot(path=str(filename), full_page=True)
                results["screenshots"].append(str(filename))
            results["viewports"].append({"route":route,"width":width,"status":"pass"})
    browser.close()
assert not errors, errors
(output / "results.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"PASS: 12 project/tutorial pairs, {len(results['coverage'])} new articles, {len(results['viewports'])} responsive page checks; no browser exceptions.")
