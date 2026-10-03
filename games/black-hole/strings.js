import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'bh.title': 'Чёрная дыра',
  'bh.tagline': 'пирамида из кружков и одна пустая клетка, которая всё решает',
  'bh.size': 'Пирамида:',
  'bh.size.5': '5 рядов (15 кружков)',
  'bh.size.6': '6 рядов (21 кружок)',
  'bh.size.9': '9 рядов (45 кружков)',
  'bh.mode': 'Играем:',
  'bh.mode.pvp': 'вдвоём',
  'bh.mode.easy': 'с компьютером (простой)',
  'bh.mode.normal': 'с компьютером (обычный)',
  'bh.mode.hard': 'с компьютером (сильный)',
  'bh.first': 'Первый ход:',
  'bh.first.alt': 'по очереди',
  'bh.again': 'ещё раз!',
  'bh.p0': 'Синий',
  'bh.p1': 'Красный',
  'bh.cpu': 'Компьютер',
  'bh.next': 'пишет {n}',
  'bh.lost': 'потеря: {n}',
  'bh.done': 'все числа вписаны',
  'bh.wins': ['победа', 'победы', 'побед'],
  'bh.turn': '{name} пишет {n}',
  'bh.thinking': '{name} думает…',
  'bh.turn.you': 'Ваш ход: пишите {n}',
  'bh.turn.them': '{name} пишет {n}…',
  'bh.collapse': 'Чёрная дыра!',
  'bh.online.wait': 'Ждём второго игрока…',
  'bh.online.note': 'Сейчас идёт игра по сети: новую партию начинает и пирамиду выбирает создатель комнаты.',
  'bh.online.waitnew': 'Ждём, когда {name} нажмёт «ещё раз»',
  'bh.win': 'Побеждает {name}!',
  'bh.tie': 'Ничья!',
  'bh.why': 'Дыра проглотила: {n0} — {a}, {n1} — {b}',
  'bh.nextgame': 'Следующую партию начинает {name}',
  'bh.say.safe': ['Спрятано!', 'Так надёжнее', 'Закрыто', 'Не трогай мои числа'],
  'bh.say.risky': ['Смело…', 'Рискованно!', 'Ну-ну', 'Посмотрим…'],
  'bh.say.gift': ['Спасибо!', 'Ой, подарок', 'Хе-хе', 'Теперь моё!'],
  'bh.say.oops': ['Ой…', 'Кажется, зря', 'Хм…'],
  'bh.say.plan': ['Всё по плану', 'Так и задумано', 'Ага!'],
  'bh.say.last': ['Выбираю дыру!', 'Последний ход!', 'Ну, держись'],
  'bh.say.win': ['Ура!', 'Дыра на моей стороне', 'Победа!'],
  'bh.say.lose': ['Засосало…', 'Реванш?', 'Эх, мои числа'],
  'bh.say.tie': ['Поровну!', 'Ничья?!'],
  'bh.h.how': 'Как играть',
  'bh.how': `
    <p><b>Что нужно:</b> двое, два цвета и пирамида из 21 кружка в шесть рядов.</p>
    <p><b>Цель:</b> отдать чёрной дыре <b>меньше</b>, чем соперник.</p>
    <ol>
      <li>Ходите по очереди. Первым ходом каждый пишет своим цветом <b>1</b> в любой пустой кружок, затем каждый пишет <b>2</b>, потом <b>3</b> и так до <b>10</b>. Нажмите на пустой кружок — число впишется само.</li>
      <li>После двадцати ходов один кружок останется пустым. Это <b>чёрная дыра</b>: она поглощает все соседние кружки (до шести штук).</li>
      <li>Каждый складывает свои числа, которые проглотила дыра. У кого эта сумма <b>меньше</b>, тот и выигрывает: у него уцелело больше. Равные суммы — ничья.</li>
    </ol>`,
  'bh.h.tips': 'Хитрости',
  'bh.tips': `
    <ul>
      <li>Большие числа ставьте туда, где вокруг уже мало пустых кружков: чем меньше у числа пустых соседей, тем меньше шансов, что дыра окажется рядом.</li>
      <li>Пустой кружок рядом с вашими крупными числами — опасность. Иногда лучше просто занять его, даже маленьким числом.</li>
      <li>Пустой кружок у крупных чисел соперника — ваш союзник. Не трогайте его: пусть соперник сам тратит ход, чтобы его закрыть.</li>
      <li>Последний ход делает тот, кто ходил вторым: он выбирает, какой из двух последних кружков станет дырой. Первому игроку нужно, чтобы оба последних кружка были для него безопасны.</li>
    </ul>
    <p class="tip"><b>Варианты.</b> Пирамиду можно взять меньше (5 рядов, числа до 7 — партия на пару минут) или больше (9 рядов, числа до 22). Главное, чтобы кружков было нечётное число — тогда ровно один останется пустым. Размер меняется в настройках.</p>`,
  'bh.h.origin': 'Откуда игра',
  'bh.origin': `
    <p>Игру придумал бельгийский художник и автор настольных игр Вальтер Йорис — большой любитель простых игр на бумаге. В ней нет ни захватов, ни ходов фишками: всё решает одна клетка, которую никто не занял, и решается всё в самом конце.</p>
    <p>Бен Орлин включил её в свою книгу как маленькую головоломку для двоих: правила объясняются за минуту, а вот почувствовать, где окажется дыра, получается далеко не сразу.</p>`,
});

addStrings('en', {
  'bh.title': 'Black Hole',
  'bh.tagline': 'a pyramid of circles and one empty spot that decides everything',
  'bh.size': 'Pyramid:',
  'bh.size.5': '5 rows (15 circles)',
  'bh.size.6': '6 rows (21 circles)',
  'bh.size.9': '9 rows (45 circles)',
  'bh.mode': 'Play:',
  'bh.mode.pvp': 'two players',
  'bh.mode.easy': 'vs computer (easy)',
  'bh.mode.normal': 'vs computer (normal)',
  'bh.mode.hard': 'vs computer (strong)',
  'bh.first': 'First move:',
  'bh.first.alt': 'take turns',
  'bh.again': 'again!',
  'bh.p0': 'Blue',
  'bh.p1': 'Red',
  'bh.cpu': 'Computer',
  'bh.next': 'writes {n}',
  'bh.lost': 'lost: {n}',
  'bh.done': 'all numbers in',
  'bh.wins': ['win', 'wins'],
  'bh.turn': '{name} writes {n}',
  'bh.thinking': '{name} is thinking…',
  'bh.turn.you': 'Your move: write {n}',
  'bh.turn.them': '{name} writes {n}…',
  'bh.collapse': 'Black hole!',
  'bh.online.wait': 'Waiting for the other player…',
  'bh.online.note': 'You’re playing online: the room creator starts new games and picks the pyramid.',
  'bh.online.waitnew': 'Waiting for {name} to press “again”',
  'bh.win': '{name} wins!',
  'bh.tie': 'A tie!',
  'bh.why': 'The hole swallowed: {n0} {a}, {n1} {b}',
  'bh.nextgame': '{name} moves first next game',
  'bh.say.safe': ['Tucked away!', 'Safer now', 'Sealed', 'Hands off my numbers'],
  'bh.say.risky': ['Bold…', 'Risky!', 'Hmm-hmm', 'We’ll see…'],
  'bh.say.gift': ['Thanks!', 'Ooh, a gift', 'Heh', 'Mine now!'],
  'bh.say.oops': ['Oops…', 'Maybe not', 'Hmm…'],
  'bh.say.plan': ['All to plan', 'Just as I meant', 'Aha!'],
  'bh.say.last': ['I pick the hole!', 'Last move!', 'Brace yourself'],
  'bh.say.win': ['Hooray!', 'The hole likes me', 'Victory!'],
  'bh.say.lose': ['Sucked in…', 'Rematch?', 'My poor numbers'],
  'bh.say.tie': ['Even!', 'A tie?!'],
  'bh.h.how': 'How to play',
  'bh.how': `
    <p><b>You need:</b> two players, two colours and a pyramid of 21 circles in six rows.</p>
    <p><b>Goal:</b> feed the black hole <b>less</b> than your opponent does.</p>
    <ol>
      <li>Take turns. On your first move write a <b>1</b> in your colour in any empty circle; then each of you writes a <b>2</b>, then a <b>3</b>, and so on up to <b>10</b>. Tap an empty circle and your number goes in.</li>
      <li>After twenty moves exactly one circle is still empty. That’s the <b>black hole</b>: it swallows every circle touching it (up to six).</li>
      <li>Each player adds up their own swallowed numbers. The <b>smaller</b> sum wins (which means more of your numbers survived). Equal sums are a tie.</li>
    </ol>`,
  'bh.h.tips': 'Tricks',
  'bh.tips': `
    <ul>
      <li>Put big numbers where few empty circles are left around them: fewer empty neighbours, fewer chances the hole ends up next door.</li>
      <li>An empty circle beside your big numbers is a danger. Sometimes it’s worth plugging it, even with a small number.</li>
      <li>An empty circle beside your opponent’s big numbers is your friend. Leave it alone and make them spend a move filling it.</li>
      <li>Whoever moved second makes the very last move and chooses which of the final two circles becomes the hole. The first player needs both of those last spots to be harmless.</li>
    </ul>
    <p class="tip"><b>Variants.</b> Use a smaller pyramid (5 rows, numbers up to 7 — a two-minute game) or a bigger one (9 rows, numbers up to 22). Any size works as long as the number of circles is odd, so exactly one stays empty. Change it in the settings.</p>`,
  'bh.h.origin': 'Where it comes from',
  'bh.origin': `
    <p>The game was invented by Walter Joris, a Belgian artist and game designer with a soft spot for simple pencil-and-paper games. There are no captures and no pieces moving around: everything is decided by the one spot nobody filled, and only at the very end.</p>
    <p>Ben Orlin included it in his book as a little two-player puzzle: the rules take a minute to explain, but getting a feel for where the hole will land takes much longer.</p>`,
});
