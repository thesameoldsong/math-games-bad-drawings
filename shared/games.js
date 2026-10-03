// Catalog of all games from the book. status: 'ready' once games/<slug>/ exists.
export const SECTIONS = [
  { id: 'spatial', ru: 'Пространственные игры', en: 'Spatial Games' },
  { id: 'number', ru: 'Числовые игры', en: 'Number Games' },
  { id: 'combination', ru: 'Комбинаторные игры', en: 'Combination Games' },
  { id: 'risk', ru: 'Риск и награда', en: 'Games of Risk and Reward' },
  { id: 'information', ru: 'Игры с информацией', en: 'Information Games' },
];
// featured: one of the five main chapters of a section (vs. the short "constellation" games)
const g = (section, slug, en, ru, featured = false) => ({ section, slug, en, ru, featured, status: 'soon' });
export const GAMES = [
  g('spatial', 'dots-and-boxes', 'Dots and Boxes', 'Точки и квадраты', true),
  g('spatial', 'sprouts', 'Sprouts', 'Рассада', true),
  g('spatial', 'ultimate-tic-tac-toe', 'Ultimate Tic-Tac-Toe', 'Ультимативные крестики-нолики', true),
  g('spatial', 'dandelions', 'Dandelions', 'Одуванчики', true),
  g('spatial', 'quantum-tic-tac-toe', 'Quantum Tic-Tac-Toe', 'Квантовые крестики-нолики', true),
  g('spatial', 'bunch-of-grapes', 'Bunch of Grapes', 'Гроздь винограда'),
  g('spatial', 'neutron', 'Neutron', 'Нейтрон'),
  g('spatial', 'order-and-chaos', 'Order and Chaos', 'Порядок и хаос'),
  g('spatial', 'splatter', 'Splatter', 'Клякса'),
  g('spatial', '3d-tic-tac-toe', '3D Tic-Tac-Toe', 'Объёмные крестики-нолики'),

  g('number', 'chopsticks', 'Chopsticks', 'Палочки', true),
  g('number', 'sequencium', 'Sequencium', 'Секвенциум', true),
  g('number', '33-to-99', '33 to 99', 'От 33 до 99', true),
  g('number', 'pennywise', 'Pennywise', 'Мелочь', true),
  g('number', 'prophecies', 'Prophecies', 'Пророчества', true),
  g('number', 'mediocrity', 'Mediocrity', 'Посредственность'),
  g('number', 'black-hole', 'Black Hole', 'Чёрная дыра'),
  g('number', 'jam', 'Jam', 'Джем'),
  g('number', 'starlitaire', 'Starlitaire', 'Звёздный пасьянс'),
  g('number', 'gridlock', 'Gridlock', 'Тупик'),
  g('number', 'tax-collector', 'Tax Collector', 'Сборщик налогов'),
  g('number', 'love-and-marriage', 'Love and Marriage', 'Любовь и брак'),

  g('combination', 'sim', 'Sim', 'Сим', true),
  g('combination', 'teeko', 'Teeko', 'Тико', true),
  g('combination', 'neighbors', 'Neighbors', 'Соседи', true),
  g('combination', 'corners', 'Corners', 'Уголки', true),
  g('combination', 'amazons', 'Amazons', 'Амазонки', true),
  g('combination', 'turning-points', 'Turning Points', 'Поворотные точки'),
  g('combination', 'domineering', 'Domineering', 'Доминирование'),
  g('combination', 'hold-that-line', 'Hold That Line', 'Держи линию'),
  g('combination', 'cats-and-dogs', 'Cats and Dogs', 'Кошки и собаки'),
  g('combination', 'row-call', 'Row Call', 'Перекличка'),

  g('risk', 'undercut', 'Undercut', 'Подрезка', true),
  g('risk', 'arpeggios', 'Arpeggios', 'Арпеджио', true),
  g('risk', 'outrangeous', 'Outrangeous', 'Вне диапазона', true),
  g('risk', 'paper-boxing', 'Paper Boxing', 'Бумажный бокс', true),
  g('risk', 'racetrack', 'Racetrack', 'Гонки на бумаге', true),
  g('risk', 'pig', 'Pig', 'Свинья'),
  g('risk', 'crossed', 'Crossed', 'Перекрёсток'),
  g('risk', 'rpsls', 'Rock, Paper, Scissors, Lizard, Spock', 'Камень, ножницы, бумага, ящерица, Спок'),
  g('risk', '101-and-youre-done', '101 and You’re Done', '101 — и хватит'),
  g('risk', 'the-con-game', 'The Con Game', 'Афера'),
  g('risk', 'breaking-rank', 'Breaking Rank', 'Вне строя'),

  g('information', 'bullseyes-and-close-calls', 'Bullseyes and Close Calls', 'В яблочко и почти', true),
  g('information', 'caveat-emptor', 'Caveat Emptor', 'Caveat Emptor', true),
  g('information', 'lap', 'LAP', 'LAP', true),
  g('information', 'quantum-go-fish', 'Quantum Go Fish', 'Квантовая рыбалка', true),
  g('information', 'saesara', 'Saesara', 'Саэсара', true),
  g('information', 'battleship', 'Battleship', 'Морской бой'),
  g('information', 'quantum-hangman', 'Quantum Hangman', 'Квантовая виселица'),
  g('information', 'buried-treasure', 'Buried Treasure', 'Зарытый клад'),
  g('information', 'patterns-ii', 'Patterns II', 'Узоры II'),
  g('information', 'win-lose-banana', 'Win, Lose, Banana', 'Победа, поражение, банан'),
  g('information', 'franco-prussian-labyrinth', 'Franco-Prussian Labyrinth', 'Франко-прусский лабиринт'),
];
// Player counts supported on the site: [min, max].
const PLAYERS = {
  chopsticks: [2, 4], '33-to-99': [2, 5], pennywise: [2, 6], mediocrity: [3, 3], starlitaire: [1, 1],
  'tax-collector': [1, 1], neighbors: [1, 4], outrangeous: [2, 6], pig: [2, 8], '101-and-youre-done': [2, 4],
  'the-con-game': [2, 4], 'caveat-emptor': [2, 8], 'quantum-go-fish': [3, 8], saesara: [1, 4],
  'patterns-ii': [1, 5], 'win-lose-banana': [3, 3],
};
for (const x of GAMES) x.players = PLAYERS[x.slug] || [2, 2];

// Games still in progress (everything else in GAMES is playable).
const NOT_READY = [];
for (const x of GAMES) if (!NOT_READY.includes(x.slug)) x.status = 'ready';
