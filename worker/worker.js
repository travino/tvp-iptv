/**
 * TVP + YouTube Live Stream Worker
 * Deploy to Cloudflare Workers (free tier: 100k req/day)
 *
 * Routes:
 *   /playlist.m3u    → all channels combined
 *   /tvp1.m3u        → TVP 1 HD
 *   /tvp2.m3u        → TVP 2 HD
 *   /tvpinfo.m3u     → TVP Info
 *   /tvpsport.m3u    → TVP Sport
 *   /tvpkultura.m3u  → TVP Kultura
 *   /tvpdokument.m3u → TVP Dokument
 *   /tvpnauka.m3u    → TVP Nauka
 *   /tvprozrywka.m3u → TVP Rozrywka
 *   /tvphistoria.m3u → TVP Historia
 *   /wpolsce24.m3u   → wPolsce24 (via YouTube live)
 *   /republika.m3u   → Telewizja Republika (via YouTube live)
 *
 * Caching strategy:
 *   - scheduled() pre-fetches all stream URLs and stores them in the
 *     Cloudflare Cache API under a stable internal key (TTL = CACHE_TTL).
 *   - fetch() reads from cache first; on a miss (cold start, expired entry,
 *     or a failed cron run) it falls back to a live API call and re-caches.
 *
 *   CACHE_TTL MUST stay below TVP's signed-token lifetime (~15–30 min) or the
 *   worker will happily serve a token that TVP has already invalidated. 10 min
 *   leaves comfortable headroom; the cron trigger should run at a similar
 *   cadence (e.g. every 10 min in wrangler.toml) so most requests are warm:
 *       [triggers]
 *       crons = ["*\/10 * * * *"]
 */

// ---------------------------------------------------------------------------
// Channel definitions
// ---------------------------------------------------------------------------

const TVP_LOGO = "https://s.tvp.pl/files/tvp.pl/images/vod-logo-header.png";

const TVP_CHANNELS = [
  { id: "399697", slug: "tvp1",        name: "TVP 1 HD",     logo: TVP_LOGO, group: "Polska" },
  { id: "399698", slug: "tvp2",        name: "TVP 2 HD",     logo: TVP_LOGO, group: "Polska" },
  { id: "399699", slug: "tvpinfo",     name: "TVP Info",     logo: TVP_LOGO, group: "Polska" },
  { id: "399702", slug: "tvpsport",    name: "TVP Sport",    logo: TVP_LOGO, group: "Polska" },
  { id: "399700", slug: "tvpkultura",  name: "TVP Kultura",  logo: TVP_LOGO, group: "Polska" },
  { id: "399721", slug: "tvpdokument", name: "TVP Dokument", logo: TVP_LOGO, group: "Polska" },
  { id: "399722", slug: "tvpnauka",    name: "TVP Nauka",    logo: TVP_LOGO, group: "Polska" },
  { id: "399724", slug: "tvprozrywka", name: "TVP Rozrywka", logo: TVP_LOGO, group: "Polska" },
  { id: "399703", slug: "tvphistoria", name: "TVP Historia", logo: TVP_LOGO, group: "Polska" },
];

// YouTube-sourced channels.
// `liveUrl` is the channel's persistent /live page — resolved at request time
// to whatever broadcast is currently live, so a stream restart on YouTube's
// side never breaks the playlist.
const YOUTUBE_CHANNELS = [
  {
    slug:    "wpolsce24",
    name:    "wPolsce24",
    logo:    "https://wpolsce24.tv/favicon.ico",
    group:   "Polska",
    liveUrl: "https://www.youtube.com/@TelewizjawPolsce24/live",
  },
  {
    slug:    "republika",
    name:    "Telewizja Republika",
    logo:    "https://tvrepublika.pl/favicon.ico",
    group:   "Polska",
    liveUrl: "https://www.youtube.com/@Telewizja_Republika/live",
  },
];

const ALL_CHANNELS = [...TVP_CHANNELS, ...YOUTUBE_CHANNELS];

// ---------------------------------------------------------------------------
// Cache config
// ---------------------------------------------------------------------------

const CACHE_KEY_PREFIX = "https://tvpi-cache/stream/";
// Keep this BELOW TVP's token lifetime (~15–30 min). 600 s = 10 min gives a
// safe margin even against the shortest tokens TVP issues. If you still see
// occasional drops, lower it further (e.g. 300).
const CACHE_TTL = 600; // seconds

// ---------------------------------------------------------------------------
// TVP API
// ---------------------------------------------------------------------------

const TVP_API_URL =
  "https://vod.tvp.pl/api/products/{id}/videos/playlist?platform=BROWSER&videoType=LIVE";

const TVP_FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Referer: "https://vod.tvp.pl/",
  Accept: "application/json, */*",
};

async function fetchTvpStreamUrl(channelId) {
  try {
    const res = await fetch(TVP_API_URL.replace("{id}", channelId), {
      headers: TVP_FETCH_HEADERS,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.sources?.HLS?.[0]?.src ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// YouTube — resolve a channel /live page to the current live video ID,
// then fetch the HLS manifest via the innertube API.
//
// NOTE: YouTube frequently bot-walls datacenter IPs (Cloudflare Workers
// included). This is best-effort: on failure the resolver returns null and
// the channel falls back to its last cached/committed value.
// ---------------------------------------------------------------------------

const YT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

// Scrape the current live video ID from a channel's /live HTML page.
async function resolveLiveVideoId(liveUrl) {
  try {
    const res = await fetch(liveUrl, { headers: YT_HEADERS });
    if (!res.ok) return null;
    const html = await res.text();

    // The live video ID appears in several places in the page markup.
    const patterns = [
      /"videoId":"([\w-]{11})"/,
      /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})">/,
      /watch\?v=([\w-]{11})/,
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m) return m[1];
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchYouTubeStreamUrl(videoId) {
  try {
    const body = JSON.stringify({
      context: {
        client: {
          clientName: "WEB",
          clientVersion: "2.20240101.00.00",
          hl: "en",
        },
      },
      videoId,
    });

    const res = await fetch(
      "https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": YT_HEADERS["User-Agent"],
          "X-YouTube-Client-Name": "1",
          "X-YouTube-Client-Version": "2.20240101.00.00",
        },
        body,
      }
    );

    if (!res.ok) return null;
    const data = await res.json();

    // Live streams expose an HLS manifest URL in streamingData.hlsManifestUrl
    const hlsUrl = data?.streamingData?.hlsManifestUrl;
    if (hlsUrl) return hlsUrl;

    // Fallback: look in adaptiveFormats for an m3u8 format
    const formats = data?.streamingData?.adaptiveFormats ?? [];
    const m3u8 = formats.find(
      (f) => f.url && (f.mimeType?.includes("x-mpegURL") || f.url.includes(".m3u8"))
    );
    return m3u8?.url ?? null;
  } catch {
    return null;
  }
}

// Resolve a YouTube channel (/live URL) to its current HLS manifest URL.
async function fetchYouTubeChannelStreamUrl(liveUrl) {
  const videoId = await resolveLiveVideoId(liveUrl);
  if (!videoId) return null;
  return fetchYouTubeStreamUrl(videoId);
}

// ---------------------------------------------------------------------------
// Unified stream URL resolver
// ---------------------------------------------------------------------------

async function fetchStreamUrlFromSource(ch) {
  if (ch.id) {
    // TVP channel
    return fetchTvpStreamUrl(ch.id);
  }
  if (ch.liveUrl) {
    // YouTube channel
    return fetchYouTubeChannelStreamUrl(ch.liveUrl);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

async function readFromCache(slug) {
  const cache = caches.default;
  const cached = await cache.match(new Request(CACHE_KEY_PREFIX + slug));
  if (!cached) return null;
  const text = await cached.text();
  return text || null;
}

async function writeToCache(slug, url) {
  const cache = caches.default;
  const response = new Response(url, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": `public, max-age=${CACHE_TTL}`,
    },
  });
  await cache.put(new Request(CACHE_KEY_PREFIX + slug), response);
}

// ---------------------------------------------------------------------------
// Resolve a stream URL: cache → live fallback
// ---------------------------------------------------------------------------

async function getStreamUrl(ch) {
  const cached = await readFromCache(ch.slug);
  if (cached) return { url: cached, fromCache: true };

  const url = await fetchStreamUrlFromSource(ch);
  if (url) {
    await writeToCache(ch.slug, url);
  }
  return { url, fromCache: false };
}

// ---------------------------------------------------------------------------
// Pre-cache all channels (called by the cron trigger)
// ---------------------------------------------------------------------------

async function refreshAllStreams() {
  const results = await Promise.all(
    ALL_CHANNELS.map(async (ch) => {
      const url = await fetchStreamUrlFromSource(ch);
      if (url) {
        await writeToCache(ch.slug, url);
        console.log(`[cron] cached ${ch.slug}: ${url.slice(0, 60)}…`);
        return true;
      } else {
        console.warn(`[cron] failed to fetch ${ch.slug}`);
        return false;
      }
    })
  );

  const ok = results.filter(Boolean).length;
  console.log(`[cron] refreshed ${ok}/${ALL_CHANNELS.length} streams`);
}

// ---------------------------------------------------------------------------
// M3U builder
// ---------------------------------------------------------------------------

function buildM3U(entries) {
  const lines = ["#EXTM3U"];
  for (const { ch, url } of entries) {
    const tvgId = ch.id ?? ch.slug;
    lines.push(
      `#EXTINF:-1 tvg-id="${tvgId}" tvg-name="${ch.name}" tvg-logo="${ch.logo}" group-title="${ch.group}",${ch.name}`,
      url
    );
  }
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Worker entry point
// ---------------------------------------------------------------------------

export default {
  async fetch(request) {
    const path = new URL(request.url).pathname.replace(/\/$/, "") || "/";

    let targets;
    if (path === "/" || path === "/playlist.m3u") {
      targets = ALL_CHANNELS;
    } else {
      const slug = path.replace(/^\//, "").replace(/\.m3u$/, "");
      const ch = ALL_CHANNELS.find((c) => c.slug === slug);
      if (!ch) {
        return new Response(
          "Not found.\n\nAvailable:\n" +
            ["/playlist.m3u", ...ALL_CHANNELS.map((c) => `/${c.slug}.m3u`)].join("\n") +
            "\n",
          { status: 404 }
        );
      }
      targets = [ch];
    }

    const results = await Promise.all(
      targets.map(async (ch) => {
        const { url, fromCache } = await getStreamUrl(ch);
        return { ch, url, fromCache };
      })
    );

    const valid = results.filter((r) => r.url !== null);

    if (valid.length === 0) {
      return new Response("Could not fetch any stream URLs.\n", { status: 503 });
    }

    const hitSlugs  = valid.filter((r) =>  r.fromCache).map((r) => r.ch.slug);
    const missSlugs = valid.filter((r) => !r.fromCache).map((r) => r.ch.slug);

    return new Response(buildM3U(valid), {
      headers: {
        "Content-Type": "application/x-mpegurl",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
        "X-Cache-Hit":  hitSlugs.join(",")  || "none",
        "X-Cache-Miss": missSlugs.join(",") || "none",
      },
    });
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(refreshAllStreams());
  },
};
