import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'tk.title': 'Тико',
  'tk.tagline': 'четыре фишки, пять на пять — и победа, которая выскакивает из ниоткуда',
  'tk.mode': 'Играем:',
  'tk.mode.pvp': 'вдвоём',
  'tk.mode.easy': 'с компьютером (простой)',
  'tk.mode.normal': 'с компьютером (обычный)',
  'tk.mode.hard': 'с компьютером (сильный)',
  'tk.variant': 'Квадраты:',
  'tk.variant.advanced': 'любого размера',
  'tk.variant.classic': 'только 2 × 2',
  'tk.warn': 'Предупреждать «шах»:',
  'tk.warn.on': 'да',
  'tk.warn.off': 'нет',
  'tk.again': 'ещё раз!',
  'tk.p0': 'Синий',
  'tk.p1': 'Красный',
  'tk.cpu': 'Компьютер',
  'tk.hand': 'в запасе:',
  'tk.onboard': 'все фишки на поле',
  'tk.turn.drop': '{name} ставит фишку',
  'tk.turn.move': '{name} двигает фишку',
  'tk.you.drop': 'Ваш ход: поставьте фишку',
  'tk.you.move': 'Ваш ход: сдвиньте фишку',
  'tk.thinking': '{name} думает…',
  'tk.turn.them': 'Ходит {name}…',
  'tk.check': 'Шах! {name} грозит победой',
  'tk.online.wait': 'Ждём второго игрока…',
  'tk.online.note': 'Сейчас идёт игра по сети: новую партию начинает и правила выбирает создатель комнаты.',
  'tk.online.waitnew': 'Ждём, когда {name} запустит новую партию',
  'tk.win': 'Побеждает {name}!',
  'tk.draw': 'Ничья!',
  'tk.why.line': 'Четыре в ряд',
  'tk.why.square': 'Квадрат {k} × {k}',
  'tk.why.repeat': 'Позиция повторилась трижды',
  'tk.why.stuck': 'Ходить некуда',
  'tk.next': 'Следующую партию начинает {name}',
  'tk.say.check': ['Шах!', 'Осторожно!', 'Чую победу', 'Шах-шах!'],
  'tk.say.gift': ['Спасибо!', 'Ага!', 'Хе-хе…'],
  'tk.say.oops': ['Ой…', 'Ой-ой', 'Упс'],
  'tk.say.block': ['Не пройдёт!', 'Закрыто!', 'Не сегодня', 'Вижу-вижу'],
  'tk.say.worried': ['Хм…', 'Так-так…', 'Опасно…'],
  'tk.say.fork': ['Две угрозы!', 'Вилка!', 'Попался!'],
  'tk.say.win': ['Ура!', 'Бинго!', 'Победа!', 'Та-дам!'],
  'tk.say.lose': ['Откуда это?!', 'Реванш?', 'Эх…', 'Как так?!'],
  'tk.say.draw': ['По кругу…', 'Ну, ничья'],
  'tk.h.how': 'Как играть',
  'tk.how': `
    <p><b>Что нужно:</b> двое, поле 5 × 5 и по четыре фишки своего цвета.</p>
    <p><b>Цель:</b> выстроить свои четыре фишки <b>в ряд</b> или поставить их <b>в углы квадрата</b>.</p>
    <ol>
      <li><b>Расстановка.</b> По очереди ставьте фишки на любые пустые клетки, пока у каждого на поле не окажется по четыре.</li>
      <li><b>Ходы.</b> Дальше по очереди сдвигайте одну свою фишку на <b>соседнюю</b> пустую клетку — по горизонтали, вертикали или диагонали. Брать фишки нельзя, пропускать ход тоже.</li>
      <li><b>Победа</b> — четыре фишки подряд по любой линии (горизонталь, вертикаль, диагональ) или четыре угла квадрата со сторонами вдоль сетки: от 2 × 2 до 5 × 5. Повёрнутые квадраты не считаются.</li>
    </ol>
    <p>В настройках можно выбрать классический вариант, где из квадратов засчитываются только 2 × 2. Чтобы игра не тянулась бесконечно, у нас <b>троекратное повторение</b> одной и той же позиции — ничья.</p>
    <p class="hand">Расставить фишку — нажмите на пустую клетку. Сдвинуть — нажмите на свою фишку, потом на клетку рядом.</p>`,
  'tk.h.tips': 'Хитрости',
  'tk.tips': `
    <ul>
      <li>Центр и клетки рядом с ним участвуют в большем числе рядов и квадратов — с них удобно начинать.</li>
      <li>Уже на расстановке следите за тройками соперника: три фишки и пустая четвёртая клетка — это угроза.</li>
      <li>Лучший удар — <b>вилка</b>: одним ходом создать две угрозы сразу. Закрыть обе нельзя.</li>
      <li>Не забывайте про большие квадраты: углы 3 × 3 или 4 × 4 замечают реже всего.</li>
    </ul>
    <p class="tip"><b>Правило «шах».</b> Победа в Тико приходит внезапно. Чтобы обойтись без досадных сюрпризов, можно договориться объявлять «шах», когда до победы остаётся один ход. Здесь это делает сама игра: клетка-угроза подсвечивается. Подсказку можно выключить в настройках.</p>`,
  'tk.h.origin': 'Откуда игра',
  'tk.origin': `
    <p>Тико придумал Джон Скарни — фокусник, знаток карточных игр и азарта. Он напечатал правила в 1937 году и шлифовал их ещё несколько десятилетий. Скарни верил, что его игра встанет в один ряд с шахматами и шашками, и даже назвал в её честь сына. В 1950-е в Тико играли голливудские звёзды, но потом игра почти забылась.</p>
    <p>Сам Скарни описывал Тико как смесь крестиков-ноликов (расстановка), шашек и шахмат (ходы во все стороны) и бинго (выигрышные фигуры).</p>
    <p><b>Родственники и варианты:</b></p>
    <ul>
      <li><b>Классический Тико</b> — побеждают только квадраты 2 × 2 (есть в настройках). Здесь на странице по умолчанию «продвинутая» версия с квадратами любого размера. В 1998 году Гай Стил перебрал игру на компьютере: при идеальной игре «продвинутую» версию выигрывает начинающий, а классическая — ничья.</li>
      <li><b>Ачи</b> — старинная игра из Ганы: поле 3 × 3, по четыре фишки, сначала расстановка, потом ходы, а победа — три в ряд.</li>
      <li><b>Шахматы из одних ферзей</b> — по шесть фишек, которые ходят как ферзь на любое расстояние; выигрывают только четыре в ряд.</li>
    </ul>`,
});

addStrings('en', {
  'tk.title': 'Teeko',
  'tk.tagline': 'four tokens, five by five, and a win that pops out of nowhere',
  'tk.mode': 'Play:',
  'tk.mode.pvp': 'two players',
  'tk.mode.easy': 'vs computer (easy)',
  'tk.mode.normal': 'vs computer (normal)',
  'tk.mode.hard': 'vs computer (strong)',
  'tk.variant': 'Squares:',
  'tk.variant.advanced': 'any size',
  'tk.variant.classic': '2 × 2 only',
  'tk.warn': 'Call “check”:',
  'tk.warn.on': 'yes',
  'tk.warn.off': 'no',
  'tk.again': 'again!',
  'tk.p0': 'Blue',
  'tk.p1': 'Red',
  'tk.cpu': 'Computer',
  'tk.hand': 'in hand:',
  'tk.onboard': 'all on the board',
  'tk.turn.drop': '{name}: place a token',
  'tk.turn.move': '{name}: move a token',
  'tk.you.drop': 'Your turn: place a token',
  'tk.you.move': 'Your turn: move a token',
  'tk.thinking': '{name} is thinking…',
  'tk.turn.them': '{name} is moving…',
  'tk.check': 'Check! {name} threatens to win',
  'tk.online.wait': 'Waiting for the other player…',
  'tk.online.note': 'You’re playing online: the room creator starts new games and picks the rules.',
  'tk.online.waitnew': 'Waiting for {name} to set up a new game',
  'tk.win': '{name} wins!',
  'tk.draw': 'A draw!',
  'tk.why.line': 'Four in a row',
  'tk.why.square': 'A {k} × {k} square',
  'tk.why.repeat': 'Same position three times',
  'tk.why.stuck': 'No moves left',
  'tk.next': '{name} starts the next game',
  'tk.say.check': ['Check!', 'Careful!', 'Watch out!', 'Check-check!'],
  'tk.say.gift': ['Ooh, thanks!', 'An opening!', 'Heh heh…'],
  'tk.say.oops': ['Oops…', 'Whoops', 'Uh-oh'],
  'tk.say.block': ['Not so fast!', 'Blocked!', 'Not today', 'I see you'],
  'tk.say.worried': ['Hmm…', 'Well, well…', 'Risky…'],
  'tk.say.fork': ['Two threats!', 'A fork!', 'Got you!'],
  'tk.say.win': ['Hooray!', 'Bingo!', 'Victory!', 'Ta-da!'],
  'tk.say.lose': ['Where from?!', 'Rematch?', 'Ugh…', 'Missed it!'],
  'tk.say.draw': ['Déjà vu!', 'A draw it is'],
  'tk.h.how': 'How to play',
  'tk.how': `
    <p><b>You need:</b> two players, a 5 × 5 board and four tokens each in your own color.</p>
    <p><b>Goal:</b> get your four tokens <b>in a row</b> or onto <b>the corners of a square</b>.</p>
    <ol>
      <li><b>Placing.</b> Take turns putting a token on any empty cell until each player has four on the board.</li>
      <li><b>Moving.</b> Then take turns sliding one of your tokens to a <b>neighboring</b> empty cell — sideways, up/down or diagonally. No captures, no passing.</li>
      <li><b>You win</b> with four in a line (across, down or diagonal) or with the four corners of a square whose sides follow the grid: anything from 2 × 2 to 5 × 5. Tilted squares don’t count.</li>
    </ol>
    <p>Settings also offer the classic variant, where only 2 × 2 squares count. So games can’t go on forever, we call it a <b>draw if the same position comes up three times</b>.</p>
    <p class="hand">To place, tap an empty cell. To move, tap your token, then a cell next to it.</p>`,
  'tk.h.tips': 'Tricks',
  'tk.tips': `
    <ul>
      <li>The center and the cells around it belong to the most lines and squares — good places to start.</li>
      <li>Watch for triples already while placing: three of their tokens plus an empty fourth cell is a threat.</li>
      <li>The killer move is a <b>fork</b>: one move that makes two threats at once. Nobody can block both.</li>
      <li>Don’t forget big squares: 3 × 3 and 4 × 4 corners are the ones people miss.</li>
    </ul>
    <p class="tip"><b>The “check” rule.</b> Teeko wins come out of nowhere. To avoid silly surprises, you can agree to say “check” whenever you’re one move from winning. Here the game does it for you: the threatened cell lights up. You can switch this off in settings.</p>`,
  'tk.h.origin': 'Where it comes from',
  'tk.origin': `
    <p>Teeko was invented by John Scarne — magician, card expert and gambling authority. He published it in 1937 and kept polishing the rules for decades. Scarne was sure his game would stand next to chess and checkers, and he even named his son after it. In the 1950s Hollywood stars played it, but the craze faded and the game is little known today.</p>
    <p>Scarne himself described Teeko as a mix of tic-tac-toe (the placing), checkers and chess (moving in every direction), and bingo (the winning shapes).</p>
    <p><b>Relatives and variants:</b></p>
    <ul>
      <li><b>Classic Teeko</b> — only 2 × 2 squares win (available in settings). This page defaults to the “advanced” version with squares of any size. In 1998 Guy Steele solved the game by computer: with perfect play the advanced version is a win for the first player, while the classic one is a draw.</li>
      <li><b>Achi</b> — a traditional game from Ghana: a 3 × 3 board, four tokens each, placing then moving, and three in a row wins.</li>
      <li><b>All Queens Chess</b> — six pieces each that move like chess queens, any distance; only four in a row wins.</li>
    </ul>`,
});
