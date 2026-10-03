import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'tp.title': 'Поворотные точки',
  'tp.tagline': 'одна рыбка толкнёт другую — и пошла карусель',
  'tp.size': 'Поле:',
  'tp.mode': 'Играем:',
  'tp.mode.pvp': 'вдвоём',
  'tp.mode.easy': 'с компьютером (простой)',
  'tp.mode.normal': 'с компьютером (обычный)',
  'tp.mode.hard': 'с компьютером (хитрый)',
  'tp.again': 'ещё раз!',
  'tp.p0': 'Синий',
  'tp.p1': 'Красный',
  'tp.cpu': 'Компьютер',
  'tp.pts': ['очко', 'очка', 'очков'],
  'tp.side0': 'берег Синего',
  'tp.side1': 'берег Красного',
  'tp.turn': 'Ходит {name}',
  'tp.turn.pick': '{name}: куда смотрит рыбка?',
  'tp.thinking': '{name} думает…',
  'tp.turn.you': 'Ваш ход',
  'tp.turn.you.pick': 'Куда смотрит рыбка?',
  'tp.turn.them': 'Ходит {name}…',
  'tp.online.wait': 'Ждём второго игрока…',
  'tp.online.note': 'Сейчас идёт игра по сети: новую партию начинает и размер поля выбирает создатель комнаты.',
  'tp.online.waitnew': 'Новую партию начнёт {name}',
  'tp.win': 'Побеждает {name}!',
  'tp.tie': 'Ничья!',
  'tp.final': 'Счёт {a} : {b}',
  'tp.next': 'Следующую партию начинает {name}',
  'tp.say.gain': ['Ага!', 'Плыви ко мне!', 'Вот так', 'Моя рыбка!', 'Поворачивай!'],
  'tp.say.big': ['Карусель!', 'Вжух-вжух-вжух!', 'Целая цепочка!', 'Голова кружится!'],
  'tp.say.ouch': ['Эй!', 'Куда поплыла?', 'Ну вот…', 'Моя же рыбка!'],
  'tp.say.oops': ['Ой… не туда', 'Это я зря', 'Хм, неудачно'],
  'tp.say.win': ['Ура!', 'Все рыбки мои!', 'Победа!'],
  'tp.say.lose': ['Реванш?', 'Уплыли…', 'В следующий раз'],
  'tp.say.tie': ['Ничья!', 'Поровну'],
  'tp.h.how': 'Как играть',
  'tp.how': `
    <p><b>Что нужно:</b> двое, квадратное поле (4 × 4 — быстро, 6 × 6 — подольше) и фишки, у которых видно, куда они «смотрят». У нас это рыбки.</p>
    <p><b>Берега:</b> левый край поля — <b class="blue">Синего</b>, правый — <b class="red">Красного</b>. Рыбки ничьи: в конце каждая рыбка, которая смотрит на ваш берег, приносит вам очко.</p>
    <ol>
      <li>По очереди ставьте рыбку на пустую клетку носом к одной из четырёх соседних клеток (по диагонали нельзя). Нажмите клетку, потом стрелку. Мышью можно сразу щёлкнуть по нужной стороне клетки.</li>
      <li>Если рыбка смотрит на <b>занятую</b> клетку, та рыбка <b>поворачивается на 90° по часовой стрелке</b>.</li>
      <li>Если повёрнутая рыбка теперь смотрит на другую рыбку — поворачивается и та. И так дальше, пока очередная рыбка не уткнётся в пустую клетку или край поля.</li>
      <li>Когда поле заполнено, считаем: рыбки носом влево — очки Синего, носом вправо — очки Красного, вверх и вниз — ничьи. У кого больше, тот победил.</li>
    </ol>`,
  'tp.h.tips': 'Хитрости',
  'tp.tips': `
    <ul>
      <li>Толчок идёт дальше, только если рыбка <b>после поворота</b> смотрит на соседа. Поверните её мысленно на четверть оборота по часовой стрелке — и так по цепочке до конца, прежде чем ставить.</li>
      <li>Рыбка, смотрящая <b>вниз</b>, после поворота посмотрит влево (к Синему), а смотрящая <b>вверх</b> — вправо (к Красному). Ничейная рыбка может быть «почти вашей».</li>
      <li>Рыбка носом в край или в пустую клетку никого не толкает. Это «тихий» ход: полезен, когда любой толчок сыграл бы на соперника.</li>
      <li>Пустая клетка рядом с вашими рыбками — дыра в обороне: оттуда сопернику удобно их толкнуть. Последние ходы решают многое: под конец считайте точно.</li>
    </ul>
    <p class="tip"><b>Другие варианты.</b> Вчетвером играют на том же поле, но каждому достаётся своя сторона. Втроём или вшестером берут шестиугольное поле из шестиугольных клеток, и фишки поворачиваются не на 90°, а на 60°.</p>`,
  'tp.h.origin': 'Откуда игра',
  'tp.origin': `
    <p>Игру придумал геймдизайнер Джо Кизенветер. Он советует рисовать стрелки на картонных фишках от покера, а Бен Орлин — играть крекерами-рыбками, которые как раз «смотрят» в одну сторону. Отсюда и наши рыбки.</p>
    <p>Это игра про цепные реакции: один ход может запустить волну поворотов через всё поле. Кажется, что такая волна может крутиться вечно, — но любая цепочка рано или поздно обрывается: очередная фишка упрётся в пустую клетку или край.</p>`,
});

addStrings('en', {
  'tp.title': 'Turning Points',
  'tp.tagline': 'one fish nudges another, and round they go',
  'tp.size': 'Board:',
  'tp.mode': 'Play:',
  'tp.mode.pvp': 'two players',
  'tp.mode.easy': 'vs computer (easy)',
  'tp.mode.normal': 'vs computer (normal)',
  'tp.mode.hard': 'vs computer (sneaky)',
  'tp.again': 'again!',
  'tp.p0': 'Blue',
  'tp.p1': 'Red',
  'tp.cpu': 'Computer',
  'tp.pts': ['point', 'points'],
  'tp.side0': 'Blue’s shore',
  'tp.side1': 'Red’s shore',
  'tp.turn': '{name} to move',
  'tp.turn.pick': '{name}: which way does it face?',
  'tp.thinking': '{name} is thinking…',
  'tp.turn.you': 'Your move',
  'tp.turn.you.pick': 'Which way does it face?',
  'tp.turn.them': '{name} is moving…',
  'tp.online.wait': 'Waiting for the other player…',
  'tp.online.note': 'You’re playing online: the room creator starts new games and picks the board size.',
  'tp.online.waitnew': '{name} will start the next game',
  'tp.win': '{name} wins!',
  'tp.tie': 'A tie!',
  'tp.final': 'Score {a} : {b}',
  'tp.next': '{name} moves first next game',
  'tp.say.gain': ['Aha!', 'Swim to me!', 'Like that', 'My fish!', 'Turn around!'],
  'tp.say.big': ['Merry-go-round!', 'Whoosh!', 'A whole chain!', 'I’m dizzy!'],
  'tp.say.ouch': ['Hey!', 'Come back, fish!', 'Oh no…', 'That was mine!'],
  'tp.say.oops': ['Oops… wrong way', 'Own goal', 'Hmm, not great'],
  'tp.say.win': ['Hooray!', 'All the fish are mine!', 'Victory!'],
  'tp.say.lose': ['Rematch?', 'They swam off…', 'Next time'],
  'tp.say.tie': ['A tie!', 'Even'],
  'tp.h.how': 'How to play',
  'tp.how': `
    <p><b>You need:</b> two players, a square board (4 × 4 for a quick game, 6 × 6 for a longer one) and pieces that clearly face one way. Ours are fish.</p>
    <p><b>Shores:</b> the left edge belongs to <b class="blue">Blue</b>, the right edge to <b class="red">Red</b>. The fish belong to nobody: at the end, every fish facing your shore is a point for you.</p>
    <ol>
      <li>Take turns putting a fish on an empty square, nose toward one of its four neighbours (no diagonals). Tap a square, then an arrow. With a mouse you can click straight on the side of the square you want.</li>
      <li>If the fish faces an <b>occupied</b> square, the fish there <b>turns 90° clockwise</b>.</li>
      <li>If the turned fish now faces another fish, that one turns too — and so on, until a fish faces an empty square or the edge.</li>
      <li>When the board is full, count: fish facing left score for Blue, fish facing right for Red, up and down for nobody. More points wins.</li>
    </ol>`,
  'tp.h.tips': 'Tricks',
  'tp.tips': `
    <ul>
      <li>A push travels on only if the fish, <b>after its turn</b>, faces a neighbour. Turn it a quarter clockwise in your head, and follow the chain to its end before you place.</li>
      <li>A fish facing <b>down</b> turns to face left (Blue) when hit; one facing <b>up</b> turns right (Red). A neutral fish can be “almost yours”.</li>
      <li>A fish facing the edge or an empty square pushes nobody. That’s a “quiet” move, handy when any push would help your opponent.</li>
      <li>An empty square next to your fish is a hole in your defence: your opponent can push from there. The last few moves decide a lot, so count carefully at the end.</li>
    </ul>
    <p class="tip"><b>Other versions.</b> Four players use the same board, one side each. For three or six, play on a hexagonal board made of hexagons, and pieces turn by 60° instead of 90°.</p>`,
  'tp.h.origin': 'Where it comes from',
  'tp.origin': `
    <p>The game was invented by game designer Joe Kisenwether. He suggests drawing arrows on cardboard poker chips; Ben Orlin prefers fish-shaped crackers, which conveniently point one way. Hence our fish.</p>
    <p>It’s a game of chain reactions: one move can send a wave of turns across the whole board. It feels like such a wave could spin forever — but every chain does stop sooner or later, when a piece ends up facing an empty square or the edge.</p>`,
});
