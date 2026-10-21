# Arkanoid

Recriação do Arkanoid em Canvas e JavaScript puro, servida por Django. Os controles estão na tela inicial do jogo.

## Como rodar
python3 -m venv .venv, ativar, pip install -r requirements.txt, python manage.py runserver, abrir http://localhost:8000

## Estrutura
- config/: configurações e URLs do Django
- jogo/: app com views e URLs
- jogo/templates/jogo/index.html: página do jogo
- jogo/static/jogo/: game.js e style.css
- build_dist.py e dist/: versão de arquivo único

`python build_dist.py` gera a versão de arquivo único em dist/arkanoid.html.
