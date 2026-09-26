import pathlib
from PyPDF2 import PdfReader

pdf_path = pathlib.Path('files/MVBC CP Ver.3.pdf')
out_path = pathlib.Path('files/mvbc_profile_text.txt')

reader = PdfReader(str(pdf_path))
text_lines = []
for i, page in enumerate(reader.pages, start=1):
    text = page.extract_text() or ''
    text_lines.append(f'--- PAGE {i} ---\n{text}\n')

out_path.write_text('\n'.join(text_lines), encoding='utf-8')
print(f'Extracted {len(reader.pages)} pages to {out_path}')
