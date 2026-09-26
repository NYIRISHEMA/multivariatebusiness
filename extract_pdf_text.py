import pathlib
from PyPDF2 import PdfReader

project_path = pathlib.Path(__file__).resolve().parent
pdf_path = project_path / 'files' / 'MVBC CP Ver.3.pdf'
out_path = project_path / 'files' / 'mvbc_profile_text.txt'

if not pdf_path.is_file():
    raise SystemExit(f'Company profile PDF not found: {pdf_path}')

reader = PdfReader(str(pdf_path))
text_lines = []
for i, page in enumerate(reader.pages, start=1):
    text = page.extract_text() or ''
    text_lines.append(f'--- PAGE {i} ---\n{text}\n')

out_path.write_text('\n'.join(text_lines), encoding='utf-8')
print(f'Extracted {len(reader.pages)} pages to {out_path}')
