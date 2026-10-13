#!/usr/bin/env python3
"""Verilen Instagram hesabındaki tüm reels videolarını tarayıcıda sırayla açar ve izler.

Kurulum:
    pip install playwright
    playwright install chromium

Kullanım:
    python tools/instagram_reels_player.py                      # adres sorulur
    python tools/instagram_reels_player.py https://www.instagram.com/kullanici/
    python tools/instagram_reels_player.py kullanici --max 20 --sound

İlk çalıştırmada açılan tarayıcıda Instagram'a giriş yapın; oturum
`.ig_profile/` klasöründe saklanır, sonraki çalıştırmalarda tekrar giriş gerekmez.
Not: Otomasyon Instagram kullanım koşullarına aykırı olabilir; kendi sorumluluğunuzda kullanın.
"""
import argparse
import re
import sys
from pathlib import Path

from playwright.sync_api import TimeoutError as PWTimeout
from playwright.sync_api import sync_playwright

PROFILE_DIR = Path(__file__).parent / ".ig_profile"
MAX_WATCH_SECONDS = 180  # tek bir reel için üst sınır


def extract_username(value: str) -> str:
    value = value.strip()
    m = re.search(r"instagram\.com/([A-Za-z0-9._]+)", value)
    name = m.group(1) if m else value.lstrip("@").strip("/")
    if not re.fullmatch(r"[A-Za-z0-9._]+", name or ""):
        sys.exit("Geçersiz Instagram adresi / kullanıcı adı.")
    return name


def collect_reel_links(page, username: str, limit: int) -> list[str]:
    page.goto(f"https://www.instagram.com/{username}/reels/", wait_until="domcontentloaded")
    page.wait_for_timeout(4000)
    links: dict[str, None] = {}
    stale = 0
    while stale < 4 and len(links) < limit:
        hrefs = page.eval_on_selector_all(
            "a[href*='/reel/']", "els => els.map(e => e.href.split('?')[0])"
        )
        before = len(links)
        for h in hrefs:
            links.setdefault(h)
        stale = stale + 1 if len(links) == before else 0
        page.mouse.wheel(0, 4000)
        page.wait_for_timeout(1500)
    return list(links)[:limit]


def watch(page, url: str, sound: bool) -> None:
    page.goto(url, wait_until="domcontentloaded")
    try:
        page.wait_for_selector("video", timeout=15000)
    except PWTimeout:
        print("  video bulunamadı, atlanıyor")
        return
    duration = page.evaluate(
        """async (sound) => {
            const v = document.querySelector('video');
            v.muted = !sound;
            try { await v.play(); } catch (e) {}
            if (!isFinite(v.duration)) {
                await new Promise(r => v.addEventListener('loadedmetadata', r, {once: true}));
            }
            return v.duration;
        }""",
        sound,
    )
    wait = min(float(duration or 15), MAX_WATCH_SECONDS)
    print(f"  izleniyor ({wait:.0f} sn)")
    page.wait_for_timeout(int(wait * 1000) + 500)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("account", nargs="?", help="Instagram profil adresi veya kullanıcı adı")
    ap.add_argument("--max", type=int, default=200, help="izlenecek en fazla reel sayısı")
    ap.add_argument("--sound", action="store_true", help="sesi açık tut")
    args = ap.parse_args()

    account = args.account or input("Instagram hesap adresi (örn. https://www.instagram.com/kullanici/): ")
    username = extract_username(account)

    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            str(PROFILE_DIR),
            headless=False,
            viewport={"width": 1100, "height": 900},
            args=["--autoplay-policy=no-user-gesture-required"],
        )
        page = ctx.pages[0] if ctx.pages else ctx.new_page()

        page.goto("https://www.instagram.com/", wait_until="domcontentloaded")
        if page.locator("input[name='username']").count():
            input("Tarayıcıda Instagram'a giriş yapın, sonra buraya dönüp Enter'a basın... ")

        print(f"@{username} reels listesi toplanıyor...")
        links = collect_reel_links(page, username, args.max)
        if not links:
            print("Hiç reel bulunamadı (hesap gizli olabilir ya da giriş gerekiyor).")
            ctx.close()
            return
        print(f"{len(links)} reel bulundu.")

        for i, url in enumerate(links, 1):
            print(f"[{i}/{len(links)}] {url}")
            try:
                watch(page, url, args.sound)
            except Exception as e:  # tek bir reel hatası döngüyü durdurmasın
                print(f"  hata: {e}")

        print("Tamamlandı.")
        ctx.close()


if __name__ == "__main__":
    main()
