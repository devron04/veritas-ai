"""
PDF report generator using ReportLab.

Produces a downloadable PDF with:
- Branded header with Veritas AI logo
- Overall score summary
- Detailed findings table
"""
from __future__ import annotations

import io
import logging
from datetime import datetime, timezone
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, Image,
)

from app.core.config import settings

logger = logging.getLogger(__name__)

# Custom colors — Veritas AI Blue Theme
NAVY = colors.HexColor("#1e3a5f")
BLUE_PRIMARY = colors.HexColor("#2563eb")
BLUE_LIGHT = colors.HexColor("#3b82f6")
BLUE_BG = colors.HexColor("#eff6ff")
GREEN = colors.HexColor("#059669")
YELLOW = colors.HexColor("#d97706")
RED = colors.HexColor("#dc2626")
LIGHT_GRAY = colors.HexColor("#f8fafc")
TABLE_BORDER = colors.HexColor("#dbeafe")
TEXT_COLOR = colors.HexColor("#1e293b")
TEXT_MUTED = colors.HexColor("#64748b")

# Path to logo
LOGO_PATH = Path(__file__).resolve().parent.parent.parent.parent / "frontend" / "public" / "logo.jpg"


def _score_color(score: float) -> colors.Color:
    """Return a color based on the plagiarism score."""
    if score >= 80:
        return RED
    elif score >= 50:
        return YELLOW
    else:
        return GREEN


def _score_label(score: float) -> str:
    if score >= 80:
        return "High Plagiarism"
    elif score >= 50:
        return "Suspicious"
    else:
        return "Original"


def generate_pdf_report(
    filename: str,
    overall_score: float,
    originality_score: float,
    total_chunks: int,
    flagged_chunks: int,
    findings: list[dict],
    tier_stats: dict | None = None,
    output_path: Path | None = None,
) -> bytes:
    """
    Generate a branded PDF plagiarism report.

    Args:
        filename: Name of the analyzed document.
        overall_score: Overall plagiarism score (0-100).
        originality_score: Originality score (0-100).
        total_chunks: Total number of chunks analyzed.
        flagged_chunks: Number of flagged chunks.
        findings: List of finding dicts with keys:
            chunk_text, source_name, similarity_score, match_type, is_quoted
        output_path: Optional path to save the file. If None, returns bytes.

    Returns:
        PDF file as bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        "Title2",
        parent=styles["Title"],
        fontSize=22,
        spaceAfter=4,
        textColor=NAVY,
        fontName="Helvetica-Bold",
    ))
    styles.add(ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontSize=11,
        textColor=TEXT_MUTED,
        spaceAfter=16,
    ))
    styles.add(ParagraphStyle(
        "ScoreText",
        parent=styles["Normal"],
        fontSize=36,
        alignment=1,  # center
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        "SectionHeader",
        parent=styles["Heading2"],
        fontSize=14,
        textColor=BLUE_PRIMARY,
        spaceBefore=16,
        spaceAfter=8,
        fontName="Helvetica-Bold",
    ))
    styles.add(ParagraphStyle(
        "FindingText",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=TEXT_COLOR,
    ))
    styles.add(ParagraphStyle(
        "BrandText",
        parent=styles["Normal"],
        fontSize=10,
        textColor=TEXT_MUTED,
        alignment=1,
    ))

    story = []

    # ---- Branded Header ----
    # Build header as a table: [Logo | Title Block]
    header_cells = []

    # Logo image
    if LOGO_PATH.exists():
        try:
            logo_img = Image(str(LOGO_PATH), width=50, height=50)
            header_cells.append(logo_img)
        except Exception:
            header_cells.append(Paragraph(
                '<font size="18" color="#2563eb"><b>V</b></font>', styles["Normal"]
            ))
    else:
        header_cells.append(Paragraph(
            '<font size="18" color="#2563eb"><b>V</b></font>', styles["Normal"]
        ))

    # Title block
    title_para = Paragraph(
        '<font size="18" color="#1e3a5f"><b>Veritas AI</b></font><br/>'
        '<font size="9" color="#64748b">Intelligent Plagiarism &amp; Paraphrase Detector</font>',
        styles["Normal"],
    )
    header_cells.append(title_para)

    # Date
    date_para = Paragraph(
        f'<font size="8" color="#64748b">'
        f'{datetime.now(timezone.utc).strftime("%B %d, %Y • %H:%M UTC")}</font>',
        ParagraphStyle("RightAligned", parent=styles["Normal"], alignment=2),
    )
    header_cells.append(date_para)

    header_table = Table(
        [header_cells],
        colWidths=[60, 280, 170],
    )
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BLUE_BG),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("LEFTPADDING", (0, 0), (0, 0), 12),
        ("LEFTPADDING", (1, 0), (1, 0), 8),
        ("RIGHTPADDING", (-1, 0), (-1, 0), 12),
        ("ROUNDEDCORNERS", [8, 8, 8, 8]),
        ("BOX", (0, 0), (-1, -1), 1, TABLE_BORDER),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 20))

    # ---- Document Info ----
    story.append(Paragraph(
        f'<font size="12" color="#1e293b"><b>Analysis Report</b></font>',
        styles["Normal"],
    ))
    story.append(Paragraph(
        f'<font size="10" color="#64748b">Document: {filename}</font>',
        styles["Subtitle"],
    ))

    # ---- Score Display ----
    score_color = _score_color(overall_score)
    score_bg = colors.HexColor("#fef2f2") if overall_score >= 80 else (
        colors.HexColor("#fffbeb") if overall_score >= 50 else colors.HexColor("#ecfdf5")
    )

    score_table = Table(
        [[
            Paragraph(
                f'<font size="32" color="{score_color.hexval()}"><b>{overall_score:.1f}%</b></font><br/>'
                f'<font size="10" color="{score_color.hexval()}">{_score_label(overall_score)}</font>',
                ParagraphStyle("ScoreCenter", parent=styles["Normal"], alignment=1),
            ),
        ]],
        colWidths=[510],
    )
    score_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), score_bg),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 16),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
        ("ROUNDEDCORNERS", [8, 8, 8, 8]),
        ("BOX", (0, 0), (-1, -1), 1, TABLE_BORDER),
    ]))
    story.append(score_table)
    story.append(Spacer(1, 16))

    # ---- Summary Table ----
    story.append(Paragraph("Summary", styles["SectionHeader"]))

    summary_data = [
        ["Metric", "Value"],
        ["Overall Plagiarism Score", f"{overall_score:.1f}%"],
        ["Originality Score", f"{originality_score:.1f}%"],
        ["Total Passages Analyzed", str(total_chunks)],
        ["Flagged Passages", str(flagged_chunks)],
        ["Properly Cited Passages", str(sum(1 for f in findings if f.get("is_quoted")))],
        ["Unique Sources Found", str(len(set(f.get("source_name", "") for f in findings)))],
    ]

    # Add tier breakdown rows if available
    if tier_stats:
        t1 = tier_stats.get("tier1_matches", 0)
        t2 = tier_stats.get("tier2_matches", 0)
        t3 = tier_stats.get("tier3_matches", 0)
        summary_data.append(["Tier 1 (Lexical) Matches", str(t1)])
        summary_data.append(["Tier 2 (Semantic) Matches", str(t2)])
        summary_data.append(["Tier 3 (Web Search) Matches", str(t3)])

    summary_table = Table(summary_data, colWidths=[250, 260])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE_PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("BACKGROUND", (0, 1), (-1, -1), LIGHT_GRAY),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, TABLE_BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("ROUNDEDCORNERS", [6, 6, 6, 6]),
    ]))
    story.append(summary_table)

    # ---- Detailed Findings ----
    if findings:
        story.append(PageBreak())

        # Repeat branded mini-header on findings page
        mini_header = Table(
            [[Paragraph(
                '<font size="11" color="#1e3a5f"><b>Veritas AI</b></font>'
                '  <font size="8" color="#64748b">• Detailed Findings</font>',
                styles["Normal"],
            )]],
            colWidths=[510],
        )
        mini_header.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), BLUE_BG),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("ROUNDEDCORNERS", [6, 6, 6, 6]),
            ("BOX", (0, 0), (-1, -1), 1, TABLE_BORDER),
        ]))
        story.append(mini_header)
        story.append(Spacer(1, 12))

        story.append(Paragraph("Detailed Findings", styles["SectionHeader"]))
        story.append(HRFlowable(width="100%", thickness=1, color=BLUE_PRIMARY))
        story.append(Spacer(1, 10))

        # Findings table header
        findings_header = ["#", "Passage", "Source", "Score", "Type", "Why Flagged"]
        findings_rows = [findings_header]

        for idx, finding in enumerate(findings[:100], 1):  # cap at 100 findings
            chunk_text = finding.get("chunk_text", "")
            if len(chunk_text) > 150:
                chunk_text = chunk_text[:147] + "..."

            source_name = finding.get("source_name", "Unknown")
            if len(source_name) > 60:
                source_name = source_name[:57] + "..."

            score = finding.get("similarity_score", 0)
            match_type = finding.get("match_type", "unknown")
            is_quoted = finding.get("is_quoted", False)

            type_label = match_type.capitalize()
            if is_quoted:
                type_label += " (Cited)"

            flag_reason = finding.get("flag_reason", "")
            if len(flag_reason) > 100:
                flag_reason = flag_reason[:97] + "..."

            findings_rows.append([
                str(idx),
                Paragraph(chunk_text, styles["FindingText"]),
                Paragraph(source_name, styles["FindingText"]),
                f"{score * 100:.0f}%",
                type_label,
                Paragraph(flag_reason, styles["FindingText"]),
            ])

        findings_table = Table(
            findings_rows,
            colWidths=[20, 150, 100, 35, 50, 110],
            repeatRows=1,
        )

        # Style rows by score
        table_style = [
            ("BACKGROUND", (0, 0), (-1, 0), BLUE_PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, TABLE_BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ROUNDEDCORNERS", [4, 4, 4, 4]),
        ]

        for row_idx, finding in enumerate(findings[:100], 1):
            score = finding.get("similarity_score", 0)
            if score >= 0.80:
                table_style.append(("BACKGROUND", (0, row_idx), (-1, row_idx),
                                    colors.HexColor("#fef2f2")))
            elif score >= 0.50:
                table_style.append(("BACKGROUND", (0, row_idx), (-1, row_idx),
                                    colors.HexColor("#fffbeb")))

        findings_table.setStyle(TableStyle(table_style))
        story.append(findings_table)

    # ---- Footer ----
    story.append(Spacer(1, 30))
    story.append(HRFlowable(width="100%", thickness=0.5, color=TABLE_BORDER))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        '<font size="8" color="#64748b">'
        "Veritas AI — Intelligent Plagiarism &amp; Paraphrase Detector • "
        "Originality • Clarity • Trust"
        "</font>",
        ParagraphStyle("FooterCenter", parent=styles["Normal"], alignment=1),
    ))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    # Optionally save to disk
    if output_path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(pdf_bytes)
        logger.info("PDF report saved to %s (%d bytes).", output_path, len(pdf_bytes))

    return pdf_bytes

