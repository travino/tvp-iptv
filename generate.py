#!/usr/bin/env python3
"""
TVP M3U generator — runs in GitHub Actions, writes tvp.m3u
"""

import json
import sys
import urllib.request

CHANNELS = [
    {
        "code":  "tvp1hd",
        "name":  "TVP 1 HD",
        "logo":  "https://s.tvp.pl/files/tvp.pl/images/vod-logo-header.png",
        "group": "Polska",
    },
    {
        "code":  "tvp2hd",
        "name":  "TVP 2 HD",
        "logo":  "https://s.tvp.pl/files/tvp.pl/images/vod-logo-header.png",
        "group": "Polska",
    },
    # Uncomment to add more:
     {"code": "tvpinfo",    "name": "TVP Info",     "logo": "https://s.tvp.pl/files/tvp.pl/images/vod-logo-header.png", "group": "Polska"},
    # {"code": "tvpkultura", "name": "TVP Kultura",  "logo": "", "group": "Polska"},
     {"code": "tvpsport",   "name": "TVP Sport",    "logo": "https://s.tvp.pl/files/tvp.pl/images/vod-logo-header.png", "group": "Polska"},
    # {"code": "tvppolonia", "name": "TVP Polonia",  "logo": "", "group": "Polska"},
    # {"code": "tvpworld",   "name": "TVP World",    "logo": "", "group": "Polska"},
    # {"code": "tvphistoria","name": "TVP Historia", "logo": "", "group": "Polska"},
     {"code": "tvpdokument","name": "TVP Dokument", "logo": "https://s.tvp.pl/files/tvp.pl/images/vod-logo-header.png", "group": "Polska"},
]

STREAM_DATA_URL = "https://tvpstream.tvp.pl/api/tvp-stream/stream/data?station_code={code}"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": "https://vod.tvp.pl/",
    "Accept":  "application/json, */*",
}

MIME_PRIORITY = [
    "application/x-mpegurl",
    "video/mp2t",
    "application/dash+xml",
    "application/vnd.ms-ss",
    "video/mp4",
]


def fetch_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def best_format(formats):
    ranked = []
    for fmt in formats:
        mime    = fmt.get("mimeType", "")
        url     = fmt.get("url", "")
        bitrate = int(fmt.get("totalBitrate", 0))
        if not url or "material_niedostepny" in url:
            continue
        try:
            prio = MIME_PRIORITY.index(mime)
        except ValueError:
            prio = len(MIME_PRIORITY)
        ranked.append((prio, -bitrate, fmt))
    ranked.sort(key=lambda x: (x[0], x[1]))
    return ranked[0][2] if ranked else None


def get_stream_url(code):
    try:
        step1     = fetch_json(STREAM_DATA_URL.format(code=code))
        inner_url = step1.get("data", {}).get("stream_url")
        if not inner_url:
            return None
        step2 = fetch_json(inner_url)
        fmt   = best_format(step2.get("formats", []))
        return fmt["url"] if fmt else None
    except Exception as e:
        print(f"  [!] {code}: {e}", file=sys.stderr)
        return None


def main():
    lines = ["#EXTM3U"]
    ok    = 0

    for ch in CHANNELS:
        print(f"Fetching {ch['name']} …", file=sys.stderr)
        url = get_stream_url(ch["code"])
        if url:
            lines.append(
                f'#EXTINF:-1 tvg-id="{ch["code"]}" '
                f'tvg-name="{ch["name"]}" '
                f'tvg-logo="{ch["logo"]}" '
                f'group-title="{ch["group"]}",{ch["name"]}\n'
                f'{url}'
            )
            ok += 1
            print(f"  ✓ {url[:80]}…", file=sys.stderr)
        else:
            print(f"  ✗ skipped", file=sys.stderr)

    out = "\n\n".join(lines) + "\n"
    with open("tvp.m3u", "w", encoding="utf-8") as f:
        f.write(out)

    print(f"\nDone: {ok}/{len(CHANNELS)} streams written to tvp.m3u", file=sys.stderr)
    if ok == 0:
        sys.exit(1)   # fail the Action if nothing worked


if __name__ == "__main__":
    main()
