# Compiler TK Python

Project ini mendemonstrasikan tahapan sederhana kompilasi untuk ekspresi:

```text
y = x^2 + 2x + 4
```

Rentang nilai `x` adalah `0` sampai `10`, lalu program menampilkan tabel hasil dan grafik `y vs x`.

## Tahapan Yang Ditampilkan

1. BNF
2. CFG
3. Lexical analyzer
4. Syntax analyzer / AST
5. Semantic analyzer
6. Code generation dan eksekusi
7. Grafik `y vs x`

## Cara Menjalankan

```bash
pip install -r requirements.txt
python compiler_graph.py
```

Output grafik juga disimpan ke file:

```text
grafik_y_vs_x.png
```
