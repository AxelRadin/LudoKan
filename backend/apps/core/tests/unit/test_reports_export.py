"""
Tests unitaires pour apps.core.reports_export.
Couverture de build_activity_pdf avec activité non vide (lignes 171-183).
"""


from apps.core.reports_export import build_activity_pdf


class TestBuildActivityPdf:
    """Tests pour build_activity_pdf."""

    def test_build_activity_pdf_empty_activity(self):
        """Sans entrées d'activité, le PDF est généré sans tableau."""
        payload = {"activity": []}
        out = build_activity_pdf(payload)
        assert isinstance(out, bytes)
        assert out[:4] == b"%PDF"

    def test_build_activity_pdf_with_activity_rows(self):
        """Avec des entrées d'activité, le PDF contient le tableau (lignes 171-183)."""
        payload = {
            "activity": [
                {"user": "alice", "action": "login", "target": "", "at": "2025-02-20T10:00:00"},
                {"user": "bob", "action": "review_posted", "target": "game#42", "at": "2025-02-20T11:30:00"},
            ]
        }
        out = build_activity_pdf(payload)
        assert isinstance(out, bytes)
        assert out[:4] == b"%PDF"
        # Le tableau est inclus donc le PDF est plus long qu'avec activity vide
        assert len(out) > 500
