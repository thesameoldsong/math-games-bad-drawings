import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'pb.title': 'Бумажный бокс',
  'pb.tagline': 'пятнадцать раундов на листке в клетку: проигрывай с размахом, выигрывай впритык',
  'pb.mode': 'Играем:',
  'pb.mode.pvp': 'вдвоём',
  'pb.mode.easy': 'с компьютером (новичок)',
  'pb.mode.normal': 'с компьютером (боксёр)',
  'pb.mode.hard': 'с компьютером (чемпион)',
  'pb.rules': 'Выбор чисел:',
  'pb.rules.secret': 'тайно, одновременно',
  'pb.rules.open': 'открыто, по очереди',
  'pb.boards': 'Таблицы:',
  'pb.boards.arrange': 'расставляем сами',
  'pb.boards.random': 'случайные',
  'pb.again': 'ещё бой!',
  'pb.p0': 'Синий',
  'pb.p1': 'Красный',
  'pb.cpu': 'Компьютер',
  'pb.pts': ['очко', 'очка', 'очков'],
  'pb.round': 'Раунд {r} из 15',
  'pb.setup.hint': 'нажмите две клетки — они поменяются местами',
  'pb.choose': 'выберите клетку',
  'pb.st.turn': 'Раунд {r}: выбирает {name}',
  'pb.st.you': 'Раунд {r}: ваш удар',
  'pb.st.wait': 'Раунд {r} · очередь: {name}',
  'pb.st.answer': 'Раунд {r}: отвечает {name}',
  'pb.setup.you': 'Расставьте свои числа',
  'pb.setup.status': '{name} расставляет числа',
  'pb.setup.wait': 'Ждём, пока {name} расставит числа…',
  'pb.shuffle': 'перемешать',
  'pb.ready': 'готово!',
  'pb.punch': 'бью {x}!',
  'pb.tap': 'выберите клетку рядом с кружком',
  'pb.picked': '{name}: удар готов',
  'pb.thinking': '{name} думает…',
  'pb.trapped': '{name} в тупике — дальше нули',
  'pb.cover.title': 'Экран для: {name}',
  'pb.cover.note': 'остальным — не подглядывать!',
  'pb.cover.btn': 'это я!',
  'pb.cover.status': 'Выбирает {name}',
  'pb.last.win': 'Раунд {r}: {a} против {b} → +1 {name}',
  'pb.last.tie': 'Раунд {r}: {a} против {b} — ничья',
  'pb.win': 'Побеждает {name}! {a} : {b}',
  'pb.tie': 'Ничья! {a} : {b}',
  'pb.online.wait': 'Ждём второго игрока…',
  'pb.online.note': 'Сейчас идёт игра по сети: правила и новую партию выбирает создатель комнаты.',
  'pb.online.waitnew': 'Новую партию начнёт {name}',
  'pb.say.ready': ['К бою!', 'Готово', 'Держись!', 'Поехали'],
  'pb.say.thin': ['Впритык!', 'Ровно хватило', 'Экономно!', 'Чуть-чуть — а моё'],
  'pb.say.big': ['Бум!', 'Нокдаун!', 'Получай!', 'Хук справа!'],
  'pb.say.cheap': ['Пустая трата!', 'Ха, переплата', 'Это была мелочь', 'Ну и пусть'],
  'pb.say.lost': ['Ой', 'Эх…', 'Мимо', 'Больно'],
  'pb.say.tie': ['Клинч!', 'Ничья', 'Поровну', 'Хм'],
  'pb.say.trap': ['Ой… удары кончились', 'Тупик!', 'Некуда идти…'],
  'pb.say.free': ['А у меня ещё есть!', 'Хе-хе', 'Мой ринг'],
  'pb.say.picked': ['Решено', 'Хм-хм', 'Готово', 'Секрет!'],
  'pb.say.win': ['Чемпион!', 'Пояс мой!', 'Победа!'],
  'pb.say.lose': ['Реванш?', 'В следующий раз…', 'Ещё увидимся'],
  'pb.say.draw': ['Ничья!', 'Оба молодцы'],
  'pb.h.how': 'Как играть',
  'pb.how': `
    <p><b>Что нужно:</b> двое, у каждого своя таблица 4 × 4. Левый верхний угол пуст — это стартовая клетка, в остальные пятнадцать вписаны числа от 1 до 15.</p>
    <p><b>Цель:</b> выиграть больше раундов из пятнадцати.</p>
    <ol>
      <li><b>Расстановка.</b> Каждый тайно раскладывает свои числа: нажмите две клетки, чтобы поменять их местами, или просто перемешайте. Когда оба готовы, таблицы открываются и видны до конца игры.</li>
      <li><b>Раунд.</b> Оба <b>тайно</b> выбирают клетку в своей таблице — <b>соседнюю</b> с последней (по стороне или по диагонали) и ещё не пройденную. В первом раунде соседи стартового угла — три клетки.</li>
      <li>Выборы открываются: <b>большее число</b> приносит своему хозяину очко. Равные числа — никому.</li>
      <li>Каждый ведёт линию в выбранную клетку — получается путь. Возвращаться на пройденные клетки нельзя, а вот пересекать свой путь по диагонали — можно.</li>
      <li>Если идти больше некуда — вы в тупике и до конца игры выставляете <b>ноль</b>.</li>
      <li>После 15 раундов побеждает тот, у кого больше очков. Бывает и ничья.</li>
    </ol>`,
  'pb.h.tips': 'Хитрости',
  'pb.tips': `
    <ul>
      <li><b>Проигрывай с размахом, выигрывай впритык.</b> Раунд, выигранный 15 против 3, — пустая трата большого числа. Лучше победить 9 против 8, а проигрывать, сжигая свои единицы и двойки, пока соперник тратит тузы.</li>
      <li><b>Береги путь.</b> Пятнадцать клеток — пятнадцать раундов. Если загнать себя в угол рано, остаток игры вы будете выставлять нули, а соперник — собирать очки чем угодно.</li>
      <li><b>Смотри в чужую таблицу.</b> Таблица соперника открыта: видно, какие числа ему доступны на этом ходу. Если вокруг него одна мелочь — сейчас самое время выиграть дёшево.</li>
      <li>Как расставлять числа — загадка даже для автора книги. Совет простой: раскидайте их более-менее случайно, чтобы у вас всегда был выбор.</li>
    </ul>
    <p class="tip"><b>Варианты.</b> <i>Классика:</i> числа называют вслух по очереди — первым ходит победитель прошлого раунда, а в самом начале тот, у кого больше сумма вокруг старта (включается в настройках). <i>Смешанные единоборства:</i> вместо чисел 1–15 впишите любые 15 целых чисел с суммой 120 — например, с одной огромной «бомбой». <i>Блотто:</i> совсем быстрая родственница — каждый тайно делит 20 на три слагаемых по возрастанию, и сравнивают попарно.</p>`,
  'pb.h.origin': 'Откуда игра',
  'pb.origin': `
    <p>Бумажный бокс придумал Сид Саксон — знаменитый изобретатель настольных игр — и напечатал в сборнике <i>A Gamut of Games</i> (1969). У Саксона игроки называли числа открыто, по очереди, а тот, кто заходил в тупик, сразу проигрывал.</p>
    <p>Бен Орлин изменил две вещи: выбор стал тайным и одновременным, а тупик — не поражением, а нулями до конца боя.</p>
    <p>Главный урок игры — «проигрывай с размахом, выигрывай впритык» — работает везде, где ограниченный ресурс делят между многими состязаниями с чёткой чертой «победа/поражение». Самый известный и самый неприятный пример — джерримендеринг: нарезка избирательных округов так, чтобы голоса соперника пропадали в немногих округах с огромным перевесом, а свои победы были узкими, но многочисленными.</p>`,
});

addStrings('en', {
  'pb.title': 'Paper Boxing',
  'pb.tagline': 'fifteen rounds on graph paper: lose big, win small',
  'pb.mode': 'Play:',
  'pb.mode.pvp': 'two players',
  'pb.mode.easy': 'vs computer (rookie)',
  'pb.mode.normal': 'vs computer (boxer)',
  'pb.mode.hard': 'vs computer (champ)',
  'pb.rules': 'Choices:',
  'pb.rules.secret': 'secret, at once',
  'pb.rules.open': 'open, in turn',
  'pb.boards': 'Grids:',
  'pb.boards.arrange': 'arrange ourselves',
  'pb.boards.random': 'random',
  'pb.again': 'another bout!',
  'pb.p0': 'Blue',
  'pb.p1': 'Red',
  'pb.cpu': 'Computer',
  'pb.pts': ['point', 'points'],
  'pb.round': 'Round {r} of 15',
  'pb.setup.hint': 'tap two squares to swap them',
  'pb.choose': 'pick a square',
  'pb.st.turn': 'Round {r}: {name} chooses',
  'pb.st.you': 'Round {r}: your punch',
  'pb.st.wait': 'Round {r} · {name} to choose',
  'pb.st.answer': 'Round {r}: {name} answers',
  'pb.setup.you': 'Arrange your numbers',
  'pb.setup.status': '{name} is arranging',
  'pb.setup.wait': 'Waiting for {name} to arrange…',
  'pb.shuffle': 'shuffle',
  'pb.ready': 'ready!',
  'pb.punch': 'punch {x}!',
  'pb.tap': 'tap a square next to the circle',
  'pb.picked': '{name} has chosen',
  'pb.thinking': '{name} is thinking…',
  'pb.trapped': '{name} is stuck — zeros from now on',
  'pb.cover.title': 'Over to {name}',
  'pb.cover.note': 'everyone else — no peeking!',
  'pb.cover.btn': 'it’s me!',
  'pb.cover.status': '{name} chooses',
  'pb.last.win': 'Round {r}: {a} vs {b} → +1 {name}',
  'pb.last.tie': 'Round {r}: {a} vs {b} — a tie',
  'pb.win': '{name} wins! {a} : {b}',
  'pb.tie': 'A draw! {a} : {b}',
  'pb.online.wait': 'Waiting for the other player…',
  'pb.online.note': 'You’re playing online: the room creator picks the rules and starts new games.',
  'pb.online.waitnew': '{name} will start the next game',
  'pb.say.ready': ['Ready!', 'Bring it', 'Let’s go', 'Gloves on'],
  'pb.say.thin': ['Just enough!', 'Close shave', 'Cheap win!', 'By a whisker'],
  'pb.say.big': ['Boom!', 'Knockdown!', 'Take that!', 'Right hook!'],
  'pb.say.cheap': ['Wasted it!', 'Ha, overkill', 'Small change', 'Fine by me'],
  'pb.say.lost': ['Ouch', 'Ugh…', 'Missed', 'Oof'],
  'pb.say.tie': ['Clinch!', 'Even', 'Stalemate', 'Hmm'],
  'pb.say.trap': ['Uh… out of punches', 'Dead end!', 'Nowhere to go…'],
  'pb.say.free': ['I’m not!', 'Heh heh', 'My ring now'],
  'pb.say.picked': ['Decided', 'Hmm-hmm', 'Done', 'Secret!'],
  'pb.say.win': ['Champion!', 'The belt is mine!', 'Victory!'],
  'pb.say.lose': ['Rematch?', 'Next time…', 'I let you win'],
  'pb.say.draw': ['A draw!', 'Well fought'],
  'pb.h.how': 'How to play',
  'pb.how': `
    <p><b>You need:</b> two players, each with a 4 × 4 grid. The top-left corner is blank — that’s the start — and the other fifteen squares hold the numbers 1 to 15.</p>
    <p><b>Goal:</b> win more of the fifteen rounds.</p>
    <ol>
      <li><b>Set-up.</b> Each player arranges their numbers in secret: tap two squares to swap them, or just shuffle. Once both are ready, the grids are revealed and stay visible all game.</li>
      <li><b>A round.</b> Both players <b>secretly</b> choose a square in their own grid — <b>next to</b> their latest one (sideways or diagonally) and not visited before. In round one, that’s the three squares around the blank corner.</li>
      <li>Reveal: the <b>higher number</b> scores its owner a point. Equal numbers score nothing.</li>
      <li>Each player draws a line to the chosen square, building a path. You can’t revisit a square, but your path may cross itself diagonally.</li>
      <li>If you have nowhere left to go, you’re stuck and play a <b>zero</b> for every remaining round.</li>
      <li>After 15 rounds, more points wins. Draws happen.</li>
    </ol>`,
  'pb.h.tips': 'Tricks',
  'pb.tips': `
    <ul>
      <li><b>Lose big, win small.</b> Winning 15 to 3 wastes a big number. Better to win 9 to 8 — and when you lose, burn your 1s and 2s while your opponent spends their aces.</li>
      <li><b>Mind your path.</b> Fifteen squares, fifteen rounds. Box yourself in early and you’ll play zeros for the rest of the bout while your opponent wins with anything.</li>
      <li><b>Read their grid.</b> Your opponent’s grid is public: you can see which numbers they can reach this turn. If they’re surrounded by small fry, now is the time for a cheap win.</li>
      <li>How to arrange your numbers is a mystery even to the book’s author. The simple advice: scatter them more or less randomly, so you always have options.</li>
    </ul>
    <p class="tip"><b>Variants.</b> <i>Classic:</i> numbers are announced in public, one player at a time — the last round’s winner goes first, and at the very start, whoever has the bigger sum around the blank square (switch it on in settings). <i>Mixed martial arts:</i> instead of 1–15, fill your grid with any 15 whole numbers adding up to 120 — say, with one giant “bomb”. <i>Blotto:</i> a lightning-fast cousin — each player secretly splits 20 into three numbers in increasing order, and the lists are compared spot by spot.</p>`,
  'pb.h.origin': 'Where it comes from',
  'pb.origin': `
    <p>Paper Boxing was invented by Sid Sackson, the celebrated game designer, and published in his collection <i>A Gamut of Games</i> (1969). In Sackson’s version, players named their numbers openly, one at a time, and getting stuck meant losing on the spot.</p>
    <p>Ben Orlin changed two things: choices became secret and simultaneous, and getting stuck now means zeros for the rest of the bout rather than instant defeat.</p>
    <p>The game’s big lesson — “lose big, win small” — applies whenever a limited resource is spread across many contests, each with a sharp win/lose line. The most famous and most troubling example is gerrymandering: drawing districts so the other party’s votes pile up in a few lopsided wins while your own victories are narrow but numerous.</p>`,
});
