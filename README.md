# TVP Live IPTV — M3U playlists

Live TVP (+ a couple of YouTube-sourced) channels as ready-to-use M3U
playlists. Two ways to consume them — pick one as your primary:

| Source | URL base | Refresh | Best for |
|--------|----------|---------|----------|
| **Cloudflare Worker** (recommended) | `https://tvpi.travny.workers.dev` | request-time, self-healing | TVP — never serves a stale token |
| **Raw GitHub file** (backup mirror) | `https://raw.githubusercontent.com/travino/tvpi/main/streams/` | every 15 min via Actions | offline/no-Worker fallback |

> Why two? TVP signs each HLS URL with a short (~15–30 min) token. The Worker
> resolves URLs **when your player asks**, so it can't hand out an expired one.
> The raw git file is a static snapshot refreshed on a timer — simpler, but a
> token can expire before the next refresh lands, which shows up as a channel
> that works then drops then recovers. Use the Worker for TVP if you can.

## Player URLs

### Cloudflare Worker (recommended)

```
https://tvpi.travny.workers.dev/playlist.m3u
```

Per-channel:

- [playlist (all)](https://tvpi.travny.workers.dev/playlist.m3u)
- [tvp1](https://tvpi.travny.workers.dev/tvp1.m3u)
- [tvp2](https://tvpi.travny.workers.dev/tvp2.m3u)
- [tvpinfo](https://tvpi.travny.workers.dev/tvpinfo.m3u)
- [tvpsport](https://tvpi.travny.workers.dev/tvpsport.m3u)
- [tvpkultura](https://tvpi.travny.workers.dev/tvpkultura.m3u)
- [tvpdokument](https://tvpi.travny.workers.dev/tvpdokument.m3u)
- [tvpnauka](https://tvpi.travny.workers.dev/tvpnauka.m3u)
- [tvprozrywka](https://tvpi.travny.workers.dev/tvprozrywka.m3u)
- [tvphistoria](https://tvpi.travny.workers.dev/tvphistoria.m3u)

### Raw GitHub file (backup)

```
https://raw.githubusercontent.com/travino/tvpi/main/streams/playlist.m3u
```

> **Tip:** the [jsDelivr CDN mirror](https://www.jsdelivr.com/github) can be
> more reliable than raw.githubusercontent.com:
> ```
> https://cdn.jsdelivr.net/gh/travino/tvpi@main/streams/playlist.m3u
> ```
> Note jsDelivr caches aggressively, which works against short-lived tokens —
> prefer the raw URL or the Worker if you see stale streams.

Per-channel raw files: `…/streams/<slug>.m3u`, e.g.
[playlist.m3u](https://raw.githubusercontent.com/travino/tvpi/main/streams/playlist.m3u),
[tvp1.m3u](https://raw.githubusercontent.com/travino/tvpi/main/streams/tvp1.m3u),
[tvp2.m3u](https://raw.githubusercontent.com/travino/tvpi/main/streams/tvp2.m3u),
[tvpsport.m3u](https://raw.githubusercontent.com/travino/tvpi/main/streams/tvpsport.m3u).

## Channels

| Slug | Name | Source |
|------|------|--------|
| tvp1 | TVP 1 HD | TVP API |
| tvp2 | TVP 2 HD | TVP API |
| tvpinfo | TVP Info | TVP API |
| tvpsport | TVP Sport | TVP API |
| tvpkultura | TVP Kultura | TVP API |
| tvpdokument | TVP Dokument | TVP API |
| tvpnauka | TVP Nauka | TVP API |
| tvprozrywka | TVP Rozrywka | TVP API |
| tvphistoria | TVP Historia | TVP API |
| wpolsce24 | wPolsce24 | YouTube (yt-dlp) |
| republika | Telewizja Republika | YouTube (yt-dlp) |

## How it works

The raw-file path:

1. **GitHub Actions** runs `generate.py` every 15 minutes (cron schedule).
2. The script calls the TVP API for fresh signed HLS token URLs, and runs
   yt-dlp against the two YouTube channels' `/live` pages.
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
2. Actions run automatically — no secrets or extra config needed for TVP.
3. After the first run (up to 15 min), grab a raw URL and add it to your player,
   or deploy `worker/worker.js` to Cloudflare Workers and use the Worker URL.

## Tested players

- VLC
- Kodi (PVR IPTV Simple Client)
- TiviMate
- Televizo
- GSE Smart IPTV

## Notes

- TVP token TTL is ~15–30 min; the 15-min refresh keeps the raw files mostly
  valid, but GitHub may delay scheduled runs under load — the Worker is the only
  path that's fully immune to token expiry.
- The two **YouTube channels are unreliable from GitHub Actions**: YouTube
  bot-walls datacenter IPs, so yt-dlp often gets "Sign in to confirm you're not
  a bot." When that happens the channel keeps its last-known-good URL until a run
  succeeds. To make them reliable, pass authenticated cookies to yt-dlp
  (`--cookies`) via a repo secret, or route through a residential proxy.
- If `generate.py` can't get a fresh URL **and** has no cached one for a channel,
  it writes a placeholder stub so the rest of the playlist still builds.
