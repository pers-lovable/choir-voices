// Cloudflare Worker — Kör för alla B2 proxy
//
// Secrets (set via: wrangler secret put <NAME>):
//   B2_KEY_ID       — Backblaze application key ID
//   B2_APP_KEY      — Backblaze application key
//   B2_BUCKET_ID    — Backblaze bucket ID (for listing)
//   B2_BUCKET_NAME  — Backblaze bucket name (for downloads)
//   USER_PASSWORD   — Password choir members enter in the app

// Module-level cache: lives for the lifetime of this Worker instance (~a few hours)
let b2Auth = null;

async function getB2Auth(env) {
  if (b2Auth) return b2Auth;

  const resp = await fetch("https://api.backblazeb2.com/b2api/v3/b2_authorize_account", {
    headers: {
      Authorization: "Basic " + btoa(`${env.B2_KEY_ID}:${env.B2_APP_KEY}`),
    },
  });

  if (!resp.ok) throw new Error(`B2 authorize failed: ${resp.status}`);

  const data = await resp.json();
  b2Auth = {
    apiUrl: data.apiInfo.storageApi.apiUrl,
    downloadUrl: data.apiInfo.storageApi.downloadUrl,
    authToken: data.authorizationToken,
  };
  return b2Auth;
}

// Extract password from "Authorization: Basic <base64(username:password)>"
function getPassword(request) {
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Basic ")) return null;
  const decoded = atob(header.slice(6));
  const colon = decoded.indexOf(":");
  return colon >= 0 ? decoded.slice(colon + 1) : decoded;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// List song directories under a given B2 prefix, return HTML directory listing
async function listSongs(prefix, env, retry = true) {
  const auth = await getB2Auth(env);
  const normalized = prefix.endsWith("/") ? prefix : prefix + "/";

  const params = new URLSearchParams({
    bucketId: env.B2_BUCKET_ID,
    prefix: normalized,
    delimiter: "/",
    maxFileCount: "1000",
  });

  const resp = await fetch(`${auth.apiUrl}/b2api/v3/b2_list_file_names?${params}`, {
    headers: { Authorization: auth.authToken },
  });

  if (resp.status === 401 && retry) {
    b2Auth = null;
    return listSongs(prefix, env, false);
  }
  if (!resp.ok) return new Response("B2 error", { status: 502, headers: CORS });

  const { files = [] } = await resp.json();

  // B2 returns folders as entries in the files array with action: "folder"
  // e.g. { fileName: "vt2026/BarfotaBarn/", action: "folder" }
  const folders = files
    .filter((f) => f.action === "folder")
    .map((f) => f.fileName.slice(normalized.length))
    .filter(Boolean);

  const links = folders
    .map((f) => {
      const name = f.replace(/\/$/, "");
      return `<a href="${encodeURIComponent(name)}/">${name}/</a>`;
    })
    .join("\n");

  return new Response(`<html><body>\n${links}\n</body></html>`, {
    headers: { ...CORS, "Content-Type": "text/html; charset=utf-8" },
  });
}

// Proxy a WAV file from B2 to the browser
async function downloadFile(key, env, retry = true) {
  const auth = await getB2Auth(env);

  // Encode each path segment separately so spaces/special chars are handled correctly
  const encodedKey = key
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const url = `${auth.downloadUrl}/file/${env.B2_BUCKET_NAME}/${encodedKey}`;

  const resp = await fetch(url, {
    headers: { Authorization: auth.authToken },
  });

  if (resp.status === 401 && retry) {
    b2Auth = null;
    return downloadFile(key, env, false);
  }
  if (!resp.ok) return new Response("Not found", { status: resp.status, headers: CORS });

  const headers = new Headers(CORS);
  headers.set("Content-Type", "audio/mpeg");
  const len = resp.headers.get("Content-Length");
  if (len) headers.set("Content-Length", len);

  return new Response(resp.body, { headers });
}

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method !== "GET") {
      return new Response("Method Not Allowed", { status: 405, headers: CORS });
    }

    // Password check
    if (getPassword(request) !== env.USER_PASSWORD) {
      return new Response("Unauthorized", {
        status: 401,
        headers: { ...CORS, "WWW-Authenticate": 'Basic realm="Choir"' },
      });
    }

    // Decode URL path — e.g. "/2025/Stilla%20natt/gr%C3%B6n.wav" → "2025/Stilla natt/grön.wav"
    const { pathname } = new URL(request.url);
    const path = decodeURIComponent(pathname).slice(1); // strip leading /

    if (path.endsWith(".mp3")) {
      return downloadFile(path, env);
    } else {
      return listSongs(path, env);
    }
  },
};
