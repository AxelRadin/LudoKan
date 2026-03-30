"""
Génération CSV et PDF des rapports admin.
Utilisé par les vues reports users, games, activity avec ?export=csv ou ?export=pdf.
"""

import csv
import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

PERMISSION_REPORTS_EXPORT = "reports.export"
MSG_EXPORT_FORBIDDEN = "Export réservé aux rôles admin/superadmin."


def build_users_csv(payload: dict) -> str:
    """Rapport utilisateurs en CSV (lignes metric,value)."""
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["metric", "value"])
    w.writerow(["total", payload["total"]])
    w.writerow(["new_day", payload["new"]["day"]])
    w.writerow(["new_week", payload["new"]["week"]])
    w.writerow(["new_month", payload["new"]["month"]])
    w.writerow(["active_day", payload["active"]["day"]])
    w.writerow(["active_week", payload["active"]["week"]])
    w.writerow(["active_month", payload["active"]["month"]])
    w.writerow(["suspended", payload["suspended"]])
    return out.getvalue()


def build_games_csv(payload: dict) -> str:
    """Rapport jeux en CSV (sections popular_games, top_genres, ratings_summary, platforms)."""
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["report", "games"])
    w.writerow([])
    w.writerow(["id", "name", "average_rating", "owners_count"])
    for row in payload.get("popular_games", []):
        w.writerow([row.get("id"), row.get("name"), row.get("average_rating"), row.get("owners_count")])
    w.writerow([])
    w.writerow(["ratings_summary"])
    w.writerow(["average", payload.get("ratings_summary", {}).get("average")])
    w.writerow(["total_count", payload.get("ratings_summary", {}).get("total_count")])
    w.writerow(["reviews_recent", payload.get("reviews_recent")])
    w.writerow([])
    w.writerow(["id", "name", "games_count"])
    for row in payload.get("top_genres", []):
        w.writerow([row.get("id"), row.get("name"), row.get("games_count")])
    w.writerow([])
    w.writerow(["id", "name", "games_count"])
    for row in payload.get("platforms_breakdown", []):
        w.writerow([row.get("id"), row.get("name"), row.get("games_count")])
    return out.getvalue()


def build_activity_csv(payload: dict) -> str:
    """Journal d'activité en CSV (user, action, target, at)."""
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["user", "action", "target", "at"])
    for row in payload.get("activity", []):
        w.writerow(
            [
                row.get("user", ""),
                row.get("action", ""),
                row.get("target", ""),
                row.get("at", ""),
            ]
        )
    return out.getvalue()


def build_users_pdf(payload: dict) -> bytes:
    """Rapport utilisateurs en PDF."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=2 * cm, leftMargin=2 * cm)
    styles = getSampleStyleSheet()
    data = [
        ["Métrique", "Valeur"],
        ["Total", str(payload["total"])],
        ["Nouveaux (24h)", str(payload["new"]["day"])],
        ["Nouveaux (7j)", str(payload["new"]["week"])],
        ["Nouveaux (30j)", str(payload["new"]["month"])],
        ["Actifs (24h)", str(payload["active"]["day"])],
        ["Actifs (7j)", str(payload["active"]["week"])],
        ["Actifs (30j)", str(payload["active"]["month"])],
        ["Suspendus", str(payload["suspended"])],
    ]
    t = Table(data, colWidths=[8 * cm, 4 * cm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ]
        )
    )
    story = [
        Paragraph("Rapport utilisateurs", styles["Title"]),
        Spacer(1, 0.5 * cm),
        Paragraph(f"Généré le {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles["Normal"]),
        Spacer(1, 0.5 * cm),
        t,
    ]
    doc.build(story)
    return buf.getvalue()


def build_games_pdf(payload: dict) -> bytes:
    """Rapport jeux en PDF."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=2 * cm, leftMargin=2 * cm)
    styles = getSampleStyleSheet()
    story = [
        Paragraph("Rapport jeux", styles["Title"]),
        Spacer(1, 0.5 * cm),
        Paragraph(f"Généré le {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles["Normal"]),
        Spacer(1, 0.5 * cm),
    ]
    rs = payload.get("ratings_summary", {})
    story.append(Paragraph("Résumé notes / avis", styles["Heading2"]))
    story.append(Spacer(1, 0.2 * cm))
    story.append(
        Table(
            [
                ["Moyenne notes", str(rs.get("average", ""))],
                ["Total notes", str(rs.get("total_count", ""))],
                ["Avis récents (30j)", str(payload.get("reviews_recent", ""))],
            ],
            colWidths=[8 * cm, 4 * cm],
        )
    )
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph("Top jeux (par nombre de propriétaires)", styles["Heading2"]))
    story.append(Spacer(1, 0.2 * cm))
    rows = [
        [str(r.get("id")), r.get("name", ""), str(r.get("average_rating", "")), str(r.get("owners_count", ""))]
        for r in payload.get("popular_games", [])
    ]
    if rows:
        story.append(Table([["ID", "Nom", "Note moy.", "Propriétaires"]] + rows))
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph("Top genres", styles["Heading2"]))
    story.append(Spacer(1, 0.2 * cm))
    rows = [[str(r.get("id")), r.get("name", ""), str(r.get("games_count", ""))] for r in payload.get("top_genres", [])]
    if rows:
        story.append(Table([["ID", "Genre", "Nb jeux"]] + rows))
    doc.build(story)
    return buf.getvalue()


def build_activity_pdf(payload: dict) -> bytes:
    """Journal d'activité en PDF (tableau user, action, target, at)."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=1.5 * cm, leftMargin=1.5 * cm)
    styles = getSampleStyleSheet()
    activity = payload.get("activity", [])
    rows = [[r.get("user", ""), r.get("action", ""), r.get("target", ""), r.get("at", "")[:19]] for r in activity[:100]]
    story = [
        Paragraph("Journal d'activité", styles["Title"]),
        Spacer(1, 0.5 * cm),
        Paragraph(f"Généré le {datetime.now().strftime('%Y-%m-%d %H:%M')} — {len(activity)} entrées", styles["Normal"]),
        Spacer(1, 0.5 * cm),
    ]
    if rows:
        t = Table([["User", "Action", "Target", "At"]] + rows, colWidths=[3 * cm, 3 * cm, 3 * cm, 4 * cm])
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                ]
            )
        )
        story.append(t)
    doc.build(story)
    return buf.getvalue()
