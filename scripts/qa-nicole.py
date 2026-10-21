from playwright.sync_api import sync_playwright
import json
import os
from pathlib import Path

BASE = os.environ.get("NICOLE_BASE_URL", "http://localhost:4317")
ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get("NICOLE_QA_OUTPUT", str(ROOT / "docs" / "qa" / "nicole")))
EVIDENCE = ROOT / "docs" / "qa" / "nicole"
EVIDENCE.mkdir(parents=True, exist_ok=True)
results = {"widths": [], "interactions": {}}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for width in (320, 390, 768, 1280):
        page = browser.new_page(viewport={"width": width, "height": 900})
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.goto(BASE + "/examples/i-feel-like-nicole-ai-video", wait_until="networkidle")
        assert not page.evaluate("document.documentElement.scrollWidth > innerWidth")
        assert page.locator('input[type="file"]').count() == 1
        assert page.locator('a[href="/pricing"]').count() >= 3
        if width <= 390:
            assert page.locator(".hero-copy").bounding_box()["y"] < page.locator(".hero-media").bounding_box()["y"]
        video = page.locator("video").first
        before = video.evaluate("v => v.currentTime")
        video.evaluate("v => v.play()")
        page.wait_for_timeout(1200)
        after = video.evaluate("v => v.currentTime")
        assert after > before
        results["widths"].append(width)
        page.screenshot(path=str(OUT / f"nicole-{width}.png"), full_page=True)
        print(width, page.title(), "errors", len(errors))
        page.close()
    page = browser.new_page(viewport={"width": 390, "height": 900})
    page.goto(BASE + "/blog/how-to-make-i-feel-like-nicole-ai-video", wait_until="networkidle")
    assert not page.evaluate("document.documentElement.scrollWidth > innerWidth")
    assert page.locator('.guide-note a[href="/examples/i-feel-like-nicole-ai-video"]').count() == 1
    prompt = page.locator("#nicole-prompt").inner_text()
    page.get_by_role("button", name="Copy prompt").click()
    assert page.locator("[role=status]").count() >= 1
    page.screenshot(path=str(OUT / "nicole-guide-390.png"), full_page=True)
    results["interactions"]["copy_prompt"] = len(prompt) > 80
    page.close()
    page = browser.new_page(viewport={"width": 390, "height": 900})
    page.goto(BASE + "/examples/i-feel-like-nicole-ai-video", wait_until="networkidle")
    page.locator(".video-project-toggle").click()
    assert page.locator(".video-project-menu").is_visible()
    photo = str(ROOT / "public" / "assets" / "i-feel-like-nicole" / "take-girl.webp")
    inp = page.locator('input[type="file"]')
    inp.set_input_files(photo)
    page.wait_for_timeout(500)
    assert page.locator("[data-photo-result]").is_visible()
    inp.set_input_files({"name": "bad.txt", "mimeType": "text/plain", "buffer": b"not an image"})
    assert "image" in page.locator("[data-photo-status]").inner_text().lower() or "choose" in page.locator("[data-photo-status]").inner_text().lower()
    inp.set_input_files(photo)
    page.wait_for_timeout(500)
    page.locator("[data-photo-remove]").click()
    assert page.locator("[data-photo-result]").is_hidden()
    results["interactions"].update({"mobile_menu": True, "photo_replace_remove": True, "invalid_file": True})
    page.close()
    EVIDENCE.joinpath("results.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    browser.close()
print("PASS: Nicole responsive pages and screenshots")
