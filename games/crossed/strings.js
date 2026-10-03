import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'cr.title': 'Перекрёсток',
  'cr.tagline': 'паутина из линий: пересекай и копи очки',
  'cr.size': 'Точек:',
  'cr.size.3': '12 (по 3 на сторону)',
  'cr.size.4': '16 (по 4, как в книге)',
  'cr.size.5': '20 (по 5 на сторону)',
  'cr.mode': 'Играем:',
  'cr.mode.pvp': 'вдвоём',
  'cr.mode.easy': 'с компьютером (простой)',
  'cr.mode.normal': 'с компьютером (обычный)',
  'cr.mode.hard': 'с компьютером (хитрый)',
  'cr.again': 'ещё раз!',
  'cr.p0': 'Синий',
  'cr.p1': 'Красный',
  'cr.cpu': 'Компьютер',
  'cr.points': ['очко', 'очка', 'очков'],
  'cr.turn': 'Ходит {name}',
  'cr.pick2': 'Теперь вторая точка',
  'cr.thinking': '{name} думает…',
  'cr.turn.you': 'Ваш ход',
  'cr.turn.them': 'Ходит {name}…',
  'cr.online.wait': 'Ждём второго игрока…',
  'cr.online.note': 'Сейчас идёт игра по сети: новую партию начинает и число точек выбирает создатель комнаты.',
  'cr.online.waitnew': 'Новую партию начнёт {name}',
  'cr.win': 'Побеждает {name}! {a}\u00a0:\u00a0{b}',
  'cr.tie': 'Ничья! {a}\u00a0:\u00a0{b}',
  'cr.next': 'Следующую партию начинает {name}',
  'cr.say.cross': ['Пересекаю!', 'Есть!', 'Ага!', 'Вжух'],
  'cr.say.self': ['Через свою — вдвойне!', 'Двойной куш!', 'Двойные очки!'],
  'cr.say.big': ['Вот это паутина!', 'Джекпот!', 'Сколько пересечений!', 'Ух ты!'],
  'cr.say.ouch': ['Ай!', 'Ну зачем так…', 'Эх', 'Ой-ой'],
  'cr.say.quiet': ['Тихонько…', 'Пока осторожно', 'Посмотрим', 'Не спешу'],
  'cr.say.win': ['Ура!', 'Победа!', 'Я паук!'],
  'cr.say.lose': ['Реванш?', 'В следующий раз…', 'Всё запуталось…'],
  'cr.say.tie': ['Поровну!', 'Ничья?!', 'Ну надо же'],
  'cr.h.how': 'Как играть',
  'cr.how': `
    <p><b>Что нужно:</b> двое, ручки двух цветов и квадрат из 16 точек — по 4 на каждой стороне, в углах точек нет.</p>
    <p><b>Цель:</b> набрать больше очков, пересекая уже нарисованные линии.</p>
    <ol>
      <li>Ходите по очереди: соедините прямой линией <b>две свободные точки</b>, лежащие на <b>разных сторонах</b> квадрата. Каждая точка используется только один раз.</li>
      <li>За каждую <b>чужую</b> линию, которую пересекла ваша новая, — <b>+1</b>. За каждую <b>свою</b> — <b>+2</b>.</li>
      <li>Игра кончается, когда ходить больше нельзя: точки закончились или все свободные остались на одной стороне. Побеждает тот, у кого больше очков.</li>
    </ol>
    <p>Нажмите на точку, потом на вторую. Если вести линию пальцем (или мышкой) от точки к точке, до отпускания видно, сколько очков она принесёт.</p>`,
  'cr.h.tips': 'Хитрости',
  'cr.tips': `
    <ul>
      <li>Каждая ваша линия — это <b>вклад на будущее</b>: пересечёте её сами — получите 2, а сопернику она даст только 1.</li>
      <li>Но длинная линия через центр — ещё и <b>мишень</b>: её пересечёт почти любой следующий ход. Короткая линия у угла безопасна, зато и очков не приносит.</li>
      <li>Перед ходом прикиньте не только свои очки, но и <b>лучший ответ соперника</b> сразу после вас.</li>
      <li>Последнюю линию уже никто не пересечёт — под конец можно смело тянуть длинную линию через всю паутину. Кто ходит первым, здесь меняется от партии к партии.</li>
    </ul>
    <p class="tip"><b>Варианты.</b> Попробуйте квадрат поменьше (12 точек) или побольше (20) — это меняет длину партии и баланс риска. В настройках есть оба. А ещё можно играть «вживую»: вбить в доску гвозди по краю квадрата и натягивать между ними цветные резинки.</p>`,
  'cr.h.origin': 'Откуда игра',
  'cr.origin': `
    <p>Игра взята из большой коллекции головоломок Ивана Московича «1000 Playthinks» — там она значится под номером 216. Бен Орлин настолько её полюбил, что сделал деревянную версию: шестнадцать гвоздей и резинки вместо линий.</p>
    <p>Партия длится всего восемь ходов — меньше, чем крестики-нолики, — но выбор на каждом ходу огромный: десятки вариантов, и каждый — компромисс между жадностью и осторожностью.</p>`,
});

addStrings('en', {
  'cr.title': 'Crossed',
  'cr.tagline': 'a web of lines: cross them to score',
  'cr.size': 'Dots:',
  'cr.size.3': '12 (3 per side)',
  'cr.size.4': '16 (4 per side, as in the book)',
  'cr.size.5': '20 (5 per side)',
  'cr.mode': 'Play:',
  'cr.mode.pvp': 'two players',
  'cr.mode.easy': 'vs computer (easy)',
  'cr.mode.normal': 'vs computer (normal)',
  'cr.mode.hard': 'vs computer (sneaky)',
  'cr.again': 'again!',
  'cr.p0': 'Blue',
  'cr.p1': 'Red',
  'cr.cpu': 'Computer',
  'cr.points': ['point', 'points'],
  'cr.turn': '{name} to move',
  'cr.pick2': 'Now pick the second dot',
  'cr.thinking': '{name} is thinking…',
  'cr.turn.you': 'Your move',
  'cr.turn.them': '{name} is moving…',
  'cr.online.wait': 'Waiting for the other player…',
  'cr.online.note': 'You’re playing online: the room creator starts new games and picks the number of dots.',
  'cr.online.waitnew': '{name} will start the next game',
  'cr.win': '{name} wins! {a}\u00a0:\u00a0{b}',
  'cr.tie': 'A tie! {a}\u00a0:\u00a0{b}',
  'cr.next': '{name} goes first next game',
  'cr.say.cross': ['Crossed!', 'Got one!', 'Aha!', 'Zip'],
  'cr.say.self': ['My own: x2!', 'Double points!', 'Thanks, past me'],
  'cr.say.big': ['What a web!', 'Jackpot!', 'So many crossings!', 'Whoa!'],
  'cr.say.ouch': ['Ouch!', 'Really?', 'Ugh', 'Oh no'],
  'cr.say.quiet': ['Quietly…', 'Playing it safe', 'We’ll see', 'No rush'],
  'cr.say.win': ['Hooray!', 'Victory!', 'Master weaver!'],
  'cr.say.lose': ['Rematch?', 'Next time…', 'I got tangled'],
  'cr.say.tie': ['Even!', 'A tie?!', 'Well, well'],
  'cr.h.how': 'How to play',
  'cr.how': `
    <p><b>You need:</b> two players, two pen colours and a square of 16 dots — 4 on each side, none in the corners.</p>
    <p><b>Goal:</b> score more points by crossing lines already on the board.</p>
    <ol>
      <li>Take turns joining <b>two free dots</b> on <b>different sides</b> of the square with a straight line. Each dot can be used only once.</li>
      <li>Your new line scores <b>+1</b> for every <b>opponent’s</b> line it crosses and <b>+2</b> for every one of <b>your own</b>.</li>
      <li>The game ends when no move is left: the dots are used up, or all free dots sit on one side. Higher score wins.</li>
    </ol>
    <p>Tap a dot, then a second one. If you drag the line from dot to dot (finger or mouse), it shows how many points it would earn before you let go.</p>`,
  'cr.h.tips': 'Tricks',
  'cr.tips': `
    <ul>
      <li>Each of your lines is an <b>investment</b>: cross it yourself later for 2, while your opponent only gets 1 from it.</li>
      <li>But a long line through the middle is also a <b>target</b> — nearly every later move will cross it. A short corner cut is safe, and scores nothing.</li>
      <li>Before moving, check not just your own gain but your opponent’s <b>best reply</b> right after.</li>
      <li>Nobody will ever cross the very last line — near the end, feel free to stretch a long one across the whole web. Who moves first alternates from game to game here.</li>
    </ul>
    <p class="tip"><b>Variants.</b> Try a smaller square (12 dots) or a bigger one (20) — it changes the length of the game and the balance of risk. Both are in the settings. Or play it for real: hammer nails around the edge of a square on a board and stretch coloured rubber bands between them.</p>`,
  'cr.h.origin': 'Where it comes from',
  'cr.origin': `
    <p>The game comes from Ivan Moscovich’s huge puzzle collection <i>1000 Playthinks</i>, where it is number 216. Ben Orlin liked it enough to build a wooden version: sixteen nails, with rubber bands for lines.</p>
    <p>A game lasts only eight moves — fewer than tic-tac-toe — yet every turn offers dozens of choices, each a little tug-of-war between greed and caution.</p>`,
});
