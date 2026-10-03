import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'seq.title': 'Секвенциум',
  'seq.tagline': 'два числовых побега растут наперегонки',
  'seq.size': 'Поле:',
  'seq.size.6': '6 × 6',
  'seq.size.7': '7 × 7, без центра',
  'seq.size.8': '8 × 8',
  'seq.order': 'Ходы:',
  'seq.order.alt': 'по одному: АБАБ…',
  'seq.order.double': 'по два: АББААББ…',
  'seq.order.tm': 'Туэ — Морс: АББАБААБ…',
  'seq.mode': 'Играем:',
  'seq.mode.pvp': 'вдвоём',
  'seq.mode.easy': 'с компьютером (простой)',
  'seq.mode.normal': 'с компьютером (обычный)',
  'seq.mode.hard': 'с компьютером (хитрый)',
  'seq.order.note': 'Порядок ходов меняет баланс: при «по одному» у начинающего заметное преимущество. Подробности — в «Хитростях».',
  'seq.again': 'ещё раз!',
  'seq.p0': 'Синий',
  'seq.p1': 'Красный',
  'seq.cpu': 'Компьютер',
  'seq.top': 'максимум {n}',
  'seq.turn': 'Ходит {name}',
  'seq.turn.two': '{name}: первый из двух ходов',
  'seq.turn.again': '{name}: ещё один ход',
  'seq.turn.alone': 'Сопернику некуда ходить — {name} заполняет поле',
  'seq.you': 'Ваш ход',
  'seq.you.two': 'Ваш ход (первый из двух)',
  'seq.you.again': 'Ваш ход ещё раз',
  'seq.thinking': '{name} думает…',
  'seq.turn.them': 'Ходит {name}…',
  'seq.hint.pick': 'Теперь выберите клетку рядом с {n}',
  'seq.online.wait': 'Ждём второго игрока…',
  'seq.online.note': 'Сейчас идёт игра по сети: новую партию начинает и правила выбирает создатель комнаты.',
  'seq.online.waitnew': 'Ждём, пока {name} нажмёт «ещё раз»',
  'seq.next': 'Следующую партию начинает {name}',
  'seq.win': 'Побеждает {name}!',
  'seq.tie': 'Ничья!',
  'seq.score': '{a} против {b}',
  'seq.say.space': ['Простор!', 'Тут всё моё', 'Расту!', 'Красота'],
  'seq.say.cut': ['Не пролезешь!', 'Стоп!', 'Перекрыто', 'Сюда нельзя'],
  'seq.say.ouch': ['Эй!', 'Зажали…', 'Ой-ой', 'Тесновато'],
  'seq.say.lead': ['Я впереди!', 'Рекорд!', 'Выше!'],
  'seq.say.stuck': ['Некуда ходить…', 'Я в тупике', 'Заперли…'],
  'seq.say.alone': ['Поле моё!', 'Не спеша…', 'Ещё, ещё…'],
  'seq.say.win': ['Ура!', 'Выросло!', 'Я гений'],
  'seq.say.lose': ['Реванш?', 'В следующий раз…', 'Ну и ладно'],
  'seq.say.tie': ['Поровну!', 'Ничья?!'],
  'seq.h.how': 'Как играть',
  'seq.how': `
    <p><b>Что нужно:</b> двое и квадратное поле 6 × 6. Для партии подлиннее — 8 × 8 или 7 × 7 с зачёркнутой центральной клеткой. У каждого в своём углу уже написаны числа 1, 2, 3 — косой лесенкой к центру.</p>
    <p><b>Цель:</b> написать самое большое число на поле.</p>
    <ol>
      <li>За ход возьмите <b>любое</b> своё число и впишите на единицу больше в <b>соседнюю</b> пустую клетку. Соседи — все восемь клеток вокруг, включая диагональные.</li>
      <li>Расти можно от любого своего числа, не только от последнего. Диагональный шаг может проскочить между двумя клетками соперника, пересекая его линию.</li>
      <li>Если вам некуда ходить, ход пропускается, а соперник продолжает, пока поле не заполнится.</li>
      <li>Когда ходов не осталось, сравнивают <b>наибольшие</b> числа. У кого больше, тот и побеждает; поровну — ничья.</li>
    </ol>
    <p class="tip"><b>Как ставить число:</b> нажмите пустую клетку с точкой — туда впишется самое большое из возможных чисел. Хотите расти от определённого числа — сначала нажмите его, потом клетку.</p>`,
  'seq.h.tips': 'Хитрости',
  'seq.tips': `
    <ul>
      <li>Считается только <b>одно</b> число — ваш максимум. Боковые отростки ничего не дают сами по себе, зато работают как <b>стены</b>.</li>
      <li>Смотрите на пустые области: если ваша голова упирается в карман из 5 свободных клеток, она вырастет ещё максимум на 5. Отрежьте сопернику простор — и его потолок упадёт.</li>
      <li>Не забывайте про диагонали: щель между двумя соприкасающимися углами — это проход, и для вас, и для соперника.</li>
    </ul>
    <p class="tip"><b>Порядок ходов.</b> У начинающего здесь преимущество, а второй игрок может просто повторять ходы, поворачивая их на 180°, — и сведёт игру к ничьей. Лекарство: после первого одиночного хода каждый делает <b>по два хода</b> подряд (А, ББ, АА, ББ…). Самая честная очерёдность — <b>последовательность Туэ — Морса</b>: А Б Б А Б А А Б… — каждый следующий кусок равен предыдущему с переставленными ролями. Обе схемы есть в настройках.</p>
    <p><b>Ещё варианты для бумаги:</b></p>
    <ul>
      <li><i>Свободный старт</i> — поле пустое, каждый сам ставит свою тройку 1-2-3 где хочет.</li>
      <li><i>Свежие ростки</i> — вместо хода можно написать 1 в любой пустой клетке (в варианте с двойными ходами это съедает оба хода).</li>
      <li><i>Ленивые диагонали</i> — шаг по диагонали не увеличивает число. Начинают с одной единицы в противоположных углах.</li>
      <li>Втроём — на треугольной сетке, вчетвером — на поле 8 × 8 или 10 × 10 со стартом из четырёх углов; очередь идёт «змейкой»: А Б В В Б А А Б В…</li>
    </ul>`,
  'seq.h.origin': 'Откуда игра',
  'seq.origin': `
    <p>Секвенциум придумал бельгийский художник и изобретатель игр Вальтер Йорис — автор сборника «100 стратегических игр», сотен головоломок и оригами. Игра совсем молодая, из XXI века, и до книги Бена Орлина нигде не публиковалась, хотя сам Йорис считает её лучшей из своих.</p>
    <p>В книге она служит поводом поговорить о справедливой очерёдности. Право первого хода даёт перевес почти в любой игре — от шахмат до го. Его можно выкупать на аукционе, играть две партии со сменой ролей, применять правило «я делю — ты выбираешь»… или переписать саму очерёдность. Предел такого подхода — последовательность Туэ — Морса, которую независимо открывали математики и шахматисты: в ней не только оба игрока ходят первыми одинаково часто, но и «первенство в первенстве» распределено поровну — на всех уровнях сразу.</p>`,
});

addStrings('en', {
  'seq.title': 'Sequencium',
  'seq.tagline': 'two number vines race to grow the tallest',
  'seq.size': 'Board:',
  'seq.size.6': '6 × 6',
  'seq.size.7': '7 × 7, no centre',
  'seq.size.8': '8 × 8',
  'seq.order': 'Turns:',
  'seq.order.alt': 'single: ABAB…',
  'seq.order.double': 'double: ABBAABB…',
  'seq.order.tm': 'Thue–Morse: ABBABAAB…',
  'seq.mode': 'Play:',
  'seq.mode.pvp': 'two players',
  'seq.mode.easy': 'vs computer (easy)',
  'seq.mode.normal': 'vs computer (normal)',
  'seq.mode.hard': 'vs computer (sneaky)',
  'seq.order.note': 'Turn order changes the balance: with single turns the first player has a real edge. See “Tricks” for details.',
  'seq.again': 'again!',
  'seq.p0': 'Blue',
  'seq.p1': 'Red',
  'seq.cpu': 'Computer',
  'seq.top': 'top {n}',
  'seq.turn': '{name} to move',
  'seq.turn.two': '{name}: first of two moves',
  'seq.turn.again': '{name}: one more move',
  'seq.turn.alone': 'The other side is boxed in — {name} fills the board',
  'seq.you': 'Your move',
  'seq.you.two': 'Your move (first of two)',
  'seq.you.again': 'Your move again',
  'seq.thinking': '{name} is thinking…',
  'seq.turn.them': '{name} is moving…',
  'seq.hint.pick': 'Now pick a cell next to {n}',
  'seq.online.wait': 'Waiting for the other player…',
  'seq.online.note': 'You’re playing online: the room creator starts new games and picks the rules.',
  'seq.online.waitnew': 'Waiting for {name} to press “again”',
  'seq.next': '{name} starts the next game',
  'seq.win': '{name} wins!',
  'seq.tie': 'A tie!',
  'seq.score': '{a} to {b}',
  'seq.say.space': ['Room to grow!', 'All mine', 'Growing!', 'Lovely'],
  'seq.say.cut': ['No way through!', 'Stop!', 'Blocked', 'Not here'],
  'seq.say.ouch': ['Hey!', 'Squeezed…', 'Uh-oh', 'Cramped'],
  'seq.say.lead': ['I’m ahead!', 'New record!', 'Higher!'],
  'seq.say.stuck': ['Nowhere to go…', 'Dead end', 'Boxed in…'],
  'seq.say.alone': ['All mine now!', 'No rush…', 'More, more…'],
  'seq.say.win': ['Hooray!', 'It grew!', 'I’m a genius'],
  'seq.say.lose': ['Rematch?', 'Next time…', 'Whatever'],
  'seq.say.tie': ['Even!', 'A tie?!'],
  'seq.h.how': 'How to play',
  'seq.how': `
    <p><b>You need:</b> two players and a square 6 × 6 board. For a longer game use 8 × 8, or 7 × 7 with the centre cell crossed out. Each player starts with 1, 2, 3 already written in their own corner, stepping diagonally toward the middle.</p>
    <p><b>Goal:</b> write the biggest number on the board.</p>
    <ol>
      <li>On your turn take <b>any</b> of your numbers and write the next one up in an empty <b>neighbouring</b> cell. All eight surrounding cells count, diagonals included.</li>
      <li>You can grow from any of your numbers, not just the newest. A diagonal step may slip between two of your opponent’s cells, crossing their line.</li>
      <li>If you have nowhere to go, you skip, and your opponent keeps going until the board is full.</li>
      <li>When no moves are left, compare the <b>largest</b> numbers. Higher wins; equal is a tie.</li>
    </ol>
    <p class="tip"><b>Placing a number:</b> tap an empty cell with a dot — it gets the biggest number you can put there. To grow from a particular number, tap that number first, then the cell.</p>`,
  'seq.h.tips': 'Tricks',
  'seq.tips': `
    <ul>
      <li>Only <b>one</b> number counts — your top one. Side branches score nothing by themselves, but they make great <b>walls</b>.</li>
      <li>Watch the empty regions: if your head is stuck in a pocket of 5 free cells, it can grow by 5 at most. Cut your opponent off from open space and their ceiling drops.</li>
      <li>Mind the diagonals: a gap between two touching corners is a doorway — for you and for them.</li>
    </ul>
    <p class="tip"><b>Turn order.</b> The first player has the edge here, and the second can simply copy every move rotated by 180° to force a tie. The cure: after a single opening move, everyone takes <b>two moves</b> per turn (A, BB, AA, BB…). The fairest order of all is the <b>Thue–Morse sequence</b>: A B B A B A A B… — each new block is the previous one with roles swapped. Both are in the settings.</p>
    <p><b>More variants for pen and paper:</b></p>
    <ul>
      <li><i>Free start</i> — begin with an empty board; each player places their 1-2-3 trio anywhere.</li>
      <li><i>Fresh seeds</i> — instead of growing, write a 1 in any empty cell (with double turns this uses up both moves).</li>
      <li><i>Lazy diagonals</i> — a diagonal step doesn’t increase the number. Start with a single 1 in opposite corners.</li>
      <li>Three players use a triangle grid; four play on 8 × 8 or 10 × 10 starting from the four corners, with a “snake” order: A B C C B A A B C…</li>
    </ul>`,
  'seq.h.origin': 'Where it comes from',
  'seq.origin': `
    <p>Sequencium is the work of Walter Joris, a Belgian artist and game inventor — author of the collection <i>100 Strategic Games</i> and of countless puzzles and origami designs. The game is very young, a 21st-century creation, and was unpublished before Ben Orlin’s book, even though Joris calls it his best.</p>
    <p>In the book it opens a conversation about fair turn-taking. Moving first is an advantage in almost every game, from chess to go. You can auction off the first move, play two games with roles swapped, use “I cut, you choose”… or rewrite the turn order itself. The limit of that idea is the Thue–Morse sequence, found independently by mathematicians and chess players: not only does each player go first equally often, but the “advantage of the advantage” is split evenly too — at every level at once.</p>`,
});
