import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'q3.title': 'Объёмные крестики-нолики',
  'q3.tagline': 'четыре в ряд — вдоль, поперёк и сквозь все этажи',
  'q3.mode': 'Играем:',
  'q3.mode.pvp': 'вдвоём',
  'q3.mode.easy': 'с компьютером (простой)',
  'q3.mode.normal': 'с компьютером (обычный)',
  'q3.mode.hard': 'с компьютером (хитрый)',
  'q3.rules': 'Правила:',
  'q3.rules.free': 'обычные',
  'q3.rules.gravity': 'с гравитацией',
  'q3.hints': 'Подсказки:',
  'q3.hints.off': 'нет',
  'q3.hints.on': 'показывать угрозы',
  'q3.again': 'ещё раз!',
  'q3.p0': 'Синий',
  'q3.p1': 'Красный',
  'q3.cpu': 'Компьютер',
  'q3.wins': ['победа', 'победы', 'побед'],
  'q3.layer': 'слой {n}',
  'q3.top': 'верх',
  'q3.bottom': 'низ',
  'q3.turn': 'Ходит {name}',
  'q3.thinking': '{name} думает…',
  'q3.turn.you': 'Ваш ход',
  'q3.turn.them': 'Ходит {name}…',
  'q3.first': '{name} начинает',
  'q3.online.wait': 'Ждём второго игрока…',
  'q3.online.note': 'Сейчас идёт игра по сети: новую партию начинает и правила выбирает создатель комнаты.',
  'q3.online.waitnew': 'Новую партию запустит {name}',
  'q3.win': 'Побеждает {name}!',
  'q3.win.cross': 'четвёрка прошла сквозь все слои',
  'q3.win.flat': 'четвёрка в одном слое',
  'q3.tie': 'Ничья!',
  'q3.tie.sub': 'всё поле заполнено, а четвёрки нет',
  'q3.next': 'следующую партию начинает {name}',
  'q3.say.threat': ['Три в ряд!', 'Осторожно!', 'Видишь?', 'Хе-хе'],
  'q3.say.fork': ['Вилка!', 'Две угрозы!', 'Попробуй закрой!'],
  'q3.say.uhoh': ['Ой-ой', 'Где? Где?!', 'Хм…'],
  'q3.say.block': ['Не пройдёт!', 'Закрыто!', 'Не-а', 'Вижу!'],
  'q3.say.blocked': ['Эх', 'Заметно было?', 'Ну вот'],
  'q3.say.win': ['Ура!', 'Четыре!', 'Победа!'],
  'q3.say.wincross': ['Насквозь!', 'Сквозь все слои!', 'В объёме!'],
  'q3.say.lose': ['Реванш?', 'Откуда это?!', 'В следующий раз…'],
  'q3.say.tie': ['Ничья?!', 'Тесно тут', 'Ни туда ни сюда'],
  'q3.h.how': 'Как играть',
  'q3.how': `
    <p><b>Что нужно:</b> двое и куб 4 × 4 × 4. Куб на бумаге не нарисуешь, поэтому его режут на четыре слоя: четыре поля 4 × 4, сложенных стопкой. Слой 1 — верхний, слой 4 — нижний.</p>
    <p><b>Цель:</b> первым поставить четыре своих знака в ряд.</p>
    <ol>
      <li>Ходите по очереди: синий ставит крестики, красный — нолики. Нажмите на любую свободную клетку любого слоя.</li>
      <li>Ряд может лежать в одном слое — по горизонтали, вертикали или диагонали. А может <b>пронзать все четыре слоя</b>: одна и та же клетка на каждом слое, «лесенка», которая с каждым слоем сдвигается на клетку, или большая диагональ куба из угла в угол.</li>
      <li>Кто первым соберёт четвёрку — побеждает. Если поле заполнено, а четвёрки нет, — ничья. Партии начинают по очереди.</li>
    </ol>
    <p class="tip"><b>С гравитацией</b> (в настройках): знак можно поставить только на нижний слой или прямо над уже занятой клеткой — как будто знаки падают на дно. Получаются объёмные «четыре в ряд».</p>`,
  'q3.h.tips': 'Хитрости',
  'q3.tips': `
    <ul>
      <li>Посчитайте для каждой клетки, сколько четвёрок через неё проходит. У восьми углов куба и восьми клеток в самой его середине (центр двух средних слоёв) — по <b>7</b> линий, у всех остальных — по 4. Эти 16 клеток самые ценные: занимайте их первыми.</li>
      <li>Чаще всего проигрывают от <b>сквозных</b> рядов. Прежде чем ходить, проверьте ту же клетку на соседних слоях и «лесенки» через них. Мышью наведите на клетку — такие же места подсветятся на других слоях.</li>
      <li><b>Вилка</b> — ход, после которого у вас сразу две угрозы (три в ряд с пустой четвёртой клеткой). Закрыть обе соперник не успеет.</li>
      <li>Сильные игроки строят <b>цепочки угроз</b>: каждый ход заставляет соперника закрываться, а последний создаёт вилку. Хитрый компьютер ищет такие цепочки.</li>
      <li>С гравитацией: не ставьте знак прямо под клеткой, где сопернику не хватает одного знака, — вы подставите ему эту клетку.</li>
    </ul>
    <p class="tip">В настройках можно включить подсказки: пустые клетки, где кто-то может закончить четвёрку, отметятся кружком его цвета.</p>`,
  'q3.h.origin': 'Откуда игра',
  'q3.origin': `
    <p>Крестики-нолики на кубе 4 × 4 × 4 известны как минимум с середины XX века. В 1960-х игра продавалась в коробке с прозрачными пластиковыми слоями под названием <i>Qubic</i>, а в 1980 году вышла видеоигрой для приставки Atari.</p>
    <p>На маленьком поле 3 × 3 × 3 игра бессмысленна: первый игрок выигрывает, просто заняв центр. А вот на 4 × 4 × 4 всё сложнее — но и здесь в 1980 году Орен Паташник с помощью долгого компьютерного перебора доказал, что начинающий при безошибочной игре всегда может победить. Людям, к счастью, до безошибочной игры далеко.</p>
    <p>Вариант с гравитацией похож на «Четыре в ряд», только в объёме: такие игры с бусинами на штырьках тоже выпускались. Попробуйте придумать, какие ещё игры можно «надуть» до трёх измерений: морской бой переносится легко, точки и квадраты — тоже (клетку-кубик забирает тот, кто провёл двенадцатое ребро), а вот некоторые игры в объёме просто перестают работать.</p>`,
});

addStrings('en', {
  'q3.title': '3D Tic-Tac-Toe',
  'q3.tagline': 'four in a row — across, along and down through the layers',
  'q3.mode': 'Play:',
  'q3.mode.pvp': 'two players',
  'q3.mode.easy': 'vs computer (easy)',
  'q3.mode.normal': 'vs computer (normal)',
  'q3.mode.hard': 'vs computer (sneaky)',
  'q3.rules': 'Rules:',
  'q3.rules.free': 'classic',
  'q3.rules.gravity': 'with gravity',
  'q3.hints': 'Hints:',
  'q3.hints.off': 'off',
  'q3.hints.on': 'show threats',
  'q3.again': 'again!',
  'q3.p0': 'Blue',
  'q3.p1': 'Red',
  'q3.cpu': 'Computer',
  'q3.wins': ['win', 'wins'],
  'q3.layer': 'layer {n}',
  'q3.top': 'top',
  'q3.bottom': 'bottom',
  'q3.turn': '{name} to move',
  'q3.thinking': '{name} is thinking…',
  'q3.turn.you': 'Your move',
  'q3.turn.them': '{name} is moving…',
  'q3.first': '{name} goes first',
  'q3.online.wait': 'Waiting for the other player…',
  'q3.online.note': 'You’re playing online: the room creator starts new games and picks the rules.',
  'q3.online.waitnew': '{name} will start the next game',
  'q3.win': '{name} wins!',
  'q3.win.cross': 'the four ran through every layer',
  'q3.win.flat': 'four in a row on one layer',
  'q3.tie': 'A tie!',
  'q3.tie.sub': 'the board is full and nobody got four',
  'q3.next': '{name} starts the next game',
  'q3.say.threat': ['Three in a row!', 'Careful!', 'See that?', 'Heh'],
  'q3.say.fork': ['A fork!', 'Two threats!', 'Block both!'],
  'q3.say.uhoh': ['Uh-oh', 'Where? Where?!', 'Hmm…'],
  'q3.say.block': ['Not today!', 'Blocked!', 'Nope', 'I see it!'],
  'q3.say.blocked': ['Darn', 'Was it that obvious?', 'Oh well'],
  'q3.say.win': ['Hooray!', 'Four!', 'Victory!'],
  'q3.say.wincross': ['Right through!', 'All four layers!', 'In 3D!'],
  'q3.say.lose': ['Rematch?', 'Where did that come from?!', 'Next time…'],
  'q3.say.tie': ['A tie?!', 'Crowded in here', 'Stalemate'],
  'q3.h.how': 'How to play',
  'q3.how': `
    <p><b>You need:</b> two players and a 4 × 4 × 4 cube. A cube is hard to draw on paper, so slice it into four layers: four 4 × 4 grids stacked on top of each other. Layer 1 is the top, layer 4 the bottom.</p>
    <p><b>Goal:</b> be first to get four of your marks in a row.</p>
    <ol>
      <li>Take turns: blue plays X, red plays O. Tap any empty cell on any layer.</li>
      <li>A row can lie inside one layer — across, down or diagonally. Or it can <b>pierce all four layers</b>: the same cell on every layer, a “staircase” that shifts one cell per layer, or a great diagonal of the cube from corner to corner.</li>
      <li>The first to make four wins. If the board fills up with no four, it’s a tie. Players take turns going first.</li>
    </ol>
    <p class="tip"><b>With gravity</b> (in settings): you may only play on the bottom layer or directly above a filled cell — as if marks fell to the floor. It turns the game into a 3D Connect Four.</p>`,
  'q3.h.tips': 'Tricks',
  'q3.tips': `
    <ul>
      <li>Count how many fours pass through each cell. The eight corners of the cube and the eight cells at its very heart (the centres of the two middle layers) lie on <b>7</b> lines each; every other cell lies on just 4. Grab those 16 cells first.</li>
      <li>Most games are lost to rows that <b>cut through the layers</b>. Before moving, check the same spot on the other layers and the staircases through it. Hover a cell with the mouse and its twins light up on the other layers.</li>
      <li>A <b>fork</b> is a move that makes two threats at once (three in a row with the fourth cell empty). Your opponent can only block one.</li>
      <li>Strong players build <b>chains of threats</b>: every move forces a block, and the last one makes a fork. The sneaky computer hunts for those chains.</li>
      <li>With gravity: never play right below a cell your opponent needs to finish a row — you’d be handing it over.</li>
    </ul>
    <p class="tip">Turn on hints in settings: empty cells where someone can complete a four get a circle in that player’s colour.</p>`,
  'q3.h.origin': 'Where it comes from',
  'q3.origin': `
    <p>Tic-tac-toe on a 4 × 4 × 4 cube has been around since at least the middle of the 20th century. In the 1960s it was sold as a boxed game with clear plastic layers called <i>Qubic</i>, and in 1980 it became a video game for the Atari console.</p>
    <p>On a small 3 × 3 × 3 cube the game is pointless: the first player wins just by taking the centre. 4 × 4 × 4 is much richer — yet even here, in 1980, Oren Patashnik used a long computer search to prove that the first player can always force a win with perfect play. Luckily, humans are nowhere near perfect.</p>
    <p>The gravity variant is Connect Four in 3D — versions with beads dropped onto pegs have been sold too. Try inventing 3D versions of other games: Battleship moves up a dimension easily, so does Dots and Boxes (you claim a little cube by drawing its twelfth edge), while some games simply stop working in three dimensions.</p>`,
});
