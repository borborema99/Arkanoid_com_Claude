# Arkanoid

Recriação do Arkanoid em Canvas e JavaScript puro, servida por Django. Os controles estão na tela inicial do jogo.

## Como rodar (terminal do VS Code)
1. No VS Code, abra o terminal (Ctrl+`) na pasta onde quer guardar o projeto.
2. Clone o repositório e entre na pasta:
   ```
   git clone https://github.com/borborema99/Arkanoid_com_Claude.git
   cd Arkanoid_com_Claude
   ```
3. Crie e ative o ambiente virtual (Windows PowerShell):
   ```
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   ```
   No Linux/macOS: `python3 -m venv .venv && source .venv/bin/activate`
4. Instale as dependências e inicie o servidor:
   ```
   pip install -r requirements.txt
   python manage.py runserver
   ```
5. Abra http://localhost:8000 no navegador.

## Estrutura
- config/: configurações e URLs do Django
- jogo/: app com views e URLs
- jogo/templates/jogo/index.html: página do jogo
- jogo/static/jogo/: game.js e style.css
- build_dist.py e dist/: versão de arquivo único

`python build_dist.py` gera a versão de arquivo único em dist/arkanoid.html.
