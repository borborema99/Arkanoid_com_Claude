// Gera dist/arkanoid.html embutindo CSS e JS no index.html
const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8'), js = fs.readFileSync('game.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8')
  .replace('<link rel="stylesheet" href="style.css">', () => '<style>\n' + css + '</style>')
  .replace('<script src="game.js"></script>', () => '<script>\n' + js + '</script>');
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/arkanoid.html', html);
