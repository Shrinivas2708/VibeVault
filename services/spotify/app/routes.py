from fastapi import APIRouter, HTTPException, Query

from app.schemas import PlaylistPayload, SearchRequest, TrackPayload
from app.spotify_service import get_track, import_album, import_playlist, import_track, search_tracks

router = APIRouter(tags=["spotify"])


@router.post("/search")
def search(body: SearchRequest) -> dict[str, list[TrackPayload]]:
    try:
        tracks = [TrackPayload(**t) for t in search_tracks(body.query, body.limit)]
        return {"tracks": tracks}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/tracks/{track_id}", response_model=TrackPayload)
def track(track_id: str) -> TrackPayload:
    try:
        return TrackPayload(**get_track(track_id))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/playlists/import", response_model=PlaylistPayload)
def playlist(
    url: str = Query(min_length=1),
    max_tracks: int = Query(default=100, ge=1, le=200),
) -> PlaylistPayload:
    try:
        return PlaylistPayload(**import_playlist(url, max_tracks=max_tracks))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/albums/import", response_model=PlaylistPayload)
def album(
    url: str = Query(min_length=1),
    max_tracks: int = Query(default=100, ge=1, le=200),
) -> PlaylistPayload:
    try:
        return PlaylistPayload(**import_album(url, max_tracks=max_tracks))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/tracks/import", response_model=PlaylistPayload)
def track_import(url: str = Query(min_length=1)) -> PlaylistPayload:
    try:
        return PlaylistPayload(**import_track(url))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc
