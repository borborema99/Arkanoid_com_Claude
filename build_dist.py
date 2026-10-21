"""Gera dist/arkanoid.html embutindo CSS e JS no template do jogo."""
import re
from pathlib import Path

RAIZ = Path(__file__).parent
BASE = RAIZ / "jogo"


def ler(caminho):
    # Lê um arquivo de texto em utf-8
    return (BASE / caminho).read_text(encoding="utf-8")


def embutir(html, padrao, novo):
    # Troca a tag achada pelo padrão; a lambda evita interpretar barras do JS
    return re.sub(padrao, lambda _: novo, html, count=1)


def main():
    # Monta o arquivo único e grava em dist/
    html = re.sub(r"[ \t]*\{% load static %\}\r?\n", "", ler("templates/jogo/index.html"))
    html = embutir(html, r"<link[^>]*style\.css[^>]*>", "<style>\n" + ler("static/jogo/style.css") + "</style>")
    html = embutir(html, r"<script[^>]*game\.js[^>]*></script>", "<script>\n" + ler("static/jogo/game.js") + "</script>")
    (RAIZ / "dist").mkdir(exist_ok=True)
    (RAIZ / "dist" / "arkanoid.html").write_text(html, encoding="utf-8")


if __name__ == "__main__":
    main()
