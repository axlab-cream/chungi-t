from __future__ import annotations

import json
import sys
from datetime import date
from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, Frame, KeepTogether, PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.platypus.tableofcontents import TableOfContents

PAGE_WIDTH, PAGE_HEIGHT = A4
INK = colors.HexColor('#121927')
MUTED = colors.HexColor('#606A7B')
LINE = colors.HexColor('#D9DEE8')
PAPER = colors.HexColor('#F5F7FB')
ACCENT = colors.HexColor('#3157D5')
ACCENT_SOFT = colors.HexColor('#E9EEFF')
GREEN = colors.HexColor('#137A4D')
GREEN_SOFT = colors.HexColor('#E8F7EF')
AMBER = colors.HexColor('#9A5B00')
AMBER_SOFT = colors.HexColor('#FFF3D9')


def safe(value: object) -> str:
    return escape(str(value or '')).replace('\n', '<br/>')


def register_fonts() -> None:
    regular = Path(r'C:\Windows\Fonts\malgun.ttf')
    bold = Path(r'C:\Windows\Fonts\malgunbd.ttf')
    if not regular.exists() or not bold.exists():
        raise FileNotFoundError('Korean font Malgun Gothic is required')
    pdfmetrics.registerFont(TTFont('Malgun', str(regular)))
    pdfmetrics.registerFont(TTFont('Malgun-Bold', str(bold)))
    pdfmetrics.registerFontFamily('Malgun', normal='Malgun', bold='Malgun-Bold')


class FinalServiceDoc(BaseDocTemplate):
    def __init__(self, filename: str, **kwargs: object) -> None:
        super().__init__(filename, **kwargs)
        frame = Frame(20 * mm, 20 * mm, PAGE_WIDTH - 40 * mm, PAGE_HEIGHT - 38 * mm, id='body')
        self.addPageTemplates(PageTemplate(id='main', frames=[frame], onPage=self.draw_page))

    def draw_page(self, canvas, doc) -> None:  # type: ignore[no-untyped-def]
        canvas.saveState()
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.5)
        canvas.line(20 * mm, PAGE_HEIGHT - 14 * mm, PAGE_WIDTH - 20 * mm, PAGE_HEIGHT - 14 * mm)
        canvas.setFont('Malgun-Bold', 8)
        canvas.setFillColor(INK)
        canvas.drawString(20 * mm, PAGE_HEIGHT - 10.5 * mm, '운명상회 · 전체 서비스 최종 해석 산출물')
        canvas.setFont('Malgun', 8)
        canvas.setFillColor(MUTED)
        canvas.drawRightString(PAGE_WIDTH - 20 * mm, 10 * mm, f'{doc.page}')
        canvas.restoreState()

    def afterFlowable(self, flowable) -> None:  # type: ignore[no-untyped-def]
        if isinstance(flowable, Paragraph) and flowable.style.name == 'ServiceTitle':
            text = flowable.getPlainText()
            key = getattr(flowable, '_bookmark_name', f'service-{self.page}')
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(text, key, level=0, closed=False)
            self.notify('TOCEntry', (0, text, self.page, key))


def make_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        'cover_kicker': ParagraphStyle('CoverKicker', parent=base['Normal'], fontName='Malgun-Bold', fontSize=10, leading=15, textColor=ACCENT, alignment=TA_CENTER, spaceAfter=10),
        'cover_title': ParagraphStyle('CoverTitle', parent=base['Title'], fontName='Malgun-Bold', fontSize=28, leading=38, textColor=INK, alignment=TA_CENTER, spaceAfter=16),
        'cover_sub': ParagraphStyle('CoverSub', parent=base['Normal'], fontName='Malgun', fontSize=11, leading=19, textColor=MUTED, alignment=TA_CENTER, spaceAfter=10),
        'h1': ParagraphStyle('HeadingOne', parent=base['Heading1'], fontName='Malgun-Bold', fontSize=20, leading=29, textColor=INK, spaceBefore=4, spaceAfter=14),
        'service': ParagraphStyle('ServiceTitle', parent=base['Heading1'], fontName='Malgun-Bold', fontSize=23, leading=32, textColor=INK, spaceAfter=8),
        'service_key': ParagraphStyle('ServiceKey', parent=base['Normal'], fontName='Malgun-Bold', fontSize=8.5, leading=13, textColor=ACCENT, spaceAfter=12),
        'category': ParagraphStyle('Category', parent=base['Normal'], fontName='Malgun-Bold', fontSize=8, leading=12, textColor=ACCENT, spaceBefore=9, spaceAfter=4),
        'hook': ParagraphStyle('Hook', parent=base['Normal'], fontName='Malgun-Bold', fontSize=11.2, leading=18, textColor=INK, leftIndent=8, borderColor=ACCENT, borderWidth=0, spaceAfter=7),
        'body': ParagraphStyle('Body', parent=base['BodyText'], fontName='Malgun', fontSize=9.3, leading=16, textColor=INK, wordWrap='CJK', spaceAfter=7),
        'small': ParagraphStyle('Small', parent=base['Normal'], fontName='Malgun', fontSize=8.2, leading=13, textColor=MUTED, wordWrap='CJK'),
        'note': ParagraphStyle('Note', parent=base['Normal'], fontName='Malgun', fontSize=9, leading=15, textColor=INK, backColor=PAPER, borderColor=LINE, borderWidth=0.5, borderPadding=9, spaceAfter=10),
        'status_green': ParagraphStyle('StatusGreen', parent=base['Normal'], fontName='Malgun-Bold', fontSize=9, leading=15, textColor=GREEN, backColor=GREEN_SOFT, borderPadding=8, spaceAfter=7),
        'status_amber': ParagraphStyle('StatusAmber', parent=base['Normal'], fontName='Malgun-Bold', fontSize=9, leading=15, textColor=AMBER, backColor=AMBER_SOFT, borderPadding=8, spaceAfter=7),
        'toc': ParagraphStyle('TOC', parent=base['Normal'], fontName='Malgun', fontSize=10, leading=18, textColor=INK, leftIndent=8, firstLineIndent=-8),
    }


def add_interpretation(story: list, text: str, styles: dict[str, ParagraphStyle]) -> None:
    for part in [value.strip() for value in text.replace('\r\n', '\n').split('\n\n') if value.strip()]:
        story.append(Paragraph(safe(part), styles['body']))


def build_pdf(payload: dict, output_path: Path) -> None:
    register_fonts()
    styles = make_styles()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    doc = FinalServiceDoc(str(output_path), pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=20 * mm, bottomMargin=20 * mm, title=payload['documentTitle'], author='운명상회 ProjectOps', subject='전체 서비스 합성 QA 및 검증 산출물')
    story: list = [
        Spacer(1, 48 * mm), Paragraph('PRODUCTION-EQUIVALENT QA ARCHIVE', styles['cover_kicker']),
        Paragraph('운명상회<br/>전체 서비스 최종 해석 산출물', styles['cover_title']),
        Paragraph('20개 서비스 · 실제 검증 레코드와 합성 QA 해석을 한 권에 수록', styles['cover_sub']),
        Spacer(1, 9 * mm), Paragraph(f"작성일 {safe(payload['generatedAt'])}<br/>총 {payload['summary']['services']}개 서비스 · {payload['summary']['sections']}개 해석 항목", styles['note']),
        Spacer(1, 35 * mm), Paragraph('고객 개인정보 및 운영 고객 데이터 미포함', styles['cover_sub']), PageBreak(),
        Paragraph('문서의 사용 범위', styles['h1']),
        Paragraph('이 문서는 운명상회 전체 서비스의 현재 출력 구조를 한 번에 검토하기 위한 QA 산출물입니다. 실제 provider 검증 결과, 규칙 기반 저장 결과, 운영 코드·코퍼스·RAG 기반 합성 결과를 서로 구분했습니다. 운세 해석은 전통적 상징과 입력 맥락을 바탕으로 한 참고 정보이며 의료·법률·투자·관계 상대의 마음을 확정하지 않습니다.', styles['body']),
        Paragraph(safe(payload['releaseDecision']), styles['status_amber']),
        Paragraph('<b>provider-verified</b>는 실제 모델 호출·저장·재생과 전체 목차 검수를 마친 결과입니다. <b>deterministic-verified</b>는 규칙 엔진의 저장·재생과 분기 검수를 마친 결과입니다. <b>production-template-qa</b>는 현재 운영 빌더·코퍼스·RAG로 생성했으나 provider 전체 목차 독립 검수는 아직 부착되지 않은 결과입니다.', styles['note']),
    ]
    summary_data = [[Paragraph('<b>구분</b>', styles['small']), Paragraph('<b>서비스 수</b>', styles['small'])], ['Provider 검증 완료', str(payload['summary']['providerVerified'])], ['규칙 엔진 검증 완료', str(payload['summary']['deterministicVerified'])], ['운영 템플릿 합성 QA', str(payload['summary']['productionTemplateQa'])]]
    summary = Table(summary_data, colWidths=[115 * mm, 45 * mm])
    summary.setStyle(TableStyle([('FONTNAME', (0, 0), (-1, -1), 'Malgun'), ('FONTSIZE', (0, 0), (-1, -1), 9), ('BACKGROUND', (0, 0), (-1, 0), ACCENT_SOFT), ('GRID', (0, 0), (-1, -1), 0.5, LINE), ('ALIGN', (1, 1), (1, -1), 'CENTER'), ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 7)]))
    story.extend([summary, PageBreak(), Paragraph('서비스 목차', styles['h1'])])
    toc = TableOfContents()
    toc.levelStyles = [styles['toc']]
    story.extend([toc, PageBreak(), Paragraph('전체 서비스 현황', styles['h1'])])
    overview_rows = [[Paragraph('<b>서비스</b>', styles['small']), Paragraph('<b>근거 상태</b>', styles['small']), Paragraph('<b>항목</b>', styles['small']), Paragraph('<b>코퍼스</b>', styles['small'])]]
    for service in payload['services']:
        corpus = service.get('corpus') or {}
        overview_rows.append([Paragraph(safe(service['serviceTitle']), styles['small']), Paragraph(safe(service['sourceLabel']), styles['small']), str(len(service['sections'])), Paragraph(safe(corpus.get('version') or '-'), styles['small'])])
    overview = Table(overview_rows, colWidths=[39 * mm, 81 * mm, 18 * mm, 22 * mm], repeatRows=1)
    overview.setStyle(TableStyle([('FONTNAME', (0, 0), (-1, -1), 'Malgun'), ('FONTSIZE', (0, 0), (-1, -1), 7.5), ('BACKGROUND', (0, 0), (-1, 0), INK), ('TEXTCOLOR', (0, 0), (-1, 0), colors.white), ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, PAPER]), ('GRID', (0, 0), (-1, -1), 0.4, LINE), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('ALIGN', (2, 1), (2, -1), 'CENTER'), ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5)]))
    story.append(overview)

    for index, service in enumerate(payload['services'], start=1):
        story.append(PageBreak())
        title = Paragraph(f"{index:02d}. {safe(service['serviceTitle'])}", styles['service'])
        title._bookmark_name = f"service-{index:02d}-{service['serviceKey']}"  # type: ignore[attr-defined]
        story.extend([title, Paragraph(safe(service['serviceKey']), styles['service_key']), Paragraph(safe(service['promise']), styles['note'])])
        status_style = styles['status_green'] if service['sourceKind'] in {'provider-verified', 'deterministic-verified'} else styles['status_amber']
        story.extend([Paragraph(safe(service['sourceLabel']), status_style), Paragraph(safe(service['evidenceNote']), styles['small'])])
        corpus = service.get('corpus') or {}
        evidence_bits = [f"해석 항목 {len(service['sections'])}개", f"코퍼스 {corpus.get('version') or '미표시'}", f"registry {corpus.get('registryVersion') or '미표시'}"]
        if service.get('recordSha256'):
            evidence_bits.append(f"record SHA-256 {service['recordSha256'][:16]}…")
        story.extend([Paragraph(' · '.join(evidence_bits), styles['small']), Spacer(1, 5 * mm)])
        for section in service['sections']:
            header = KeepTogether([Paragraph(f"{safe(section['category'])} · {safe(section['classification'])} · {section['order']}/{len(service['sections'])}", styles['category']), Paragraph(safe(section['hook']), styles['hook'])])
            story.append(header)
            add_interpretation(story, section['interpretation'], styles)
            story.append(Spacer(1, 2.5 * mm))

    story.extend([PageBreak(), Paragraph('최종 확인 메모', styles['h1']), Paragraph('이 PDF는 현재 코드베이스에서 재현 가능한 전체 서비스 해석을 모은 검토본입니다. provider·전체 목차·시각 증거가 모두 부착되지 않은 서비스는 문서 안에 그대로 표시했습니다. 따라서 누락 확인과 다음 검증 순서를 결정하는 기준으로 사용하되, 전체 릴리스 승인 증명으로 대체하지 않습니다.', styles['note']), Paragraph(f"생성일 {date.fromisoformat(payload['generatedAt']).isoformat()} · ProjectOps synthetic QA", styles['small'])])
    doc.multiBuild(story)


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit('usage: build-final-service-pdf.py INPUT_JSON OUTPUT_PDF')
    input_path = Path(sys.argv[1]).resolve()
    output_path = Path(sys.argv[2]).resolve()
    payload = json.loads(input_path.read_text(encoding='utf-8'))
    build_pdf(payload, output_path)
    print(json.dumps({'outputPath': str(output_path), 'bytes': output_path.stat().st_size}, ensure_ascii=False))


if __name__ == '__main__':
    main()
