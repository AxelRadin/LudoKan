import math
from typing import Iterable, List, Optional
from django.db import transaction, models
from django.utils import timezone
from apps.matchmaking.models import MatchmakingRequest, GameParty, GamePartyMember

EARTH_RADIUS_KM = 6371.0

class BoundingBox:
    def __init__(self, lat_min: float, lat_max: float, lon_min: float, lon_max: float):
        self.lat_min = lat_min
        self.lat_max = lat_max
        self.lon_min = lon_min
        self.lon_max = lon_max

def compute_bbox(lat: float, lon: float, radius_km: float) -> BoundingBox:
    lat_rad = math.radians(lat)
    delta_lat = (radius_km / EARTH_RADIUS_KM) * (180.0 / math.pi)
    cos_lat = math.cos(lat_rad)
    if abs(cos_lat) < 1e-6:
        delta_lon = 180.0
    else:
        delta_lon = (radius_km / (EARTH_RADIUS_KM * cos_lat)) * (180.0 / math.pi)

    return BoundingBox(
        lat_min=lat - delta_lat, lat_max=lat + delta_lat,
        lon_min=lon - delta_lon, lon_max=lon + delta_lon,
    )

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    lat1_rad, lon1_rad = math.radians(lat1), math.radians(lon1)
    lat2_rad, lon2_rad = math.radians(lat2), math.radians(lon2)
    dlat, dlon = lat2_rad - lat1_rad, lon2_rad - lon1_rad
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c

def nearby_requests(lat: float, lon: float, radius_km: float, *, game=None, exclude_user=None, queryset: Optional[Iterable[MatchmakingRequest]] = None) -> List[MatchmakingRequest]:
    bbox = compute_bbox(lat, lon, radius_km)
    qs = MatchmakingRequest.objects.filter(
        latitude__gte=bbox.lat_min, latitude__lte=bbox.lat_max,
        longitude__gte=bbox.lon_min, longitude__lte=bbox.lon_max,
        status=MatchmakingRequest.STATUS_PENDING, expires_at__gt=timezone.now(),
    ) if queryset is None else queryset

    if game is not None: qs = qs.filter(game=game)
    if exclude_user is not None: qs = qs.exclude(user=exclude_user)

    results = []
    for req in qs:
        distance = haversine(lat, lon, req.latitude, req.longitude)
        effective_radius = min(radius_km, getattr(req, "radius_km", radius_km))
        if distance <= effective_radius:
            results.append(req)
    return results

def find_matches(request: MatchmakingRequest):
    if request.is_expired(): return []
    candidates = nearby_requests(request.latitude, request.longitude, request.radius_km, game=request.game, exclude_user=request.user)
    results = [(c, haversine(request.latitude, request.longitude, c.latitude, c.longitude)) for c in candidates]
    results.sort(key=lambda x: x[1])
    return results

# ==========================================
# GESTION DES LOBBIES / PARTIES
# ==========================================

def join_or_create_party(user, game):
    """Place le joueur dans un lobby ouvert, ou en crée un nouveau atomiquement."""
    with transaction.atomic():
        parties = list(GameParty.objects.select_for_update().filter(
            game=game, 
            status=GameParty.STATUS_OPEN
        ).order_by('created_at'))
        
        parties.sort(key=lambda p: p.members.count(), reverse=True)
        
        target_party = None
        for p in parties:
            if p.members.count() < p.max_players:
                target_party = p
                break
        
        if not target_party:
            target_party = GameParty.objects.create(game=game, max_players=2) 
            
        GamePartyMember.objects.get_or_create(party=target_party, user=user)
        
        MatchmakingRequest.objects.filter(
            user=user, game=game, status=MatchmakingRequest.STATUS_PENDING
        ).update(status=MatchmakingRequest.STATUS_MATCHED)

        return target_party