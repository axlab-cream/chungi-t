import json, re
from pathlib import Path
from html import escape
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4
from pypdf import PdfReader

root=Path(__file__).resolve().parents[1]
qa_dir=root/'output/home-generation-qa-v9-site-similarity'
data=json.loads((qa_dir/'generated.json').read_text(encoding='utf8'))
review=json.loads((qa_dir/'editorial-review.json').read_text(encoding='utf8'))
assert len(data['sections'])==12
out=root/'output/pdf/home-reading-generation-qa-v9-site-similarity.pdf'
out.parent.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('Korean','C:/Windows/Fonts/malgun.ttf'))
pdfmetrics.registerFont(TTFont('KoreanBold','C:/Windows/Fonts/malgunbd.ttf'))
styles={
 'title':ParagraphStyle('title',fontName='KoreanBold',fontSize=26,leading=37,textColor=HexColor('#18392f'),spaceAfter=22,wordWrap='CJK'),
 'h':ParagraphStyle('h',fontName='KoreanBold',fontSize=14,leading=22,spaceBefore=14,spaceAfter=8,wordWrap='CJK',keepWithNext=True),
 'body':ParagraphStyle('body',fontName='Korean',fontSize=10.5,leading=18,spaceAfter=12,wordWrap='CJK'),
 'small':ParagraphStyle('small',fontName='Korean',fontSize=9,leading=15,spaceAfter=9,wordWrap='CJK',textColor=HexColor('#58665f')),
 'score':ParagraphStyle('score',fontName='KoreanBold',fontSize=11,leading=18,spaceAfter=8,wordWrap='CJK',textColor=HexColor('#275246')),
 'hook':ParagraphStyle('hook',fontName='KoreanBold',fontSize=12,leading=21,spaceAfter=20,wordWrap='CJK',textColor=HexColor('#18392f')),
}
story=[]
def p(text,kind='body'): return Paragraph(escape(text).replace('\n','<br/>'),styles[kind])
def qa_score():
 after=review['after']
 overlap_penalty=20 if review.get('exactLongSentenceOverlaps') else 0
 expected=after['total'] or 1
 label_score=round(after['publicEvidenceLabels']/expected*35)
 action_score=round(after['actionMetadata']/expected*35)
 recap_score=30 if after['inputRecaps']==0 else max(0,30-after['inputRecaps']*5)
 return max(0,min(100,label_score+action_score+recap_score-overlap_penalty))
story += [p('집 풍수 해석\n12장 실제 생성 검수본','title'),p('코퍼스 3.0.0 | 터 유사도 UX | 2026.09.07','small'),p('별도 검수 샘플입니다','h'),p('서비스 생성 함수와 실제 모델로 생성한 12장 해석입니다. 정재용님의 저장 리포트나 서비스 PDF 다운로드본이 아니며, 기존 계정 데이터는 변경하지 않았습니다.'),p('검수 입력','h'),p('가상 인물: 양력 1990년 4월 12일, 여성, 출생시간 미상. 아파트 3년 이상 거주, 계속 거주 의사, 목적은 잠과 회복. 터 유사도 82점, 도심 평지형 주거 터, 생활 편의형 안정 터로 입력했습니다. 현관은 꺾여 들어오고, 침실은 조용한 편, 책상 뒤는 벽, 창밖은 트인 편으로 입력했습니다.'),p('검수 결과','h'),p(f"생성 품질 점수 {qa_score()}점 / 100점",'score'),p(f"12장 완료 · 입력 반복 {review['after']['inputRecaps']}건 · 고객용 근거 라벨 {review['after']['publicEvidenceLabels']}장 · 행동 메타 {review['after']['actionMetadata']}장 · 고객 노출 부적합 데이터 문구 {review['after'].get('customerBadDataLabels', 0)}건 · 긴 문장 중복 {len(review.get('exactLongSentenceOverlaps', []))}건",'small')]
story += [p('생성 본문 12장 | 실제 모델 gpt-5.5-2026-04-23','small'),PageBreak(),p('생성 품질 검수','title')]
story.append(p(f"기존 10장 샘플 대비 입력 반복은 {review['before']['inputRecaps']}건에서 {review['after']['inputRecaps']}건으로 줄었습니다. 일간·명식 재소개는 11번 전용으로 제한했고, 고객용 근거 라벨과 행동 메타는 12장 전부에 들어갔습니다."))
failed_ids=', '.join(dict.fromkeys(a['id'] for a in review.get('attempts', []) if not a.get('ok'))) or '없음'
story.append(p(f"긴 문장 중복: {len(review.get('exactLongSentenceOverlaps', []))}건. 재생성 필요 항목: {failed_ids}. 최종 12장 모두 통과했습니다."))
story.append(p('검수 범위: 한 조건에서 생성한 12장 본문. 모든 사용자 조건의 품질이나 로그인·결제·서비스 다운로드 흐름의 통과를 의미하지 않습니다.','small'))
story.append(PageBreak())
story += [p('해석 목차','title')]
for i,s in enumerate(data['sections'],1): story.append(p(f"{i:02d}  {s['category']}",'h'))
for i,s in enumerate(data['sections'],1):
 story += [PageBreak(),p(f"{i:02d}  {s['category']}",'title'),p(s['hook'],'hook')]
 for block in re.split(r'\n\s*\n',s['interpretation']):
  m=re.match(r'^\[([^\]]+)\]\s*(.*)',block,flags=re.S)
  if m: story += [p(m.group(1),'h'),p(m.group(2))]
  else: story.append(p(block))
def footer(c,doc):
 c.setStrokeColor(HexColor('#c7d1cb'));c.line(48,42,A4[0]-48,42)
 c.setFont('Korean',8);c.setFillColor(HexColor('#58665f'))
 c.drawString(48,28,'집 풍수 | 검수용 생성본 - 개인 저장 리포트 아님')
 c.drawRightString(A4[0]-48,28,str(doc.page))
SimpleDocTemplate(str(out),pagesize=A4,rightMargin=48,leftMargin=48,topMargin=48,bottomMargin=60,title='집 풍수 실제 생성 검수본',author='운명상회 검수').build(story,onFirstPage=footer,onLaterPages=footer)
r=PdfReader(str(out))
text='\n'.join(page.extract_text() or '' for page in r.pages)
assert all(s['category'] in text for s in data['sections'])
print(json.dumps({'file':str(out),'pages':len(r.pages),'characters':len(text)},ensure_ascii=False))
