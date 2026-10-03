import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'n99.title': 'От 33 до 99',
  'n99.tagline': 'пять кубиков, четыре действия и одно число, к которому надо подобраться',
  'n99.mode': 'Играем:',
  'n99.mode.pvp': 'на одном устройстве',
  'n99.mode.easy': 'с компьютером (простой)',
  'n99.mode.normal': 'с компьютером (обычный)',
  'n99.mode.hard': 'с компьютером (гений)',
  'n99.players': 'Игроков:',
  'n99.timer': 'Таймер:',
  'n99.timer.off': 'без таймера',
  'n99.timer.s': '{n} секунд',
  'n99.timer.m': '{n} мин',
  'n99.rounds': 'Каждый задаёт цель:',
  'n99.rounds.n': ['раз', 'раза', 'раз'],
  'n99.online.note': 'Сейчас идёт игра по сети: новую партию начинает и настройки выбирает создатель комнаты.',
  'n99.online.waitnew': 'Новую партию начнёт {name}',
  'n99.online.note.n': 'За свободные места играет компьютер. Кто подключится посреди партии, займёт его место — сразу или со следующего раунда, если компьютер уже ответил в этом. Если игрок отключится, через 20 секунд за него продолжит компьютер.',
  'n99.cpu.n': 'Компьютер {n}',
  'n99.you': 'вы',
  'n99.away': 'нет связи',
  'n99.win.you': 'Победа за вами!',
  'n99.st.away': '{name}: нет связи, ждём…',
  'n99.st.lost': 'Нет связи с создателем комнаты…',
  'n99.st.spect': 'В этой партии нет места для вас — смотрим',
  'n99.auto.you': 'В этом раунде за вас ответил компьютер.',
  'n99.auto.next': 'Вы играете со следующего раунда.',
  'n99.again': 'ещё раз!',
  'n99.cpu': 'Компьютер',
  'n99.p0': 'Синий', 'n99.p1': 'Красный', 'n99.p2': 'Зелёный', 'n99.p3': 'Оранжевый', 'n99.p4': 'Лиловый',
  'n99.pts': ['очко', 'очка', 'очков'],
  'n99.target': 'цель',
  'n99.round': 'раунд {r} из {n}',
  'n99.pick.title': 'Выберите цель',
  'n99.pick.random': 'наугад',
  'n99.pick.wait': 'Кубики ждут броска…',
  'n99.best': 'лучшее: {v}',
  'n99.best.none': 'соберите все кубики в одно число',
  'n99.done': 'готово',
  'n99.reset': 'сначала',
  'n99.next': 'дальше',
  'n99.final': 'итоги',
  'n99.go': 'поехали!',
  'n99.cover.title': 'Ход: {name}',
  'n99.cover.sub': 'Остальные — не подглядывайте!',
  'n99.cover.timer': 'Таймер стартует после нажатия.',
  'n99.res.none': 'нет ответа',
  'n99.res.over': 'перебор',
  'n99.res.frac': 'не целое',
  'n99.res.best': 'можно было: {e} = {v}',
  'n99.res.bestsame': 'лучше не бывает!',
  'n99.st.pick': '{name} выбирает цель',
  'n99.st.pick.you': 'Выберите цель от 33 до 99',
  'n99.st.solve': '{name}: соберите {t}',
  'n99.st.solve.you': 'Соберите {t} или чуть меньше',
  'n99.st.wait': 'Ждём: {names}',
  'n99.still': 'Ещё считают: {names}',
  'n99.st.pass': 'Передайте устройство: {name}',
  'n99.st.reveal': 'Раунд {r}: {msg}',
  'n99.st.roundwin': 'лучше всех — {name}',
  'n99.st.roundtie': 'ничья',
  'n99.st.wait.net': 'Ждём второго игрока…',
  'n99.win': 'Побеждает {name}!',
  'n99.tie': 'Ничья!',
  'n99.tie.some': 'Ничья: {names}',
  'n99.say.target': ['Цель — {t}!', 'Загадываю {t}!', 'Пусть будет {t}', '{t}. Удачи!'],
  'n99.say.exact': ['В точку!', 'Ровно!', 'Есть!', 'Бинго!'],
  'n99.say.close': ['Почти!', 'Неплохо', 'Близко!'],
  'n99.say.far': ['Хм…', 'Ну такое', 'Эх', 'Не то…'],
  'n99.say.zero': ['Ноль очков!', 'Идеально!', 'Ровно {t}!'],
  'n99.say.bad': ['Десятка… увы', 'Ой-ой', 'Не мой раунд', 'Мимо'],
  'n99.say.envy': ['Как?!', 'Ничего себе', 'Ого!'],
  'n99.say.think': ['Так-так…', 'Сейчас…', 'Хмм…'],
  'n99.say.hurry': ['Быстрее!', 'Время!', 'Тик-так…'],
  'n99.say.win': ['Ура!', 'Победа!', 'Я считаю быстрее всех'],
  'n99.say.lose': ['Реванш?', 'В следующий раз…', 'Ну и ладно'],
  'n99.h.how': 'Как играть',
  'n99.how': `
    <p><b>Что нужно:</b> от двух до пяти игроков, пять обычных кубиков и, по желанию, таймер на минуту-две.</p>
    <p><b>Цель:</b> подобраться к загаданному числу как можно ближе, <b>не перескочив</b> его.</p>
    <ol>
      <li>Ведущий раунда называет число от <b>33 до 99</b>, затем бросаются пять кубиков.</li>
      <li>Каждый составляет из выпавших чисел выражение: <b>каждый кубик — ровно один раз</b>, действия + − × ÷ — сколько угодно и в любом порядке (скобки разрешены). Дроби по ходу можно, но ответ должен быть <b>целым</b> и <b>не больше цели</b>.</li>
      <li>Очки раунда — насколько ответ меньше цели. Ровно в цель — 0 очков. Больше 10 не бывает: перебор, дробь или «не успел» — тоже 10.</li>
      <li>Ведущим бывает каждый по очереди, одинаковое число раз. В конце побеждает тот, у кого <b>меньше всего очков</b>.</li>
    </ol>
    <p class="tip"><b>Как считать здесь:</b> нажмите на число, потом на действие, потом на второе число — они сольются в одно. Повторяйте, пока не останется одно число. Ошиблись — «отмена» или «сначала». Игра запоминает лучший ответ, так что можно пробовать снова. Нажмите «готово», когда довольны, — или дождитесь конца таймера.</p>`,
  'n99.h.tips': 'Хитрости',
  'n99.tips': `
    <ul>
      <li><b>Считайте с конца.</b> Цель 57? Это 60 − 3, или 9 × 6 + 3, или 8 × 7 + 1. Ищите в кубиках «большое произведение» и «маленькую поправку».</li>
      <li><b>Единица — джокер.</b> Умножение или деление на 1 ничего не меняет, так что лишнюю единицу всегда можно «спрятать».</li>
      <li><b>Две одинаковые — тоже джокер:</b> 4 − 4 = 0 можно прибавить, а 4 ÷ 4 = 1 — умножить. Так можно избавиться от лишней пары.</li>
      <li><b>Не бойтесь дробей</b> посередине: 6 ÷ (1 − 1/4) = 8, хотя ни одна четвёрка не делит шестёрку нацело.</li>
      <li>Сначала соберите <b>хоть что-нибудь</b> чуть ниже цели — это страховка. А потом ищите точное попадание.</li>
    </ul>
    <p class="tip"><b>Варианты из книги.</b> <i>«24»</i>: четыре кубика, цель всегда 24, кто нашёл решение первым — кричит и запускает короткий таймер для остальных. <i>«Банкир»</i>: один кубик, бросаете его снова и снова и применяете к накопленному числу каждое из четырёх действий ровно по разу — побеждает самый большой итог. <i>«Числовые клеточки»</i>: действия заранее нарисованы, а вы решаете, в какую клеточку вписать каждое выпавшее число.</p>`,
  'n99.h.origin': 'Откуда игра',
  'n99.origin': `
    <p>Задачи «получи число из данных цифр» встречались ещё в учебниках XVIII века. В 1881 году появилась знаменитая головоломка «четыре четвёрки» — составить из четырёх четвёрок все числа от 1 до 100. В Китае XX века разошлась игра «24», а с 1972 года похожий конкурс идёт на французском телевидении; британская версия называется <i>Countdown</i> и выдержала тысячи выпусков.</p>
    <p>Именно такие правила — с целью от 33 до 99 и пятью кубиками — Бен Орлин нашёл у геймдизайнера Райнера Книции, у которого игра называется «Девяносто девять». Орлин ценит её за то, что она переворачивает обычную задачу: ответ известен, а пример нужно придумать. Перебрать всё невозможно, так что выигрывают чутьё и находчивость — и порой совсем не те, кого считают «сильными в математике».</p>`,
});

addStrings('en', {
  'n99.title': '33 to 99',
  'n99.tagline': 'five dice, four operations, and one number to sneak up on',
  'n99.mode': 'Play:',
  'n99.mode.pvp': 'on one device',
  'n99.mode.easy': 'vs computer (easy)',
  'n99.mode.normal': 'vs computer (normal)',
  'n99.mode.hard': 'vs computer (genius)',
  'n99.players': 'Players:',
  'n99.timer': 'Timer:',
  'n99.timer.off': 'no timer',
  'n99.timer.s': '{n} seconds',
  'n99.timer.m': '{n} min',
  'n99.rounds': 'Each player leads:',
  'n99.rounds.n': ['time', 'times'],
  'n99.online.note': 'You’re playing online: the room creator starts new games and picks the settings.',
  'n99.online.waitnew': '{name} will start the next game',
  'n99.online.note.n': 'Free seats are played by the computer. Someone who joins mid-game takes over a computer seat — right away, or from the next round if the computer has already answered this one. If a player drops out, the computer takes over their seat after 20 seconds.',
  'n99.cpu.n': 'Computer {n}',
  'n99.you': 'you',
  'n99.away': 'offline',
  'n99.win.you': 'You win!',
  'n99.st.away': '{name} is offline, waiting…',
  'n99.st.lost': 'Lost the connection to the host…',
  'n99.st.spect': 'No seat for you in this game — watching',
  'n99.auto.you': 'The computer answered for you this round.',
  'n99.auto.next': 'You’re in from the next round.',
  'n99.again': 'again!',
  'n99.cpu': 'Computer',
  'n99.p0': 'Blue', 'n99.p1': 'Red', 'n99.p2': 'Green', 'n99.p3': 'Orange', 'n99.p4': 'Purple',
  'n99.pts': ['point', 'points'],
  'n99.target': 'target',
  'n99.round': 'round {r} of {n}',
  'n99.pick.title': 'Pick a target',
  'n99.pick.random': 'random',
  'n99.pick.wait': 'The dice are waiting to be rolled…',
  'n99.best': 'best: {v}',
  'n99.best.none': 'combine all dice into one number',
  'n99.done': 'done',
  'n99.reset': 'start over',
  'n99.next': 'next',
  'n99.final': 'results',
  'n99.go': 'let’s go!',
  'n99.cover.title': 'Turn: {name}',
  'n99.cover.sub': 'Everyone else — no peeking!',
  'n99.cover.timer': 'The timer starts when you tap.',
  'n99.res.none': 'no answer',
  'n99.res.over': 'too high',
  'n99.res.frac': 'not whole',
  'n99.res.best': 'possible: {e} = {v}',
  'n99.res.bestsame': 'can’t do better!',
  'n99.st.pick': '{name} picks the target',
  'n99.st.pick.you': 'Pick a target from 33 to 99',
  'n99.st.solve': '{name}: make {t}',
  'n99.st.solve.you': 'Make {t} or a bit less',
  'n99.st.wait': 'Waiting for {names}',
  'n99.still': 'Still working: {names}',
  'n99.st.pass': 'Pass the device to {name}',
  'n99.st.reveal': 'Round {r}: {msg}',
  'n99.st.roundwin': '{name} did best',
  'n99.st.roundtie': 'a tie',
  'n99.st.wait.net': 'Waiting for the other player…',
  'n99.win': '{name} wins!',
  'n99.tie': 'A tie!',
  'n99.tie.some': 'A tie: {names}',
  'n99.say.target': ['Target: {t}!', 'I call {t}!', 'Let’s say {t}', '{t}. Good luck!'],
  'n99.say.exact': ['Bullseye!', 'Exactly!', 'Got it!', 'Bingo!'],
  'n99.say.close': ['Almost!', 'Not bad', 'Close!'],
  'n99.say.far': ['Hmm…', 'Meh', 'Ugh', 'Not that…'],
  'n99.say.zero': ['Zero points!', 'Perfect!', 'Exactly {t}!'],
  'n99.say.bad': ['A ten… oh well', 'Oof', 'Not my round', 'Missed'],
  'n99.say.envy': ['How?!', 'Whoa', 'Wow!'],
  'n99.say.think': ['Let’s see…', 'Hold on…', 'Hmm…'],
  'n99.say.hurry': ['Hurry!', 'Time!', 'Tick-tock…'],
  'n99.say.win': ['Hooray!', 'Victory!', 'Fastest brain in town'],
  'n99.say.lose': ['Rematch?', 'Next time…', 'Whatever'],
  'n99.h.how': 'How to play',
  'n99.how': `
    <p><b>You need:</b> two to five players, five ordinary dice and, if you like, a one- or two-minute timer.</p>
    <p><b>Goal:</b> get as close as you can to the target number <b>without going over</b>.</p>
    <ol>
      <li>The round’s leader names a number from <b>33 to 99</b>, then the five dice are rolled.</li>
      <li>Everyone builds an expression from the dice: <b>each die exactly once</b>, with + − × ÷ as often as you like and in any order (brackets allowed). Fractions are fine along the way, but the answer must be a <b>whole number</b> and <b>no bigger than the target</b>.</li>
      <li>Your points for the round are how far below the target you land. Hit it exactly — 0 points. The most you can get is 10: going over, a fraction or running out of time all cost 10.</li>
      <li>Everyone leads the same number of rounds. At the end, the <b>fewest points</b> wins.</li>
    </ol>
    <p class="tip"><b>How to calculate here:</b> tap a number, then an operation, then a second number — they merge into one. Repeat until a single number is left. Made a mistake? Use “undo” or “start over”. The game keeps your best answer, so feel free to try again. Tap “done” when you’re happy — or let the timer run out.</p>`,
  'n99.h.tips': 'Tricks',
  'n99.tips': `
    <ul>
      <li><b>Work backwards.</b> Target 57? That’s 60 − 3, or 9 × 6 + 3, or 8 × 7 + 1. Look for a “big product” plus a “small correction” in the dice.</li>
      <li><b>A 1 is a wildcard.</b> Multiplying or dividing by 1 changes nothing, so a spare 1 can always be tucked away.</li>
      <li><b>So is a pair:</b> 4 − 4 = 0 can be added and 4 ÷ 4 = 1 can be multiplied in — a neat way to dump two dice you don’t need.</li>
      <li><b>Don’t fear fractions</b> in the middle: 6 ÷ (1 − 1/4) = 8, even though 4 doesn’t go into 6.</li>
      <li>First grab <b>anything</b> a little below the target as insurance. Then hunt for the exact hit.</li>
    </ul>
    <p class="tip"><b>Variants from the book.</b> <i>24</i>: four dice, the target is always 24, and whoever finds a solution first shouts and starts a short timer for everyone else. <i>Banker</i>: one die, rolled again and again, and you apply each of the four operations exactly once to your running number — highest total wins. <i>Number Boxes</i>: the operations are drawn in advance, and you decide which box each rolled number goes into.</p>`,
  'n99.h.origin': 'Where it comes from',
  'n99.origin': `
    <p>“Make this number from these digits” puzzles already appear in 18th-century textbooks. In 1881 came the famous Four Fours puzzle — make every number from 1 to 100 out of four 4s. The 24 Game spread through China in the 20th century, and since 1972 a similar contest has run on French TV; the British version, <i>Countdown</i>, has aired thousands of episodes.</p>
    <p>This exact ruleset — a target from 33 to 99 and five dice — Ben Orlin found in a book by game designer Reiner Knizia, who calls it Ninety-Nine. Orlin loves how it flips the usual school exercise: you know the answer and have to invent the calculation. You can never check every possibility, so intuition and inventiveness win the day — often for people nobody would call “math people”.</p>`,
});
