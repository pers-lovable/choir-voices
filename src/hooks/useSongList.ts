import { useState, useCallback } from "react";
import type { AppSettings } from "./useSettings";

export function useSongList(settings: AppSettings) {
  const [songs, setSongs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(settings.serverUrl, {
        headers: {
          Authorization: "Basic " + btoa(`choir:${settings.password}`),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // Parse directory listing — look for hrefs that look like directories
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const links = Array.from(doc.querySelectorAll("a"));

      const songDirs = links
        .map(a => {
          const href = a.getAttribute("href") || "";
          // Strip trailing slash and parent refs
          const clean = decodeURIComponent(href).replace(/\/$/, "");
          return clean;
        })
        .filter(name => name && name !== ".." && name !== "." && !name.startsWith("?") && !name.startsWith("/"));

      setSongs(songDirs);
    } catch (err: any) {
      setError(err.message || "Failed to fetch songs");
      setSongs([]);
    } finally {
      setLoading(false);
    }
  }, [settings.serverUrl, settings.password]);

  return { songs, loading, error, fetchSongs };
}
