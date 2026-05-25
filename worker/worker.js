/**
 * TVP Live Stream Worker
 * Deploy to Cloudflare Workers (free tier: 100k req/day)
 *
 * Routes:
 *   /tvp.m3u         → all channels combined
 *   /tvp1.m3u        → TVP 1 HD
 *   /tvp2.m3u        → TVP 2 HD
 *   /tvpinfo.m3u     → TVP Info
 *   /tvpsport.m3u    → TVP Sport
 *   /tvpkultura.m3u  → TVP Kultura
 *   /tvpdokument.m3u → TVP Dokument
 *   /tvpnauka.m3u    → TVP Nauka
 *   /tvprozrywka.m3u → TVP Rozrywka
 *   /tvphistoria.m3u → TVP Historia
 */

const CHANNELS = [
  {
    id:    "399697",
    slug:  "tvp1",
    name:  "TVP 1 HD",
    logo:  "https://s.tvp.pl/files/tvp.pl/images/vod-logo-header.png",
    group: "Polska",
  },
  {
    id:    "399698",
    slug:  "tvp2",
    name:  "TVP 2 HD",
    logo:  "https://s.tvp.pl/files/tvp.pl/images/vod-logo-header.png",
    group: "Polska",
  },
  {
    id:    "399699",
    slug:  "tvpinfo",
    name:  "TVP Info",
    logo:  "https://s.tvp.pl/files/tvp.pl/images/vod-logo-header.png",
    group: "Polska",
  },
  {
    id:    "399702",
    slug:  "tvpsport",
    name:  "TVP Sport",
    logo:  "https://s.tvp.pl/files/tvp.pl/images/vod-logo-header.png",
    group: "Polska",
  },
  {
    id:    "399700",
    slug:  "tvpkultura",
    name:  "TVP Kultura",
    logo:  "https://s.tvp.pl/files/tvp.pl/images/vod-logo-header.png",
    group: "Polska",
  },
  {
    id:    "399721",
    slug:  "tvpdokument",
    name:  "TVP Dokument",
    logo:  "https://s.tvp.pl/files/tvp.pl/images/vod-logo-header.png",
    group: "Polska",
  },
  {
    id:    "399722",
    slug:  "tvpnauka",
    name:  "TVP Nauka",
    logo:  "https://s.tvp.pl/files/tvp.pl/images/vod-logo-header.png",
    group: "Polska",
  },
  {
    id:    "399724",
    slug:  "tvprozrywka",
    name:  "TVP Rozrywka",
    logo:  "https://s.tvp.pl/files/tvp.pl/images/vod-logo-header.png",
    group: "Polska",
  },
  {
    id:    "399703",
    slug:  "tvphistoria",
    name:  "TVP Historia",
    logo:  "https://s.tvp.pl/files/tvp.pl/images/vod-logo-header.png",
    group: "Polska",
  },
];

const API_URL =
  "https://vod.tvp.pl/api/products/{id}/videos/playlist?platform=BROWSER&videoType=LIVE";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Referer: "https://vod.tvp.pl/",
  Accept: "application/json, */*",
};

async function getStreamUrl(channelId) {
  try {
    const res = await fetch(API_URL.replace("{id}", channelId), {
      headers: FETCH_HEADERS,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.sources?.HLS?.[0]?.src ?? null;
  } catch {
    return null;
  }
}

function buildM3U(entries) {
  const lines = ["#EXTM3U"];
  for (const { ch, url } of entries) {
    lines.push(
      `#EXTINF:-1 tvg-id="${ch.id}" tvg-name="${ch.name}" tvg-logo="${ch.logo}" group-title="${ch.group}",${ch.name}`,
      url
    );
  }
  return lines.join("\n") + "\n";
}

export default {
  async fetch(request) {
    const path = new URL(request.url).pathname.replace(/\/$/, "") || "/";

    // Determine which channels to serve
    let targets;
    if (path === "/" || path === "/tvp.m3u") {
      targets = CHANNELS;
    } else {
      const slug = path.replace(/^\//, "").replace(/\.m3u$/, "");
      const ch = CHANNELS.find((c) => c.slug === slug);
      if (!ch) {
        return new Response(
          "Not found.\n\nAvailable:\n" +
            ["/tvp.m3u", ...CHANNELS.map((c) => `/${c.slug}.m3u`)].join("\n") +
            "\n",
          { status: 404 }
        );
      }
      targets = [ch];
    }

    // Fetch all stream URLs in parallel
    const results = await Promise.all(
      targets.map(async (ch) => ({ ch, url: await getStreamUrl(ch.id) }))
    );

    const valid = results.filter((r) => r.url !== null);

    if (valid.length === 0) {
      return new Response("Could not fetch any stream URLs from TVP API.\n", {
        status: 503,
      });
    }

    return new Response(buildM3U(valid), {
      headers: {
        "Content-Type": "application/x-mpegurl",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
  async scheduled(controller, env, ctx) {
    console.log("cron processed");
  },
};