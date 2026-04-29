# PyCompiler Web

Project web edukasi compiler sederhana untuk tugas Teknik Kompilasi. Aplikasi ini menerima source code berupa persamaan matematika, lalu menampilkan tahapan kompilasi dari source code sampai execution dan grafik `y vs x`.

## Fitur

- Source Code
- BNF
- CFG
- Lexical Analyzer
- Syntax Analyzer / AST
- Semantic Analyzer
- Code Generation & Execution
- Grafik `y vs x` dengan Chart.js

## Ketentuan Bahasa

- Variabel output harus `y`
- Variabel bebas adalah `x`
- Operator yang didukung: `+`, `-`, `*`, `/`, `pangkat`
- Alias operator pangkat `^` juga didukung
- Mendukung perkalian implisit seperti `2 x`, `3 x pangkat 2`, dan `(x + 1)(x + 2)`
- Range default `x` adalah `0` sampai `10`

## Cara Install dan Menjalankan

```bash
pip install -r requirements.txt
python app.py
```

Lalu buka:

```text
http://127.0.0.1:5000
```

## Deploy ke Vercel

Project ini bisa dideploy ke Vercel sebagai Flask app.

Jika repository GitHub berada di folder `Compiler_TK`, atur **Root Directory** di Vercel menjadi:

```text
pycompiler-web
```

File penting untuk Vercel:

- `app.py` mengekspos instance Flask bernama `app`
- `vercel.json` menjalankan build command
- `build.py` menyalin asset dari `static/` ke `public/static/`
- `requirements.txt` berisi dependency Python

Deploy via Vercel Dashboard:

```text
New Project -> Import GitHub Repository -> Root Directory: pycompiler-web -> Deploy
```

Deploy via Vercel CLI:

```bash
npm install -g vercel
vercel login
vercel
vercel --prod
```

## Contoh Input

```text
y = x pangkat 2 + 2 x + 4
```

atau:

```text
y = x^2 + 2 x + 4
```

## API

### GET /

Menampilkan halaman utama.

### POST /compile

Request:

```json
{
  "source_code": "y = x pangkat 2 + 2 x + 4",
  "x_start": 0,
  "x_end": 10
}
```

Response sukses:

```json
{
  "success": true,
  "source_code": "y = x pangkat 2 + 2 x + 4",
  "bnf": "...",
  "cfg": "...",
  "tokens": [],
  "ast": "...",
  "semantic": "...",
  "execution": [
    {"x": 0, "y": 4},
    {"x": 1, "y": 7}
  ]
}
```
