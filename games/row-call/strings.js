import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'rc.title': 'Перекличка',
  'rc.tagline': 'крестики-нолики, где ряд выбираете вы, а клетку — соперник',
  'rc.size': 'Поле:',
  'rc.size.4': '4 × 4, три в ряд',
  'rc.size.5': '5 × 5, четыре в ряд',
  'rc.mode': 'Играем:',
  'rc.mode.pvp': 'вдвоём',
  'rc.mode.easy': 'с компьютером (простой)',
  'rc.mode.normal': 'с компьютером (обычный)',
  'rc.mode.hard': 'с компьютером (сильный)',
  'rc.settings.note': 'Первый ход в партиях переходит по очереди. Смена поля начинает новый матч.',
  'rc.again': 'ещё партию!',
  'rc.p0': 'Синий',
  'rc.p1': 'Красный',
  'rc.cpu': 'Компьютер',
  'rc.wins': ['победа', 'победы', 'побед'],
  'rc.cols': 'АБВГД',
  'rc.in.row': 'в строке {i}',
  'rc.in.col': 'в столбце {i}',
  'rc.turn.pick': '{name}: вызовите строку или столбец',
  'rc.turn.place': '{name}: куда ставим знак соперника {line}?',
  'rc.thinking': '{name} думает…',
  'rc.you.pick': 'Ваш ход: вызовите строку или столбец',
  'rc.you.place': 'Поставьте знак соперника {line}',
  'rc.them.pick': '{name} выбирает ряд…',
  'rc.them.place': '{name} ставит ваш знак {line}…',
  'rc.hint.pick': 'Нажмите на букву над столбцом или цифру у строки',
  'rc.online.wait': 'Ждём второго игрока…',
  'rc.online.note': 'Сейчас идёт игра по сети: новую партию начинает и поле выбирает создатель комнаты.',
  'rc.online.waitnew': 'Ждём, когда {name} запустит новую партию',
  'rc.win': 'Побеждает {name}!',
  'rc.why.3': 'Три в ряд',
  'rc.why.4': 'Четыре в ряд',
  'rc.tie': 'Ничья!',
  'rc.why.full': 'Поле заполнено, ряда ни у кого нет',
  'rc.next': 'Следующую партию начинает {name}',
  'rc.say.call': ['Вызываю!', 'Вот этот ряд', 'Ну-ка…', 'Сюда смотри'],
  'rc.say.forced': ['Без вариантов!', 'Только сюда!', 'Деваться некуда'],
  'rc.say.killer': ['Ставь куда хочешь!', 'Всё моё!', 'Попался!'],
  'rc.say.doomed': ['Ой-ой…', 'Везде плохо!', 'Хм…'],
  'rc.say.threat': ['Почти!', 'Ещё чуть-чуть', 'Хе-хе'],
  'rc.say.trap': ['Вот сюда.', 'Спасибо!', 'Мне подходит'],
  'rc.say.oops': ['Эх…', 'Ой', 'Неудобно вышло'],
  'rc.say.win': ['Ура!', 'Три в ряд!', 'Победа!'],
  'rc.say.win4': ['Ура!', 'Четыре в ряд!', 'Победа!'],
  'rc.say.lose': ['Реванш?', 'Эх!', 'В другой раз'],
  'rc.say.tie': ['Ничья!', 'Мир?', 'Ни вам, ни нам'],
  'rc.h.how': 'Как играть',
  'rc.how': `
    <p><b>Что нужно:</b> двое и поле 4 × 4. Синий рисует крестики, красный — нолики.</p>
    <p><b>Цель:</b> первым собрать <b>три своих знака в ряд</b> — по горизонтали, вертикали или диагонали.</p>
    <ol>
      <li>В свой ход вы <b>вызываете</b> строку или столбец — нажмите на цифру слева или букву сверху. В ряду должна быть хоть одна пустая клетка.</li>
      <li>Дальше решает <b>соперник</b>: он выбирает пустую клетку в этом ряду, и туда встаёт <b>ваш</b> знак.</li>
      <li>Если в ряду свободна только одна клетка, выбора нет — знак встаёт туда сам.</li>
      <li>Потом роли меняются. Выигрывает тот, у кого первым сложится свой ряд; если поле заполнится без ряда — ничья.</li>
    </ol>
    <p>В настройках есть вариант подлиннее: поле 5 × 5 и четыре в ряд.</p>`,
  'rc.h.tips': 'Хитрости',
  'rc.tips': `
    <ul>
      <li>Поначалу кажется, что вашими знаками командует соперник. Но чем больше клеток занято, тем меньше у него выбора: в почти полном ряду решаете уже вы.</li>
      <li><b>Смертельный вызов.</b> Если в каком-то ряду <i>каждая</i> пустая клетка завершает вашу тройку — вызывайте его. Куда бы соперник ни поставил ваш знак, вы выиграли.</li>
      <li>Когда ставите чужой знак, ищите клетку, где он никому не поможет. А ещё лучше — такую, после которой у <i>вас</i> появится смертельный вызов.</li>
      <li>Помните: ставя знак соперника, вы занимаете клетку, которая могла пригодиться вам самим.</li>
    </ul>
    <p class="tip"><b>Тот же трюк в других играх.</b> Принцип «я выбираю, ты уточняешь» легко пересадить куда угодно. В «Точках и квадратах» можно называть ряд точек, а соперник решает, где в нём провести вашу линию. В шахматах — называть фигуру, а ходить ею будет соперник (только если вы объявили «шах» или «взятие», он обязан так и сделать).</p>`,
  'rc.h.origin': 'Откуда игра',
  'rc.origin': `
    <p>Это обычные крестики-нолики с одним поворотом: власть над ходом делится пополам. Английское название <i>Row Call</i> — игра слов: <i>roll call</i> значит «перекличка», а тут вызывают ряды.</p>
    <p>Ученики учительницы Элизы Джонсон-Дрейер прозвали игру «Командирскими крестиками-ноликами» — хотя не так-то просто понять, кто тут командир: тот, кто называет ряд, или тот, кто выбирает клетку.</p>`,
});

addStrings('en', {
  'rc.title': 'Row Call',
  'rc.tagline': 'tic-tac-toe where you pick the line and your opponent picks the square',
  'rc.size': 'Board:',
  'rc.size.4': '4 × 4, three in a row',
  'rc.size.5': '5 × 5, four in a row',
  'rc.mode': 'Play:',
  'rc.mode.pvp': 'two players',
  'rc.mode.easy': 'vs computer (easy)',
  'rc.mode.normal': 'vs computer (normal)',
  'rc.mode.hard': 'vs computer (strong)',
  'rc.settings.note': 'The first call alternates between games. Changing the board starts a new match.',
  'rc.again': 'next game!',
  'rc.p0': 'Blue',
  'rc.p1': 'Red',
  'rc.cpu': 'Computer',
  'rc.wins': ['win', 'wins'],
  'rc.cols': 'ABCDE',
  'rc.in.row': 'in row {i}',
  'rc.in.col': 'in column {i}',
  'rc.turn.pick': '{name}: call a row or a column',
  'rc.turn.place': '{name}: place the opponent’s mark {line}',
  'rc.thinking': '{name} is thinking…',
  'rc.you.pick': 'Your turn: call a row or a column',
  'rc.you.place': 'Place your opponent’s mark {line}',
  'rc.them.pick': '{name} is calling a line…',
  'rc.them.place': '{name} is placing your mark {line}…',
  'rc.hint.pick': 'Tap a letter above a column or a number beside a row',
  'rc.online.wait': 'Waiting for the other player…',
  'rc.online.note': 'You’re playing online: the room creator starts new games and picks the board.',
  'rc.online.waitnew': 'Waiting for {name} to launch the next game',
  'rc.win': '{name} wins!',
  'rc.why.3': 'Three in a row',
  'rc.why.4': 'Four in a row',
  'rc.tie': 'A tie!',
  'rc.why.full': 'The board is full and nobody has a row',
  'rc.next': '{name} calls first next game',
  'rc.say.call': ['I call this one!', 'That line', 'Hmm, this one', 'Your pick'],
  'rc.say.forced': ['No choice!', 'Only one spot!', 'Nowhere else'],
  'rc.say.killer': ['Anywhere you like!', 'All mine!', 'Gotcha!'],
  'rc.say.doomed': ['Uh-oh…', 'All bad!', 'Hmm…'],
  'rc.say.threat': ['Almost!', 'One more…', 'Heh'],
  'rc.say.trap': ['Right here.', 'Thanks!', 'Works for me'],
  'rc.say.oops': ['Ugh…', 'Oops', 'Awkward'],
  'rc.say.win': ['Hooray!', 'Three in a row!', 'Victory!'],
  'rc.say.win4': ['Hooray!', 'Four in a row!', 'Victory!'],
  'rc.say.lose': ['Rematch?', 'Ugh!', 'Next time'],
  'rc.say.tie': ['A tie!', 'Truce?', 'Nobody wins'],
  'rc.h.how': 'How to play',
  'rc.how': `
    <p><b>You need:</b> two players and a 4 × 4 grid. Blue draws X’s, red draws O’s.</p>
    <p><b>Goal:</b> be the first to get <b>three of your marks in a row</b> — across, down or diagonally.</p>
    <ol>
      <li>On your turn, <b>call</b> a row or a column: tap a number on the left or a letter on top. It needs at least one empty square.</li>
      <li>Now your <b>opponent</b> decides: they choose an empty square in that line, and <b>your</b> mark goes there.</li>
      <li>If the line has only one empty square, there’s no choice — your mark goes straight in.</li>
      <li>Then swap roles. First to make their row wins; a full board with no row is a tie.</li>
    </ol>
    <p>For a longer game, switch to 5 × 5 with four in a row in the settings.</p>`,
  'rc.h.tips': 'Tricks',
  'rc.tips': `
    <ul>
      <li>At first your opponent seems to be steering your marks. But as the grid fills up, they run out of choices: in a nearly full line, you are the one in charge.</li>
      <li><b>The deadly call.</b> If <i>every</i> empty square of some line would complete your three, call that line. Wherever your opponent puts your mark, you win.</li>
      <li>When placing your opponent’s mark, look for a square where it helps nobody — or better, one that leaves <i>you</i> a deadly call next turn.</li>
      <li>Remember: every time you place their mark, you use up a square you might have wanted yourself.</li>
    </ul>
    <p class="tip"><b>Borrow the trick.</b> “I choose, you finish my move” works in lots of games. In Dots and Boxes, name a row of dots and let your opponent decide where your line goes in it. In chess, name a piece and let your opponent move it — though if you announce “check” or “capture”, they have to make it one.</p>`,
  'rc.h.origin': 'Where it comes from',
  'rc.origin': `
    <p>It’s plain tic-tac-toe with one twist: control of each move is split in two. The name is a pun on <i>roll call</i> — here you call out rows instead of names.</p>
    <p>Teacher Elise Johnson-Dreyer’s students nicknamed it “Bossy Tic-Tac-Toe” — though it’s hard to say who the boss really is: the one who calls the line, or the one who picks the square.</p>`,
});
