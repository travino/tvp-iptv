# TVP Live IPTV — M3U playlists

Live TVP channels as ready-to-use M3U playlists. Two ways to consume them —
pick one as your primary:

| Source | URL base | Refresh | Best for |
|--------|----------|---------|----------|
| **Cloudflare Worker** (recommended) | `https://tvpi.travny.workers.dev` | request-time, self-healing | never serves a stale token |
| **Raw GitHub file** (backup mirror) | `https://raw.githubusercontent.com/travino/tvpi/main/streams/` | every 15 min via Actions | offline/no-Worker fallback |

> Why two? TVP signs each HLS URL with a short (~15–30 min) token. The Worker
> resolves URLs **when your player asks**, so it can't hand out an expired one.
> The raw git file is a static snapshot refreshed on a timer — simpler, but a
> token can expire before the next refresh lands, which shows up as a channel
> that works then drops then recovers. Use the Worker if you can.

## Combined playlist (all channels)

| | Worker (recommended) | Raw mirror |
|---|---|---|
| **All channels** | [`playlist.m3u`](https://tvpi.travny.workers.dev/playlist.m3u) | [`playlist.m3u`](https://raw.githubusercontent.com/travino/tvpi/main/streams/playlist.m3u) |

## Channels

The **Status** badge pings the Worker endpoint live, so it reflects whether the
service is currently responding for that channel.

| Logo | Channel | Worker | Raw mirror | Status |
|:---:|---|:---:|:---:|:---:|
| <img src="https://www.google.com/s2/favicons?domain=tvp.pl&sz=64" width="22" height="22"> | **TVP 1 HD** | [m3u](https://tvpi.travny.workers.dev/tvp1.m3u) | [m3u](https://raw.githubusercontent.com/travino/tvpi/main/streams/tvp1.m3u) | ![status](https://img.shields.io/website?url=https%3A%2F%2Ftvpi.travny.workers.dev%2Ftvp1.m3u&up_message=online&down_message=offline&label=) |
| <img src="https://www.google.com/s2/favicons?domain=tvp.pl&sz=64" width="22" height="22"> | **TVP 2 HD** | [m3u](https://tvpi.travny.workers.dev/tvp2.m3u) | [m3u](https://raw.githubusercontent.com/travino/tvpi/main/streams/tvp2.m3u) | ![status](https://img.shields.io/website?url=https%3A%2F%2Ftvpi.travny.workers.dev%2Ftvp2.m3u&up_message=online&down_message=offline&label=) |
| <img src="https://www.google.com/s2/favicons?domain=tvp.info&sz=64" width="22" height="22"> | **TVP Info** | [m3u](https://tvpi.travny.workers.dev/tvpinfo.m3u) | [m3u](https://raw.githubusercontent.com/travino/tvpi/main/streams/tvpinfo.m3u) | ![status](https://img.shields.io/website?url=https%3A%2F%2Ftvpi.travny.workers.dev%2Ftvpinfo.m3u&up_message=online&down_message=offline&label=) |
| <img src="https://www.google.com/s2/favicons?domain=sport.tvp.pl&sz=64" width="22" height="22"> | **TVP Sport** | [m3u](https://tvpi.travny.workers.dev/tvpsport.m3u) | [m3u](https://raw.githubusercontent.com/travino/tvpi/main/streams/tvpsport.m3u) | ![status](https://img.shields.io/website?url=https%3A%2F%2Ftvpi.travny.workers.dev%2Ftvpsport.m3u&up_message=online&down_message=offline&label=) |
| <img src="https://www.google.com/s2/favicons?domain=kultura.tvp.pl&sz=64" width="22" height="22"> | **TVP Kultura** | [m3u](https://tvpi.travny.workers.dev/tvpkultura.m3u) | [m3u](https://raw.githubusercontent.com/travino/tvpi/main/streams/tvpkultura.m3u) | ![status](https://img.shields.io/website?url=https%3A%2F%2Ftvpi.travny.workers.dev%2Ftvpkultura.m3u&up_message=online&down_message=offline&label=) |
| <img src="https://www.google.com/s2/favicons?domain=dokument.tvp.pl&sz=64" width="22" height="22"> | **TVP Dokument** | [m3u](https://tvpi.travny.workers.dev/tvpdokument.m3u) | [m3u](https://raw.githubusercontent.com/travino/tvpi/main/streams/tvpdokument.m3u) | ![status](https://img.shields.io/website?url=https%3A%2F%2Ftvpi.travny.workers.dev%2Ftvpdokument.m3u&up_message=online&down_message=offline&label=) |
| <img src="https://www.google.com/s2/favicons?domain=nauka.tvp.pl&sz=64" width="22" height="22"> | **TVP Nauka** | [m3u](https://tvpi.travny.workers.dev/tvpnauka.m3u) | [m3u](https://raw.githubusercontent.com/travino/tvpi/main/streams/tvpnauka.m3u) | ![status](https://img.shields.io/website?url=https%3A%2F%2Ftvpi.travny.workers.dev%2Ftvpnauka.m3u&up_message=online&down_message=offline&label=) |
| <img src="https://www.google.com/s2/favicons?domain=rozrywka.tvp.pl&sz=64" width="22" height="22"> | **TVP Rozrywka** | [m3u](https://tvpi.travny.workers.dev/tvprozrywka.m3u) | [m3u](https://raw.githubusercontent.com/travino/tvpi/main/streams/tvprozrywka.m3u) | ![status](https://img.shields.io/website?url=https%3A%2F%2Ftvpi.travny.workers.dev%2Ftvprozrywka.m3u&up_message=online&down_message=offline&label=) |
| <img src="https://www.google.com/s2/favicons?domain=historia.tvp.pl&sz=64" width="22" height="22"> | **TVP Historia** | [m3u](https://tvpi.travny.workers.dev/tvphistoria.m3u) | [m3u](https://raw.githubusercontent.com/travino/tvpi/main/streams/tvphistoria.m3u) | ![status](https://img.shields.io/website?url=https%3A%2F%2Ftvpi.travny.workers.dev%2Ftvphistoria.m3u&up_message=online&down_message=offline&label=) |

> **Tip:** the [jsDelivr CDN mirror](https://www.jsdelivr.com/github) can be
> more reliable than raw.githubusercontent.com:
> ```
> https://cdn.jsdelivr.net/gh/travino/tvpi@main/streams/playlist.m3u
> ```
> Note jsDelivr caches aggressively, which works against short-lived tokens —
> prefer the raw URL or the Worker if you see stale streams.

## How it works

The raw-file path:

1. **GitHub Actions** runs `generate.py` every 15 minutes (cron schedule).
2. The script calls the TVP API for fresh signed HLS token URLs.
3. On any transient failure it reuses that channel's last-known-good URL rather
   than overwriting it with a placeholder, then writes/commits `streams/*.m3u`.
4. Your player fetches the raw file.

```
GitHub Actions (every 15 min)
        │
        ▼
   vod.tvp.pl API  ──►  signed HLS token URL  (TTL ~15–30 min)
        │
        ▼
   streams/*.m3u committed to repo
        │
        ▼
  raw.githubusercontent.com/…/streams/playlist.m3u
        │
        ▼
   Your IPTV player 🎬
```

The Worker path skips the commit entirely: it resolves the URL when your player
requests it (cache → live fallback), caching each result for under TVP's token
lifetime so it's always fresh.

## Setup

1. Fork or push this repo to your GitHub account.
2. Actions run automatically — no secrets or extra config needed.
3. After the first run (up to 15 min), grab a raw URL and add it to your player,
   or deploy `worker/worker.js` to Cloudflare Workers and use the Worker URL.

## Tested players

- VLC
- Kodi (PVR IPTV Simple Client)
- TiviMate
- Televizo
- GSE Smart IPTV

## Notes

- Logos in the table are channel-site favicons fetched at render time; the
  **Status** badges ping the Worker live via shields.io and may take a moment to
  refresh due to badge caching.
- TVP token TTL is ~15–30 min; the 15-min refresh keeps the raw files mostly
  valid, but GitHub may delay scheduled runs under load — the Worker is the only
  path that's fully immune to token expiry.
- If `generate.py` can't get a fresh URL **and** has no cached one for a channel,
  it writes a placeholder stub so the rest of the playlist still builds.
