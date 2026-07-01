from __future__ import annotations

from typing import Any

from spotify_scraper import SpotifyClient


def _track_url(track_id: str) -> str:
    return f"https://open.spotify.com/track/{track_id}"


def _playlist_url(playlist_id: str) -> str:
    return f"https://open.spotify.com/playlist/{playlist_id}"


def _spotify_id(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _id_from_uri(uri: str | None, prefix: str) -> str:
    if not uri or f"{prefix}:" not in uri:
        return ""
    return uri.split(f"{prefix}:")[-1].split("?")[0]


def _pick_image(*sources: Any) -> str | None:
    for source in sources:
        if not source:
            continue
        if isinstance(source, list) and source:
            image = source[0]
            url = getattr(image, "url", None)
            if url:
                return str(url)
            if isinstance(image, dict) and image.get("url"):
                return str(image["url"])
    return None


def _map_artist(artist: Any) -> dict[str, str | None]:
    name = getattr(artist, "name", None) or "Unknown Artist"
    artist_id = _spotify_id(getattr(artist, "id", None))
    if not artist_id:
        artist_id = _id_from_uri(getattr(artist, "uri", None), "artist")
    return {"id": artist_id or None, "name": name}


def _unwrap_playlist_item(item: Any) -> Any | None:
    if item is None:
        return None
    inner = getattr(item, "track", None)
    return inner if inner is not None else item


def _map_track(track: Any) -> dict[str, Any] | None:
    if track is None:
        return None

    track_id = _spotify_id(getattr(track, "id", None))
    if not track_id:
        track_id = _id_from_uri(getattr(track, "uri", None), "track")

    if not track_id:
        return None

    title = getattr(track, "name", None) or "Unknown Title"
    artists = getattr(track, "artists", None) or []
    album_ref = getattr(track, "album", None)
    album_name = getattr(album_ref, "name", None) if album_ref else None
    artwork = _pick_image(
        getattr(track, "images", None),
        getattr(album_ref, "images", None) if album_ref else None,
    )

    duration_ms = getattr(track, "duration_ms", None)
    if duration_ms is None:
        duration = getattr(track, "duration", None)
        if duration is not None:
            duration_ms = int(duration * 1000) if duration < 10000 else int(duration)

    mapped_artists = [_map_artist(artist) for artist in artists]
    if not mapped_artists:
        mapped_artists = [{"id": None, "name": "Unknown Artist"}]

    return {
        "id": track_id,
        "provider": "spotify",
        "title": title,
        "artists": mapped_artists,
        "album": album_name,
        "artwork_url": artwork,
        "duration_ms": duration_ms,
        "url": _track_url(track_id),
    }


def search_tracks(query: str, limit: int) -> list[dict[str, Any]]:
    with SpotifyClient() as client:
        results = client.search(query, types=("track",), limit=limit)
        tracks = getattr(results, "tracks", None) or []

    mapped: list[dict[str, Any]] = []
    for track in tracks[:limit]:
        item = _map_track(track)
        if item:
            mapped.append(item)
    return mapped


def get_track(track_id: str) -> dict[str, Any]:
    url = track_id if track_id.startswith("http") else _track_url(track_id)
    with SpotifyClient() as client:
        track = client.get_track(url)

    mapped = _map_track(track)
    if not mapped:
        raise ValueError("Could not parse Spotify track")
    return mapped


def import_playlist(url: str, max_tracks: int = 100) -> dict[str, Any]:
    with SpotifyClient() as client:
        playlist = client.get_playlist(url, max_tracks=max_tracks)

    playlist_id = _spotify_id(getattr(playlist, "id", None))
    tracks_raw = getattr(playlist, "tracks", None) or []
    tracks: list[dict[str, Any]] = []

    for item in tracks_raw[:max_tracks]:
        mapped = _map_track(_unwrap_playlist_item(item))
        if mapped:
            tracks.append(mapped)

    if not tracks:
        raise ValueError("No playable tracks found in this Spotify playlist")

    artwork = _pick_image(getattr(playlist, "images", None))
    owner = getattr(playlist, "owner", None)
    owner_name = getattr(owner, "display_name", None) if owner else None
    if not owner_name and owner is not None:
        owner_name = getattr(owner, "name", None)

    return {
        "id": playlist_id or None,
        "name": getattr(playlist, "name", None) or "Spotify Playlist",
        "description": getattr(playlist, "description", None) or None,
        "artwork_url": artwork,
        "track_count": len(tracks),
        "owner": owner_name,
        "source_url": url,
        "tracks": tracks,
    }
