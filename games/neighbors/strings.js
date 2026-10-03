import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'nb.title': 'Соседи',
  'nb.tagline': 'одни и те же числа — и у каждого свой узор',
  'nb.mode': 'Играем:',
  'nb.mode.solo': 'в одиночку, на рекорд',
  'nb.mode.pvp': 'за одним экраном',
  'nb.mode.easy': 'с компьютером (простой)',
  'nb.mode.normal': 'с компьютером (обычный)',
  'nb.mode.hard': 'с компьютером (хитрый)',
  'nb.players': 'Игроков:',
  'nb.source': 'Числа:',
  'nb.source.die': 'десятигранный кубик',
  'nb.source.deck': 'колода из 40 карт',
  'nb.boards': 'Чужие доски:',
  'nb.boards.open': 'видны всем',
  'nb.boards.secret': 'скрыты до конца',
  'nb.hints': 'Подсказка:',
  'nb.hints.off': 'выключена',
  'nb.hints.on': 'показывать хорошую клетку',
  'nb.again': 'ещё раз!',
  'nb.p0': 'Синий',
  'nb.p1': 'Красный',
  'nb.p2': 'Зелёный',
  'nb.p3': 'Оранжевый',
  'nb.cpu': 'Компьютер',
  'nb.pts': ['очко', 'очка', 'очков'],
  'nb.secret.score': 'очки: ?',
  'nb.turn': '{name}: куда поставить {v}?',
  'nb.turn.solo': 'Куда поставить {v}?',
  'nb.turn.you': 'Ваше число — {v}. Куда?',
  'nb.thinking': '{name} думает…',
  'nb.wait.them': 'Ждём, пока {name} впишет {v}…',
  'nb.online.wait': 'Ждём второго игрока…',
  'nb.online.note': 'Сейчас идёт игра по сети: новую партию начинает и правила выбирает создатель комнаты.',
  'nb.online.waitnew': 'Новую партию начнёт {name}',
  'nb.round': 'бросок {k} из 25',
  'nb.round.card': 'карта {k} из 25',
  'nb.deckleft': 'осталось в колоде',
  'nb.best': 'рекорд',
  'nb.best.none': 'рекорда пока нет',
  'nb.pass.title': 'Передайте устройство',
  'nb.pass.who': 'Ходит {name}',
  'nb.pass.show': 'показать доску',
  'nb.win': 'Побеждает {name}!',
  'nb.tie': 'Ничья!',
  'nb.tie.some': 'Ничья: {names}',
  'nb.solo.total': 'Итог: {pts}',
  'nb.solo.record': 'Новый рекорд!',
  'nb.solo.best': 'Рекорд: {n}',
  'nb.view.hint': 'маленькую доску можно увеличить',
  'nb.say.big': ['Ого, +{n}!', 'Вот это соседи!', '+{n}! Красота', 'Целая компания!'],
  'nb.say.pair': ['Пара!', 'Рядышком!', '+{n}', 'Соседи!'],
  'nb.say.meh': ['Куда же её…', 'Некуда!', 'Эх, мимо', 'Ну и число…'],
  'nb.say.dump': ['Сюда, в уголок', 'Мелочь — на окраину', 'Лучшее место не отдам'],
  'nb.say.wow': ['Ничего себе!', 'Везёт же…', 'Хм!'],
  'nb.say.win': ['Ура!', 'Победа!', 'Вот это узор!'],
  'nb.say.lose': ['Реванш?', 'В другой раз…', 'Ну и ладно'],
  'nb.say.tie': ['Поровну!', 'Ничья?!'],
  'nb.say.record': ['Новый рекорд!', 'Лучше всех раз!'],
  'nb.say.solo': ['Неплохо!', 'Можно и лучше', 'Ещё разок?'],
  'nb.h.how': 'Как играть',
  'nb.how': `
    <p><b>Что нужно:</b> сколько угодно игроков (можно и одному), у каждого своя сетка 5&nbsp;×&nbsp;5, и один общий десятигранный кубик с числами от 1 до 10.</p>
    <p><b>Цель:</b> набрать больше всех очков, ставя одинаковые числа по соседству.</p>
    <ol>
      <li>Бросаем кубик. Каждый игрок вписывает выпавшее число в любую пустую клетку <b>своей</b> сетки — нажмите на клетку.</li>
      <li>Так 25 раз, пока сетка не заполнится. Число нельзя пропустить или отложить на потом.</li>
      <li><b>Подсчёт.</b> Если одинаковые числа стоят вплотную друг к другу в строке или в столбце (5-5, 8-8-8…), такая цепочка приносит сумму своих чисел. Одно и то же число может засчитаться дважды — в строке и в столбце.</li>
      <li>Побеждает тот, у кого больше очков.</li>
    </ol>
    <p>Здесь очки считаются по ходу игры: цепочки обводятся, а счёт виден на карточке игрока.</p>`,
  'nb.h.tips': 'Хитрости',
  'nb.tips': `
    <ul>
      <li><b>Квадрат лучше линии.</b> Четыре тройки в ряд дают 12 очков, а те же тройки квадратом 2&nbsp;×&nbsp;2 — целых 24: каждая считается и в строке, и в столбце.</li>
      <li><b>Большие числа дороже.</b> Пара десяток стоит как десять пар единиц. Держите для крупных чисел просторные места.</li>
      <li><b>Свалка для мелочи.</b> Единице или двойке без пары найдите тихий угол или место среди непохожих чисел — там клетка всё равно ничего не принесёт.</li>
      <li><b>Не продавайте лучшую клетку дёшево.</b> Под конец посмотрите, какая пустая клетка может дать больше всего. Иногда выгоднее отказаться от одного очка сейчас, чтобы оставить место для крупного числа.</li>
    </ul>
    <p class="tip"><b>Варианты.</b> <i>Колода:</i> вместо кубика — 40 карт, по четыре каждого числа от 1 до 10. Выпавшая карта уходит в сброс, поэтому каждое повторение делает следующее менее вероятным. <i>Тайные доски:</i> обычно сетки держат в секрете до подсчёта; за одним экраном игра тогда просит передать устройство. Оба варианта — в настройках.</p>`,
  'nb.h.origin': 'Откуда игра',
  'nb.origin': `
    <p>У «Соседей» нет известного автора. Игру десятилетиями передавали друг другу учителя математики в Миннесоте — как в «испорченном телефоне», часто под названием «Пять на пять». Цепочку учителей удаётся проследить примерно до конца 1980-х, а дальше след теряется.</p>
    <p>Скорее всего, это переделка старой словесной игры (её называют Wordsworth, Crosswords или «Задумай букву»): игроки по очереди называют буквы, каждый вписывает их в свою сетку 5&nbsp;×&nbsp;5 и получает очки за слова в строках и столбцах. Кто-то однажды заменил буквы числами — и вместо тысяч слов осталось всего десять символов. Казалось бы, скучнее, но нет: вариантов заполнить сетку — квинтиллионы, и две одинаковые доски почти никогда не встречаются.</p>`,
});

addStrings('en', {
  'nb.title': 'Neighbors',
  'nb.tagline': 'same numbers for everyone, a different pattern for each',
  'nb.mode': 'Play:',
  'nb.mode.solo': 'solo, chasing a record',
  'nb.mode.pvp': 'on one screen',
  'nb.mode.easy': 'vs computer (easy)',
  'nb.mode.normal': 'vs computer (normal)',
  'nb.mode.hard': 'vs computer (sneaky)',
  'nb.players': 'Players:',
  'nb.source': 'Numbers:',
  'nb.source.die': 'ten-sided die',
  'nb.source.deck': 'deck of 40 cards',
  'nb.boards': 'Other boards:',
  'nb.boards.open': 'open to all',
  'nb.boards.secret': 'secret till the end',
  'nb.hints': 'Hint:',
  'nb.hints.off': 'off',
  'nb.hints.on': 'mark a good cell',
  'nb.again': 'again!',
  'nb.p0': 'Blue',
  'nb.p1': 'Red',
  'nb.p2': 'Green',
  'nb.p3': 'Orange',
  'nb.cpu': 'Computer',
  'nb.pts': ['point', 'points'],
  'nb.secret.score': 'score: ?',
  'nb.turn': '{name}: where does the {v} go?',
  'nb.turn.solo': 'Where does the {v} go?',
  'nb.turn.you': 'Your number is {v}. Where?',
  'nb.thinking': '{name} is thinking…',
  'nb.wait.them': 'Waiting for {name} to place the {v}…',
  'nb.online.wait': 'Waiting for the other player…',
  'nb.online.note': 'You’re playing online: the room creator starts new games and picks the rules.',
  'nb.online.waitnew': '{name} will start the next game',
  'nb.round': 'roll {k} of 25',
  'nb.round.card': 'card {k} of 25',
  'nb.deckleft': 'left in the deck',
  'nb.best': 'best',
  'nb.best.none': 'no record yet',
  'nb.pass.title': 'Pass the device',
  'nb.pass.who': '{name} to play',
  'nb.pass.show': 'show my board',
  'nb.win': '{name} wins!',
  'nb.tie': 'A tie!',
  'nb.tie.some': 'A tie: {names}',
  'nb.solo.total': 'Total: {pts}',
  'nb.solo.record': 'New record!',
  'nb.solo.best': 'Best: {n}',
  'nb.view.hint': 'tap a small board to zoom in',
  'nb.say.big': ['Whoa, +{n}!', 'What neighbors!', '+{n}! Lovely', 'A whole crowd!'],
  'nb.say.pair': ['A pair!', 'Side by side!', '+{n}', 'Neighbors!'],
  'nb.say.meh': ['Where do I put this…', 'Nowhere to go!', 'Ugh, no luck', 'What a number…'],
  'nb.say.dump': ['Into the corner', 'Small fry to the edge', 'Saving the good spot'],
  'nb.say.wow': ['Wow!', 'Lucky…', 'Hmm!'],
  'nb.say.win': ['Hooray!', 'Victory!', 'What a pattern!'],
  'nb.say.lose': ['Rematch?', 'Next time…', 'Whatever'],
  'nb.say.tie': ['Dead even!', 'A tie?!'],
  'nb.say.record': ['New record!', 'Best ever!'],
  'nb.say.solo': ['Not bad!', 'I can do better', 'One more?'],
  'nb.h.how': 'How to play',
  'nb.how': `
    <p><b>You need:</b> any number of players (even just one), a 5&nbsp;×&nbsp;5 grid for each, and one shared ten-sided die numbered 1 to 10.</p>
    <p><b>Goal:</b> score the most points by putting equal numbers next to each other.</p>
    <ol>
      <li>Roll the die. Every player writes the number in any empty cell of <b>their own</b> grid — tap a cell.</li>
      <li>Repeat 25 times, until the grid is full. You can’t skip a number or save it for later.</li>
      <li><b>Scoring.</b> Whenever equal numbers touch in a row or a column (5-5, 8-8-8…), that run scores the sum of its numbers. The same number can count twice — once in its row and once in its column.</li>
      <li>Highest total wins.</li>
    </ol>
    <p>Here the scoring happens as you go: runs get circled and the total shows on each player’s card.</p>`,
  'nb.h.tips': 'Tricks',
  'nb.tips': `
    <ul>
      <li><b>Squares beat lines.</b> Four 3s in a row make 12 points; the same 3s in a 2&nbsp;×&nbsp;2 square make 24, since each one counts in its row and its column.</li>
      <li><b>Big numbers pay more.</b> A pair of 10s is worth ten pairs of 1s. Keep roomy spots for the big ones.</li>
      <li><b>Have a junk drawer.</b> A lonely 1 or 2 belongs in a quiet corner or among unrelated numbers, where the cell wouldn’t score anyway.</li>
      <li><b>Don’t sell prime real estate cheap.</b> Late in the game, look for the empty cell that could score the most. Sometimes it’s worth passing up a point now to keep that spot for a big number.</li>
    </ul>
    <p class="tip"><b>Variants.</b> <i>Deck:</i> instead of a die, use 40 cards, four of each number 1–10. Drawn cards are discarded, so every repeat makes the next one less likely. <i>Secret boards:</i> traditionally grids stay hidden until scoring; on one screen the game then asks you to pass the device. Both are in the settings.</p>`,
  'nb.h.origin': 'Where it comes from',
  'nb.origin': `
    <p>Neighbors has no known inventor. For decades it was passed along by math teachers in Minnesota, telephone-game style, often under the name “Five by Five”. The chain of teachers can be traced back to the late 1980s, and then the trail goes cold.</p>
    <p>It is most likely a remake of an older word game (known as Wordsworth, Crosswords or Think of a Letter): players take turns calling out letters, everyone writes them into their own 5&nbsp;×&nbsp;5 grid, and words along rows and columns score. Someone swapped the letters for numbers — trading thousands of words for just ten symbols. Sounds duller, but it isn’t: there are quintillions of ways to fill a grid, and two identical boards almost never happen.</p>`,
});
