from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import yt_dlp

YOUTUBE_STREAM_HEADERS = {
    "Referer": "https://www.youtube.com/",
    "Origin": "https://www.youtube.com",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    ),
}

YOUTUBE_PLAYER_CLIENTS: list[list[str]] = [
    ["android", "web"],
    ["mweb"],
    ["ios", "web"],
    ["web"],
    ["tv_embedded"],
]


def _utc_iso(offset_seconds: int = 3600) -> str:
    return (
        datetime.now(timezone.utc) + timedelta(seconds=offset_seconds)
    ).isoformat()


def _base_opts(**extra: Any) -> dict[str, Any]:
    return {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "nocheckcertificate": True,
        **extra,
    }


def _youtube_opts(player_clients: list[str], **extra: Any) -> dict[str, Any]:
    return _base_opts(
        extractor_args={"youtube": {"player_client": player_clients}},
        **extra,
    )


def _map_artists(info: dict[str, Any]) -> list[dict[str, str | None]]:
    artist = info.get("artist") or info.get("uploader") or info.get("channel")
    if artist:
        return [{"id": None, "name": str(artist)}]
    return [{"id": None, "name": "Unknown Artist"}]


def _map_track(info: dict[str, Any]) -> dict[str, Any]:
    video_id = info.get("id") or ""
    webpage_url = info.get("webpage_url") or info.get("original_url") or ""
    thumbnail = info.get("thumbnail")
    duration = info.get("duration")

    return {
        "id": video_id,
        "provider": "youtube",
        "title": info.get("title") or "Unknown Title",
        "artists": _map_artists(info),
        "album": None,
        "artwork_url": thumbnail,
        "duration_ms": int(duration * 1000) if duration else None,
        "is_video": info.get("vcodec") not in (None, "none"),
        "url": webpage_url,
    }


def _is_progressive_format(fmt: dict[str, Any]) -> bool:
    protocol = str(fmt.get("protocol") or "")
    return "m3u8" not in protocol and "dash" not in protocol


def _format_sort_key(fmt: dict[str, Any], prefer_video: bool) -> tuple[int, int, int, int]:
    has_audio = fmt.get("acodec") not in (None, "none")
    has_video = fmt.get("vcodec") not in (None, "none")
    abr = int(fmt.get("abr") or 0)
    height = int(fmt.get("height") or 0)
    progressive = 1 if _is_progressive_format(fmt) else 0

    if prefer_video:
        return (
            1 if has_video else 0,
            progressive,
            height,
            abr,
        )

    audio_only = 1 if has_audio and not has_video else 0
    audio_with_video = 1 if has_audio and has_video else 0
    return (audio_only, progressive, abr, audio_with_video * height)


def _pick_format(info: dict[str, Any], prefer_video: bool = False) -> dict[str, Any] | None:
    formats = info.get("formats") or []
    candidates = [f for f in formats if f.get("url")]

    if not candidates and info.get("url"):
        return {
            "url": info["url"],
            "ext": info.get("ext"),
            "abr": info.get("abr"),
            "vcodec": info.get("vcodec"),
            "mime_type": info.get("mime_type"),
        }

    if not candidates:
        return None

    return max(
        candidates,
        key=lambda fmt: _format_sort_key(fmt, prefer_video=prefer_video),
    )


def _extract_info(url: str, player_clients: list[str]) -> dict[str, Any]:
    with yt_dlp.YoutubeDL(_youtube_opts(player_clients)) as ydl:
        info = ydl.extract_info(url, download=False)
        if info.get("_type") == "playlist":
            raise ValueError("URL is a playlist — use playlist import endpoint")
        return info


def _build_stream_payload(chosen: dict[str, Any]) -> dict[str, Any]:
    is_video = chosen.get("vcodec") not in (None, "none")
    abr = chosen.get("abr")
    ext = chosen.get("ext")
    mime_type = chosen.get("mime_type")
    if not mime_type and ext:
        mime_type = {
            "m4a": "audio/mp4",
            "mp4": "video/mp4",
            "webm": "audio/webm",
            "opus": "audio/opus",
        }.get(str(ext))

    return {
        "url": chosen["url"],
        "expires_at": _utc_iso(3600),
        "mime_type": mime_type,
        "bitrate": int(abr * 1000) if abr else None,
        "is_video": is_video,
        "headers": dict(YOUTUBE_STREAM_HEADERS),
    }


def extract_metadata(url: str) -> dict[str, Any]:
    last_error: Exception | None = None
    for clients in YOUTUBE_PLAYER_CLIENTS:
        try:
            return _map_track(_extract_info(url, clients))
        except Exception as exc:  # noqa: BLE001
            last_error = exc

    raise ValueError(str(last_error) if last_error else "Could not extract metadata")


def search_tracks(query: str, limit: int) -> list[dict[str, Any]]:
    search_url = f"ytsearch{limit}:{query}"
    with yt_dlp.YoutubeDL(_base_opts(extract_flat=True)) as ydl:
        info = ydl.extract_info(search_url, download=False)

    entries = info.get("entries") or []
    results: list[dict[str, Any]] = []

    for entry in entries:
        if not entry:
            continue
        entry_id = entry.get("id")
        if not entry_id:
            continue
        results.append(
            {
                "id": entry_id,
                "provider": "youtube",
                "title": entry.get("title") or "Unknown Title",
                "artists": _map_artists(entry),
                "album": None,
                "artwork_url": entry.get("thumbnail"),
                "duration_ms": int(entry["duration"] * 1000)
                if entry.get("duration")
                else None,
                "is_video": True,
                "url": entry.get("url")
                or f"https://www.youtube.com/watch?v={entry_id}",
            }
        )

    return results


def resolve_stream(url: str, prefer_video: bool = False) -> dict[str, Any]:
    last_error: Exception | None = None

    for clients in YOUTUBE_PLAYER_CLIENTS:
        try:
            info = _extract_info(url, clients)
            chosen = _pick_format(info, prefer_video=prefer_video)
            if chosen and chosen.get("url"):
                return _build_stream_payload(chosen)
        except Exception as exc:  # noqa: BLE001
            last_error = exc

    raise ValueError(str(last_error) if last_error else "No playable stream URL found")


def resolve_download(url: str) -> dict[str, Any]:
    info = _extract_info(url, YOUTUBE_PLAYER_CLIENTS[0])
    chosen = _pick_format(info, prefer_video=False)
    if not chosen or not chosen.get("url"):
        raise ValueError("No downloadable URL found")

    title = info.get("title") or "track"
    ext = chosen.get("ext") or "m4a"
    safe_title = "".join(c if c.isalnum() or c in "- _" else "_" for c in title)

    return {
        "url": chosen["url"],
        "filename": f"{safe_title}.{ext}",
        "format": ext,
        "size_bytes": chosen.get("filesize") or chosen.get("filesize_approx"),
        "expires_at": _utc_iso(3600),
    }


def import_playlist(url: str, max_tracks: int = 100) -> dict[str, Any]:
    with yt_dlp.YoutubeDL(_base_opts(extract_flat=True)) as ydl:
        info = ydl.extract_info(url, download=False)

    if info.get("_type") != "playlist":
        raise ValueError("URL is not a playlist")

    entries = (info.get("entries") or [])[:max_tracks]
    tracks: list[dict[str, Any]] = []

    for entry in entries:
        if not entry:
            continue
        entry_id = entry.get("id")
        if not entry_id:
            continue
        tracks.append(
            {
                "id": entry_id,
                "provider": "youtube",
                "title": entry.get("title") or "Unknown Title",
                "artists": _map_artists(entry),
                "album": None,
                "artwork_url": entry.get("thumbnail"),
                "duration_ms": int(entry["duration"] * 1000)
                if entry.get("duration")
                else None,
                "is_video": True,
                "url": entry.get("url")
                or f"https://www.youtube.com/watch?v={entry_id}",
            }
        )

    return {
        "id": info.get("id"),
        "name": info.get("title") or "Imported Playlist",
        "description": info.get("description"),
        "artwork_url": info.get("thumbnail"),
        "track_count": len(tracks),
        "owner": info.get("uploader"),
        "source_url": url,
        "tracks": tracks,
    }


def build_youtube_url(external_id: str, url: str | None = None) -> str:
    if url:
        return url
    if external_id.startswith("http"):
        return external_id
    return f"https://www.youtube.com/watch?v={external_id}"
