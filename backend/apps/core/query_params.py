"""Helpers for parsing list query parameters (admin filters, etc.)."""


def parse_optional_query_int(raw: str | None) -> int | None:
    """Entier depuis un query param ; None si absent ou non convertible."""
    if raw is None:
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def parse_multi_ids(request, plural_key: str, singular_key: str | None) -> list[int]:
    """Liste d'ids depuis `plural_key` (répété et/ou valeurs séparées par des virgules) ou `singular_key` seul."""
    tokens: list[str] = []
    for raw in request.query_params.getlist(plural_key):
        for piece in str(raw).split(","):
            s = piece.strip()
            if s:
                tokens.append(s)
    out: list[int] = []
    seen: set[int] = set()
    for t in tokens:
        try:
            n = int(t)
        except ValueError:
            continue
        if n not in seen:
            seen.add(n)
            out.append(n)
    if not out and singular_key:
        one = parse_optional_query_int(request.query_params.get(singular_key))
        if one is not None:
            out = [one]
    return out
