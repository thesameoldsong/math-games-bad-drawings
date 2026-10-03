import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'jam.title': 'Джем',
  'jam.tagline': 'берите числа по очереди и соберите три, дающих в сумме 15',
  'jam.mode': 'Играем:',
  'jam.mode.pvp': 'вдвоём',
  'jam.mode.easy': 'с компьютером (простой)',
  'jam.mode.normal': 'с компьютером (обычный)',
  'jam.mode.hard': 'с компьютером (без ошибок)',
  'jam.first': 'Первым в 1-й партии:',
  'jam.layout': 'Числа:',
  'jam.layout.line': 'по порядку',
  'jam.layout.magic': 'магическим квадратом',
  'jam.hints': 'Подсказки:',
  'jam.hints.off': 'нет',
  'jam.hints.on': 'отмечать опасные числа',
  'jam.settings.note': 'Первый ход переходит от партии к партии, победы копятся.',
  'jam.again': 'ещё партию!',
  'jam.p0': 'Синий',
  'jam.p1': 'Красный',
  'jam.cpu': 'Компьютер',
  'jam.wins': ['победа', 'победы', 'побед'],
  'jam.turn': 'Ходит {name}: выберите число',
  'jam.thinking': '{name} думает…',
  'jam.turn.you': 'Ваш ход: выберите число',
  'jam.turn.them': 'Ходит {name}…',
  'jam.online.wait': 'Ждём второго игрока…',
  'jam.online.note': 'Сейчас идёт игра по сети: новую партию начинает и настройки выбирает создатель комнаты.',
  'jam.online.waitnew': 'Новую партию откроет {name}, когда нажмёт «ещё партию»',
  'jam.win': 'Побеждает {name}!',
  'jam.tie': 'Ничья!',
  'jam.why.tie': 'Числа кончились, а 15 ни у кого не сложилось.',
  'jam.next': 'Следующую партию начинает {name}',
  'jam.legend.need': 'кому-то хватит этого числа до 15',
  'jam.say.threat': ['Ещё одно…', 'Хм-хм', 'Считаю…', 'Почти!'],
  'jam.say.fork': ['Две дырки сразу!', 'Вилка!', 'Обе не закроешь!'],
  'jam.say.block': ['Это моё!', 'Не выйдет!', 'Забираю!', 'Стоп!'],
  'jam.say.worried': ['Ой-ой', 'Хм…', 'Так-так…'],
  'jam.say.missed': ['Фух!', 'Пронесло!', 'Проглядели?'],
  'jam.say.gift': ['Спасибо!', 'Оставили мне?', 'Ого!'],
  'jam.say.win': ['Пятнадцать!', 'Ура!', 'Сошлось!'],
  'jam.say.lose': ['Реванш?', 'Эх…', 'Ну и ладно'],
  'jam.say.tie': ['Ничья!', 'Поровну', 'Ну и ну'],
  'jam.h.how': 'Как играть',
  'jam.how': `
    <p><b>Что нужно:</b> двое и числа от 1 до 9. На бумаге их просто выписывают в строчку и обводят.</p>
    <p><b>Цель:</b> первым собрать <b>три</b> своих числа, которые вместе дают <b>15</b>.</p>
    <ol>
      <li>Ходите по очереди: нажмите на любое свободное число — оно ваше. Взятое число второй раз взять нельзя.</li>
      <li>Ваши числа можно собирать в тройки как угодно: подходят любые три из них, не обязательно взятые подряд. Например, 2, 8 и 5.</li>
      <li>Как только у кого-то нашлась тройка с суммой 15 — он побеждает. Если числа кончились, а тройки ни у кого нет, — ничья.</li>
    </ol>
    <p>Первый ход переходит от партии к партии. Счёт побед — под именами игроков.</p>`,
  'jam.h.tips': 'Хитрости',
  'jam.tips': `
    <ul>
      <li>Следите не только за своими суммами, но и за чужими: каждый раз спрашивайте себя, <b>какое число нужно сопернику</b>, — и забирайте его.</li>
      <li>Сильнее всего <b>5</b>: она входит сразу в четыре тройки. Чётные 2, 4, 6, 8 — в три. А 1, 3, 7, 9 — только в две.</li>
      <li>Лучший приём — <b>вилка</b>: ход, после которого вам не хватает до 15 сразу двух разных чисел. Соперник успеет забрать только одно.</li>
    </ul>
    <p class="tip"><b>Секрет игры.</b> Расставьте числа магическим квадратом: 2 7 6 / 9 5 1 / 4 3 8. Каждая строка, столбец и диагональ дают 15 — и других троек с суммой 15 нет. Значит, Джем — это обычные <b>крестики-нолики</b>, только переодетые! Включите в настройках «магический квадрат» и проверьте. Пятёрка — центр, чётные — углы. При правильной игре партия кончается вничью, и компьютер «без ошибок» это знает.</p>
    <p class="tip"><b>Придумайте свою маскировку.</b> Тех же «крестиков-ноликов» можно спрятать в словах: возьмите девять слов так, чтобы общая буква была у трёх слов только тогда, когда это строка, столбец или диагональ квадрата. Игроки по очереди забирают слова, и выигрывает тот, у кого три слова с общей буквой. Составить такой набор — отдельная головоломка.</p>`,
  'jam.h.origin': 'Откуда игра',
  'jam.origin': `
    <p>Игра «на пятнадцать» давно гуляет по сборникам головоломок — её ещё называют «числовым скрабблом». Название «Джем» пришло из статьи по психологии 1967 года, где такую игру назвали «изоморфом крестиков-ноликов». Психологов интересовало, как люди решают задачи: одна и та же игра в разной одежде даётся нам совсем по-разному.</p>
    <p>Математики называют такие пары <b>изоморфными</b>: правила разные, а устройство одно и то же. Стоит найти такой «мост» — и знания из одной игры сами переносятся в другую.</p>`,
});

addStrings('en', {
  'jam.title': 'Jam',
  'jam.tagline': 'take turns picking numbers and collect three that add up to 15',
  'jam.mode': 'Play:',
  'jam.mode.pvp': 'two players',
  'jam.mode.easy': 'vs computer (easy)',
  'jam.mode.normal': 'vs computer (normal)',
  'jam.mode.hard': 'vs computer (flawless)',
  'jam.first': 'First move in game 1:',
  'jam.layout': 'Numbers:',
  'jam.layout.line': 'in order',
  'jam.layout.magic': 'as a magic square',
  'jam.hints': 'Hints:',
  'jam.hints.off': 'off',
  'jam.hints.on': 'mark dangerous numbers',
  'jam.settings.note': 'The first move passes back and forth between games; wins add up.',
  'jam.again': 'another game!',
  'jam.p0': 'Blue',
  'jam.p1': 'Red',
  'jam.cpu': 'Computer',
  'jam.wins': ['win', 'wins'],
  'jam.turn': '{name}: pick a number',
  'jam.thinking': '{name} is thinking…',
  'jam.turn.you': 'Your move: pick a number',
  'jam.turn.them': '{name} is moving…',
  'jam.online.wait': 'Waiting for the other player…',
  'jam.online.note': 'You’re playing online: the room creator starts new games and picks the settings.',
  'jam.online.waitnew': 'The next game opens when {name} taps “another game”',
  'jam.win': '{name} wins!',
  'jam.tie': 'A tie!',
  'jam.why.tie': 'The numbers ran out and nobody made 15.',
  'jam.next': '{name} moves first next game',
  'jam.legend.need': 'this number would finish someone’s 15',
  'jam.say.threat': ['One more…', 'Hmm-hmm', 'Counting…', 'Almost!'],
  'jam.say.fork': ['Two holes at once!', 'A fork!', 'Can’t block both!'],
  'jam.say.block': ['Mine now!', 'Nope!', 'I’ll take that!', 'Stop right there'],
  'jam.say.worried': ['Uh-oh', 'Hmm…', 'Let me think…'],
  'jam.say.missed': ['Phew!', 'That was close!', 'Didn’t see it?'],
  'jam.say.gift': ['Thanks!', 'For me?', 'Ooh!'],
  'jam.say.win': ['Fifteen!', 'Hooray!', 'It adds up!'],
  'jam.say.lose': ['Rematch?', 'Ugh…', 'Whatever'],
  'jam.say.tie': ['A tie!', 'Even!', 'Well, well'],
  'jam.h.how': 'How to play',
  'jam.how': `
    <p><b>You need:</b> two players and the numbers 1 to 9. On paper, just write them in a row and circle them as they’re taken.</p>
    <p><b>Goal:</b> be the first to own <b>three</b> numbers that add up to <b>15</b>.</p>
    <ol>
      <li>Take turns tapping any free number — it’s yours. A number can only be taken once.</li>
      <li>Any three of your numbers count, in any order and not necessarily taken one after another. For example 2, 8 and 5.</li>
      <li>As soon as someone holds a trio summing to 15, they win. If the numbers run out and nobody has one, it’s a tie.</li>
    </ol>
    <p>The first move passes back and forth between games. The win count sits under each player’s name.</p>`,
  'jam.h.tips': 'Tricks',
  'jam.tips': `
    <ul>
      <li>Watch your opponent’s sums as closely as your own: each turn ask <b>which number they need</b> — and grab it.</li>
      <li><b>5</b> is the strongest number: it belongs to four trios. The even numbers 2, 4, 6, 8 sit in three each; 1, 3, 7, 9 in only two.</li>
      <li>The best trick is a <b>fork</b>: a move after which two different numbers would each complete your 15. Your opponent can only take one of them.</li>
    </ul>
    <p class="tip"><b>The secret.</b> Arrange the numbers as a magic square: 2 7 6 / 9 5 1 / 4 3 8. Every row, column and diagonal adds to 15 — and no other trio does. So Jam is plain <b>tic-tac-toe</b> in disguise! Switch the layout to “magic square” in the settings and see for yourself. The 5 is the centre, the even numbers are the corners. With perfect play the game is a draw, and the flawless computer knows it.</p>
    <p class="tip"><b>Invent your own disguise.</b> You can hide tic-tac-toe in words too: choose nine words so that three of them share a letter exactly when they form a row, column or diagonal of the square. Players take turns claiming words; three words with a common letter win. Building such a set is a puzzle of its own.</p>`,
  'jam.h.origin': 'Where it comes from',
  'jam.origin': `
    <p>The “make 15” game has long circulated in puzzle books, sometimes under the name Number Scrabble. The name “Jam” comes from a 1967 psychology paper that called a game like this “an isomorph of tic-tac-toe”. Psychologists were interested in how people solve problems: the same game in different clothes can feel easy or hard depending on how it looks.</p>
    <p>Mathematicians call such pairs <b>isomorphic</b>: different rules, identical structure. Once you find the bridge, everything you know about one game carries straight over to the other.</p>`,
});
