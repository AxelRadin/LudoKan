import math
from typing import Iterable, List, Optional

from django.utils import timezone

from apps.matchmaking.models import MatchmakingRequest

EARTH_RADIUS_KM = 6371.0


class BoundingBox:
    def __init__(self, lat_min: float, lat_max: float, lon_min: float, lon_max: float):
        self.lat_min = lat_min
        self.lat_max = lat_max
        self.lon_min = lon_min
        self.lon_max = lon_max


def compute_bbox(lat: float, lon: float, radius_km: float) -> BoundingBox:
    """
    Calcule une bounding box simple autour d'un point (lat, lon).
    """
    lat_rad = math.radians(lat)

    # Variation maximale en latitude (en degrés)
    delta_lat = (radius_km / EARTH_RADIUS_KM) * (180.0 / math.pi)

    # Variation maximale en longitude (en degrés), corrigée par la latitude
    # On évite la division par zéro près des pôles.
    cos_lat = math.cos(lat_rad)
    if abs(cos_lat) < 1e-6:
        # Très proche des pôles : on ouvre toute la longitude
        delta_lon = 180.0
    else:
        delta_lon = (radius_km / (EARTH_RADIUS_KM * cos_lat)) * (180.0 / math.pi)

    return BoundingBox(
        lat_min=lat - delta_lat,
        lat_max=lat + delta_lat,
        lon_min=lon - delta_lon,
        lon_max=lon + delta_lon,
    )


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Distance en km entre deux points (lat, lon) sur une sphère.
    """
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)

    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad

    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c


def nearby_requests(
    lat: float,
    lon: float,
    radius_km: float,
    *,
    game=None,
    exclude_user=None,
    queryset: Optional[Iterable[MatchmakingRequest]] = None,
) -> List[MatchmakingRequest]:
    """
    Retourne les MatchmakingRequest "autour de moi".

    Étapes :
    1. Bounding box sur latitude / longitude (filtre rapide en base)
    2. Filtre status=pending et expires_at > now()
    3. Haversine pour ne garder que les requêtes à <= radius_km

    Le paramètre queryset permet de surcharger la source (utile pour des tests
    ou pour composer avec d'autres filtres), tout en gardant une API simple.
    """
    bbox = compute_bbox(lat, lon, radius_km)

    if queryset is None:
        qs = MatchmakingRequest.objects.filter(
            latitude__gte=bbox.lat_min,
            latitude__lte=bbox.lat_max,
            longitude__gte=bbox.lon_min,
            longitude__lte=bbox.lon_max,
            status=MatchmakingRequest.STATUS_PENDING,
            expires_at__gt=timezone.now(),
        )
    else:
        qs = queryset

    if game is not None:
        qs = qs.filter(game=game)

    if exclude_user is not None:
        qs = qs.exclude(user=exclude_user)

    results: List[MatchmakingRequest] = []
    for req in qs:
        distance = haversine(lat, lon, req.latitude, req.longitude)

        # On respecte à la fois le radius du chercheur et celui de la requête
        effective_radius = min(radius_km, getattr(req, "radius_km", radius_km))
        if distance <= effective_radius:
            results.append(req)

    return results


def find_matches(request: MatchmakingRequest):
    """
    Retourne une liste de tuples (MatchmakingRequest, distance_km),
    triée par distance croissante.
    """
    if request.is_expired():
        return []

    # 1. Requêtes candidates proches (bounding box + haversine)
    candidates = nearby_requests(
        lat=request.latitude,
        lon=request.longitude,
        radius_km=request.radius_km,
        game=request.game,
        exclude_user=request.user,
    )

    results = []
    for candidate in candidates:
        distance = haversine(
            request.latitude,
            request.longitude,
            candidate.latitude,
            candidate.longitude,
        )
        results.append((candidate, distance))

    # 2. Tri par distance
    results.sort(key=lambda x: x[1])
    return results
