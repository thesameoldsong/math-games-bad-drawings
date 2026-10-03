import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'ut.title': 'Ультимативные крестики-нолики',
  'ut.tagline': 'крестики-нолики внутри крестиков-ноликов',
  'ut.mode': 'Играем:',
  'ut.mode.pvp': 'вдвоём',
  'ut.mode.easy': 'с компьютером (простой)',
  'ut.mode.normal': 'с компьютером (обычный)',
  'ut.mode.hard': 'с компьютером (сильный)',
  'ut.win': 'Победа:',
  'ut.win.line': 'три поля в ряд',
  'ut.win.majority': 'больше полей',
  'ut.win.single': 'первое же поле',
  'ut.win.line.hint': 'Классика: нужно выиграть три маленьких поля в ряд — как в обычных крестиках-ноликах.',
  'ut.win.majority.hint': 'Расположение неважно: когда все поля закрыты, побеждает тот, у кого их больше.',
  'ut.win.single.hint': 'Быстрая партия: кто первым соберёт три в ряд на любом маленьком поле, тот и выигрывает.',
  'ut.shared': 'Ничейное поле:',
  'ut.shared.no': 'ничьё',
  'ut.shared.yes': 'годится обоим',
  'ut.again': 'ещё раз!',
  'ut.p0': 'Синий',
  'ut.p1': 'Красный',
  'ut.cpu': 'Компьютер',
  'ut.boards': ['поле', 'поля', 'полей'],
  'ut.turn.any': 'Ходит {name} — в любое поле',
  'ut.turn.here': 'Ходит {name} — в подсвеченное поле',
  'ut.turn.first': 'Начинает {name} — ход в любую клетку',
  'ut.thinking': '{name} думает…',
  'ut.turn.you.any': 'Ваш ход — в любое поле',
  'ut.turn.you.here': 'Ваш ход — в подсвеченное поле',
  'ut.turn.them': 'Ходит {name}…',
  'ut.online.wait': 'Ждём второго игрока…',
  'ut.online.note': 'Сейчас идёт игра по сети: новую партию начинает и правила выбирает создатель комнаты.',
  'ut.online.waitnew': 'Новую партию начнёт {name}',
  'ut.win.text': 'Побеждает {name}!',
  'ut.tie': 'Ничья!',
  'ut.tie.stuck': 'Три поля в ряд уже не собрать никому.',
  'ut.tie.full': 'Все поля закрыты.',
  'ut.score': 'Поля {a} : {b}',
  'ut.say.board': ['Моё поле!', 'Три в ряд!', 'Забираю!', 'Есть!', 'Это поле моё'],
  'ut.say.lostboard': ['Эх…', 'Ну вот', 'Ой', 'Хм', 'Как же так…'],
  'ut.say.free': ['Куда хочу!', 'Свобода!', 'Спасибо!', 'Мой выбор!'],
  'ut.say.threat': ['Ещё одно…', 'Почти!', 'Чуешь?', 'Два есть'],
  'ut.say.oops': ['Ой-ой', 'Зря я туда…', 'Упс'],
  'ut.say.dead': ['Никому', 'Ничья тут', 'Пусто'],
  'ut.say.win': ['Ура!', 'Победа!', 'Я гений'],
  'ut.say.lose': ['Реванш?', 'В следующий раз…', 'Ну и ладно'],
  'ut.say.tie': ['Ничья…', 'Боевая ничья'],
  'ut.h.how': 'Как играть',
  'ut.how': `
    <p><b>Что нужно:</b> двое и большое поле 3 × 3, в каждой клетке которого — маленькое поле для крестиков-ноликов.</p>
    <p><b>Цель:</b> выиграть три маленьких поля в ряд — по горизонтали, вертикали или диагонали.</p>
    <ol>
      <li>Синий ставит крестик, красный — нолик, по очереди. Самый первый ход — в любую клетку.</li>
      <li>Дальше главное правило: <b>клетка, куда вы поставили знак, указывает сопернику поле для ответа</b>. Поставили в правый верхний угол маленького поля — соперник ходит в правое верхнее большое поле. Это поле подсвечено.</li>
      <li>Три в ряд на маленьком поле — и оно ваше. Выигранное поле закрыто. Если поле заполнилось без трёх в ряд, оно тоже закрыто и ничьё.</li>
      <li>Если вас отправили в закрытое поле — ходите <b>в любое открытое</b>.</li>
      <li>Три выигранных поля в ряд — победа. Если такой ряд не может собрать уже никто, партия заканчивается вничью.</li>
    </ol>`,
  'ut.h.tips': 'Хитрости',
  'ut.tips': `
    <ul>
      <li>Каждый ход — это два хода: вы занимаете клетку <i>здесь</i> и выбираете, куда пойдёт соперник <i>там</i>. Второе часто важнее.</li>
      <li>Не отправляйте соперника в поле, где у него уже два в ряд.</li>
      <li>Отправить соперника в закрытое поле — значит подарить ему свободу выбора. Обычно это щедрый подарок.</li>
      <li>Центр маленького поля хорош, но каждый ход туда шлёт соперника в центральное большое поле — самое ценное.</li>
      <li>Иногда стоит отдать маленькое поле, которое ничего не решает на большом, чтобы загнать соперника туда, куда вам нужно.</li>
    </ul>
    <p class="tip"><b>Варианты.</b> В настройках можно сыграть «до первого поля» (быстро и остро), «по большинству полей» (неважно, как они стоят) или разрешить ничейным полям засчитываться обоим — тогда собрать ряд проще. Есть и другие идеи: знаки «падают» вниз маленького поля, как в «Четыре в ряд», а в «двойственной» версии ход соперника задаёт не поле, а клетку, а поле вы выбираете сами.</p>`,
  'ut.h.origin': 'Откуда игра',
  'ut.origin': `
    <p>Похожая игра продавалась ещё в 1977 году как настольная «Tic Tac Toe Times 10». Позже появилась «Tic Tac Ku» — там побеждал тот, кто возьмёт пять полей из девяти, а в уже выигранные поля всё равно приходилось ходить (из-за этого игра ломается, поэтому у нас закрытое поле даёт свободный ход).</p>
    <p>Массовой игра стала в 2013 году после заметки Бена Орлина в блоге — её обсуждали на Hacker News и Reddit, а потом появилось множество приложений. Название «Ultimate» придумали его ученики в школе в Окленде. Её ещё зовут «супер-», «мета-» и «фрактальными» крестиками-ноликами: маленькое поле повторяет большое, и каждое решение звучит сразу на двух уровнях.</p>`,
});

addStrings('en', {
  'ut.title': 'Ultimate Tic-Tac-Toe',
  'ut.tagline': 'tic-tac-toe inside tic-tac-toe',
  'ut.mode': 'Play:',
  'ut.mode.pvp': 'two players',
  'ut.mode.easy': 'vs computer (easy)',
  'ut.mode.normal': 'vs computer (normal)',
  'ut.mode.hard': 'vs computer (strong)',
  'ut.win': 'Win by:',
  'ut.win.line': 'three boards in a row',
  'ut.win.majority': 'most boards',
  'ut.win.single': 'any one board',
  'ut.win.line.hint': 'The classic: win three small boards in a row, just like ordinary tic-tac-toe.',
  'ut.win.majority.hint': 'Position doesn’t matter: once every board is closed, whoever owns more boards wins.',
  'ut.win.single.hint': 'A quick game: the first to get three in a row on any small board wins.',
  'ut.shared': 'Drawn board:',
  'ut.shared.no': 'nobody’s',
  'ut.shared.yes': 'counts for both',
  'ut.again': 'again!',
  'ut.p0': 'Blue',
  'ut.p1': 'Red',
  'ut.cpu': 'Computer',
  'ut.boards': ['board', 'boards'],
  'ut.turn.any': '{name} — play on any board',
  'ut.turn.here': '{name} — play on the lit board',
  'ut.turn.first': '{name} starts — play anywhere',
  'ut.thinking': '{name} is thinking…',
  'ut.turn.you.any': 'Your move — any board',
  'ut.turn.you.here': 'Your move — the lit board',
  'ut.turn.them': '{name} is moving…',
  'ut.online.wait': 'Waiting for the other player…',
  'ut.online.note': 'You’re playing online: the room creator starts new games and picks the rules.',
  'ut.online.waitnew': '{name} will start the next game',
  'ut.win.text': '{name} wins!',
  'ut.tie': 'A tie!',
  'ut.tie.stuck': 'Nobody can get three boards in a row any more.',
  'ut.tie.full': 'Every board is closed.',
  'ut.score': 'Boards {a} : {b}',
  'ut.say.board': ['My board!', 'Three in a row!', 'Mine!', 'Got it!', 'That one’s mine'],
  'ut.say.lostboard': ['Ugh…', 'Oh no', 'Oops', 'Hmm', 'Didn’t see that…'],
  'ut.say.free': ['Anywhere I like!', 'Freedom!', 'Thanks!', 'My pick'],
  'ut.say.threat': ['One more…', 'Almost!', 'Smell that?', 'Two down'],
  'ut.say.oops': ['Uh-oh', 'Shouldn’t have…', 'Oops'],
  'ut.say.dead': ['Nobody’s', 'Stalemate here', 'Empty'],
  'ut.say.win': ['Hooray!', 'Victory!', 'I’m a genius'],
  'ut.say.lose': ['Rematch?', 'Next time…', 'Whatever'],
  'ut.say.tie': ['A tie…', 'Hard-fought'],
  'ut.h.how': 'How to play',
  'ut.how': `
    <p><b>You need:</b> two players and a big 3 × 3 grid with a little tic-tac-toe board inside each of its squares.</p>
    <p><b>Goal:</b> win three small boards in a row — across, down or diagonally.</p>
    <ol>
      <li>Blue plays X, Red plays O, taking turns. The very first move can go in any square.</li>
      <li>After that, the key rule: <b>the square you pick tells your opponent which board to answer on</b>. Mark the top-right square of a small board, and they must play in the top-right big board. That board is lit up.</li>
      <li>Get three in a row on a small board and it’s yours. A won board is closed. A board that fills up with no three in a row is closed too, and belongs to nobody.</li>
      <li>Sent to a closed board? Then you may play <b>on any open board</b>.</li>
      <li>Three won boards in a row wins the game. If nobody can make such a row any more, the game ends in a tie.</li>
    </ol>`,
  'ut.h.tips': 'Tricks',
  'ut.tips': `
    <ul>
      <li>Every move is two moves: you take a square <i>here</i> and choose where your opponent goes <i>there</i>. The second part often matters more.</li>
      <li>Don’t send your opponent to a board where they already have two in a row.</li>
      <li>Sending them to a closed board hands them a free choice. That’s usually a generous gift.</li>
      <li>A small board’s center is strong, but every center move sends your opponent to the big center board — the most valuable one.</li>
      <li>Sometimes it pays to give up a small board that doesn’t matter on the big grid, just to steer your opponent where you want.</li>
    </ul>
    <p class="tip"><b>Variants.</b> In settings you can play “any one board” (fast and sharp), “most boards” (layout doesn’t matter), or let drawn boards count for both players, which makes rows easier. Other ideas to try on paper: marks “drop” to the bottom of a small board, as in Connect Four; or the “dual” game, where your opponent’s move picks the square and you pick the board.</p>`,
  'ut.h.origin': 'Where it comes from',
  'ut.origin': `
    <p>A similar game was sold back in 1977 as the board game “Tic Tac Toe Times 10”. Later came “Tic Tac Ku”, where you needed five boards out of nine, and you still had to play inside boards that were already won (that rule breaks the game, which is why a closed board gives a free move here).</p>
    <p>The game went mainstream in 2013 after a blog post by Ben Orlin hit Hacker News and Reddit and spawned a wave of apps. The name “Ultimate” came from his students at a high school in Oakland. It also goes by super, meta or fractal tic-tac-toe: each small board echoes the big one, so every decision plays out on two levels at once.</p>`,
});
