from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
root=Path(__file__).resolve().parents[1]/'tmp/pdfs/home-qa'
files=sorted(root.glob('page-*.png'))
sheet=Image.new('RGB',(1250,((len(files)+4)//5)*370),'#aab5b0')
draw=ImageDraw.Draw(sheet)
for i,f in enumerate(files):
 im=Image.open(f).convert('RGB');im.thumbnail((238,337))
 x=(i%5)*250+6;y=(i//5)*370+24
 sheet.paste(im,(x,y));draw.text((x,y-18),str(i+1),fill='black')
sheet.save(root/'contact.png')
