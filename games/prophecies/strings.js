import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'pro.title': 'Пророчества',
  'pro.tagline': 'предсказания, которые сбываются — или сами себя опровергают',
  'pro.size': 'Поле:',
  'pro.mode': 'Играем:',
  'pro.mode.pvp': 'вдвоём',
  'pro.mode.easy': 'с компьютером (простой)',
  'pro.mode.normal': 'с компьютером (обычный)',
  'pro.mode.hard': 'с компьютером (провидец)',
  'pro.variant': 'Считаем:',
  'pro.variant.classic': 'числа',
  'pro.variant.x': 'крестики (X-вариант)',
  'pro.hints': 'Подсказки у края:',
  'pro.hints.on': 'показывать',
  'pro.hints.off': 'скрыть',
  'pro.again': 'ещё раз!',
  'pro.p0': 'Синий',
  'pro.p1': 'Красный',
  'pro.cpu': 'Компьютер',
  'pro.pts': ['очко', 'очка', 'очков'],
  'pro.preds': ['прогноз', 'прогноза', 'прогнозов'],
  'pro.turn': 'Ходит {name}',
  'pro.pickval': 'Что написать в клетке?',
  'pro.thinking': '{name} думает…',
  'pro.turn.you': 'Ваш ход',
  'pro.turn.them': 'Ходит {name}…',
  'pro.online.wait': 'Ждём второго игрока…',
  'pro.online.note': 'Сейчас идёт игра по сети: новую партию начинает, поле и правила выбирает создатель комнаты.',
  'pro.online.waitnew': 'Новую партию начнёт {name}',
  'pro.next': 'Следующую партию начинает {name}',
  'pro.win': 'Побеждает {name}!',
  'pro.tie': 'Ничья!',
  'pro.final': '{a} : {b}',
  'pro.say.true': ['Сбудется!', 'Так и будет', 'Я вижу будущее', 'Записано!'],
  'pro.say.kill': ['Не сбудется!', 'Пророчество сорвано', 'А вот и нет', 'Ха!'],
  'pro.say.hurt': ['Эй!', 'Моё пророчество…', 'Ну вот', 'Хм…'],
  'pro.say.self': ['Ой, не сбудется', 'Что же я делаю…', 'Упс'],
  'pro.say.thanks': ['Спасибо!', 'Спасибо за помощь', 'Хе-хе'],
  'pro.say.win': ['Как и было предсказано!', 'Ура!', 'Всё сбылось'],
  'pro.say.lose': ['Реванш?', 'Этого не было в пророчестве…', 'Ну и ладно'],
  'pro.say.tie': ['Поровну!', 'Ничья?!'],
  'pro.h.how': 'Как играть',
  'pro.how': `
    <p><b>Что нужно:</b> двое и клетчатое поле от 4 × 4 до 8 × 8.</p>
    <p><b>Цель:</b> угадать, <b>сколько чисел</b> окажется в строке или столбце, — и вписать это число туда же.</p>
    <ol>
      <li>Ходите по очереди: выберите пустую клетку и впишите в неё <b>число</b> или <b>крестик</b>.</li>
      <li>Число — это пророчество: «в этой строке (или в этом столбце) в конце будет ровно столько чисел». Подходят числа от 1 до длины самой длинной стороны поля. Крестик просто занимает клетку, чтобы числа там не было.</li>
      <li>В одной строке и в одном столбце <b>не может быть двух одинаковых чисел</b> — чьи бы они ни были.</li>
      <li>Если в клетку уже никакое число не вписать, она зачёркивается сама. Это не ход.</li>
      <li>Когда поле заполнено, считаем числа в каждой строке. Если там есть верное пророчество, его автор получает столько очков, сколько чисел в строке. Потом так же со столбцами — одно число может принести очки дважды.</li>
      <li>Побеждает тот, у кого больше очков.</li>
    </ol>
    <p class="tip">Нажмите на клетку, затем выберите число или ✕ в панели под полем. С клавиатуры — цифры и X.</p>`,
  'pro.h.tips': 'Хитрости',
  'pro.tips': `
    <ul>
      <li>Число у края поля показывает, <b>сколько чисел в линии может оказаться</b> к концу: от «сейчас есть» до «если все пустые станут числами». Пророчество вне этого промежутка уже не сбудется — такие числа бледнеют. В X-варианте подсказки считают крестики.</li>
      <li>Любое новое число само меняет счёт в своей строке и столбце. Хотите вписать 2, когда в строке уже одно число? Вписав его, вы сделаете чисел два — и пророчество сбудется. Но и каждое число соперника сдвигает счёт — иногда прямо мимо вашего прогноза.</li>
      <li>Крестик — оружие: он не даёт строке «дорасти» до чужого пророчества. А число — тоже оружие: оно «перерастает» чужой прогноз.</li>
      <li>Большие числа ценнее, но сбываются только в почти полных линиях. Маленькие легко сорвать.</li>
      <li>Хорошее число работает дважды — и в строке, и в столбце.</li>
    </ul>
    <p class="tip"><b>Другие варианты.</b> <i>X-пророчества</i>: число предсказывает количество крестиков, а не чисел (есть в настройках). <i>Судоку</i>: играйте на нерешённом судоку — пророчество действует ещё и в своём квадрате 3 × 3, а напечатанные цифры ничьи. <i>Причудливые поля</i>: вместо строк и столбцов — любые пересекающиеся области. Втроём или вчетвером тоже можно, только поле нужно побольше.</p>`,
  'pro.h.origin': 'Откуда игра',
  'pro.origin': `
    <p>Игру придумал Энди Джуэлл для конкурса «Игра на тысячу лет» (2010): нужно было изобрести что-то простое и глубокое, во что можно играть хоть палочкой на песке. Он ужал в неё собственную настольную игру. Бен Орлин включил её в книгу под названием «Пророчества».</p>
    <p>Сама идея — числа, которые описывают сами себя, — уходит в большую математику. Самоописывающие фразы вроде «в этом предложении сорок две буквы» родня парадоксу лжеца, а Курт Гёдель в 1931 году построил утверждения, говорящие о собственной недоказуемости, и показал, что никакая система аксиом не докажет всех истин арифметики. Из попыток с этим разобраться выросли работы Алана Тьюринга — и компьютеры.</p>`,
});

addStrings('en', {
  'pro.title': 'Prophecies',
  'pro.tagline': 'predictions that fulfil — or defeat — themselves',
  'pro.size': 'Board:',
  'pro.mode': 'Play:',
  'pro.mode.pvp': 'two players',
  'pro.mode.easy': 'vs computer (easy)',
  'pro.mode.normal': 'vs computer (normal)',
  'pro.mode.hard': 'vs computer (seer)',
  'pro.variant': 'Count:',
  'pro.variant.classic': 'numbers',
  'pro.variant.x': 'X’s (X-variant)',
  'pro.hints': 'Edge hints:',
  'pro.hints.on': 'show',
  'pro.hints.off': 'hide',
  'pro.again': 'again!',
  'pro.p0': 'Blue',
  'pro.p1': 'Red',
  'pro.cpu': 'Computer',
  'pro.pts': ['point', 'points'],
  'pro.preds': ['forecast', 'forecasts'],
  'pro.turn': '{name} to move',
  'pro.pickval': 'What goes in the cell?',
  'pro.thinking': '{name} is thinking…',
  'pro.turn.you': 'Your move',
  'pro.turn.them': '{name} is moving…',
  'pro.online.wait': 'Waiting for the other player…',
  'pro.online.note': 'You’re playing online: the room creator starts new games and picks the board and rules.',
  'pro.online.waitnew': '{name} will start the next game',
  'pro.next': '{name} starts the next game',
  'pro.win': '{name} wins!',
  'pro.tie': 'A tie!',
  'pro.final': '{a} : {b}',
  'pro.say.true': ['It shall be!', 'So it is written', 'I see the future', 'Foretold!'],
  'pro.say.kill': ['Not gonna happen!', 'Prophecy broken', 'Nope', 'Ha!'],
  'pro.say.hurt': ['Hey!', 'My prophecy…', 'Oh no', 'Hmm…'],
  'pro.say.self': ['Oops, I proved myself wrong', 'What have I done…', 'Whoops'],
  'pro.say.thanks': ['Thanks!', 'You helped me', 'Heh'],
  'pro.say.win': ['I foresaw it!', 'Hooray!', 'All came true'],
  'pro.say.lose': ['Rematch?', 'Didn’t see that coming…', 'Whatever'],
  'pro.say.tie': ['Even!', 'A tie?!'],
  'pro.h.how': 'How to play',
  'pro.how': `
    <p><b>You need:</b> two players and a grid from 4 × 4 up to 8 × 8.</p>
    <p><b>Goal:</b> predict <b>how many numbers</b> a row or column will end up with — by writing that very number inside it.</p>
    <ol>
      <li>Take turns: pick an empty cell and write either a <b>number</b> or an <b>X</b>.</li>
      <li>A number is a prophecy: “this row (or this column) will finish with exactly this many numbers.” Use 1 up to the length of the board’s longer side. An X just fills a cell so no number can go there.</li>
      <li><b>No number may appear twice</b> in the same row or column, whoever wrote it.</li>
      <li>If no number can legally go into a cell any more, it gets crossed out automatically. That isn’t a turn.</li>
      <li>When the board is full, count the numbers in each row. If the row holds a correct prophecy, its author scores that many points. Then do the same for columns — one number can score twice.</li>
      <li>Most points wins.</li>
    </ol>
    <p class="tip">Tap a cell, then choose a number or ✕ in the panel under the board. On a keyboard, type a digit or X.</p>`,
  'pro.h.tips': 'Tricks',
  'pro.tips': `
    <ul>
      <li>The figure at the edge of each line shows <b>how many numbers it can still end with</b>: from “what’s there now” to “if every blank becomes a number”. A prophecy outside that range can no longer come true, so it fades. In the X-variant the hints count X’s instead.</li>
      <li>Every new number changes the count of its own row and column. Want to write 2 in a row that already has one number? Writing it makes two — so it fulfils itself. But every number your opponent adds shifts the count too — sometimes right past your forecast.</li>
      <li>An X is a weapon: it stops a line from growing into a rival prophecy. A number is a weapon too: it pushes the count past their forecast.</li>
      <li>Big numbers pay more but only come true in crowded lines. Small ones are easy to spoil.</li>
      <li>A well-placed number works twice — in its row and in its column.</li>
    </ul>
    <p class="tip"><b>Other ways to play.</b> <i>X-Prophecies</i>: a number predicts the count of X’s instead of numbers (available in settings). <i>Sudoku board</i>: play on an unsolved sudoku; each prophecy also covers its 3 × 3 box, and the printed digits belong to nobody. <i>Exotic boards</i>: any set of overlapping regions instead of rows and columns. Three or four players work too, on a bigger board.</p>`,
  'pro.h.origin': 'Where it comes from',
  'pro.origin': `
    <p>Andy Juell invented it for the 2010 “Thousand-Year Game Design Challenge”: make something simple and deep enough to be played for centuries, even with a stick in the dirt. He distilled it from a board game of his own. Ben Orlin included it in his book under the name “Prophecies”.</p>
    <p>The idea of numbers that describe themselves runs deep. Self-counting sentences are cousins of the liar’s paradox, and in 1931 Kurt Gödel built statements that talk about their own unprovability, showing that no set of axioms can prove every truth of arithmetic. Alan Turing’s work grew out of wrestling with that result — and so did computers.</p>`,
});
