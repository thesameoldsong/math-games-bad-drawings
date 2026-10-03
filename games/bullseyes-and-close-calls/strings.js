import { addStrings } from '../../shared/i18n.js';

// Little inline pictures of the two kinds of feedback, matching the board.
const BULL = '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5" fill="none" stroke="#3b3b44" stroke-width="2.2"/><circle cx="10" cy="10" r="3.4" fill="#3b3b44"/></svg>';
const CLOSE = '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5" fill="none" stroke="#3b3b44" stroke-width="2.2"/></svg>';

addStrings('ru', {
  'bc.title': 'В яблочко и почти',
  'bc.tagline': 'быки и коровы: угадай чужое число раньше, чем угадают твоё',
  'bc.mode': 'Играем:',
  'bc.mode.pvp': 'вдвоём',
  'bc.mode.easy': 'с компьютером (рассеянный)',
  'bc.mode.normal': 'с компьютером (обычный)',
  'bc.mode.hard': 'с компьютером (сыщик)',
  'bc.len': 'Цифр в числе:',
  'bc.rep': 'Повторы цифр:',
  'bc.rep.off': 'нельзя',
  'bc.rep.on': 'можно (вариант)',
  'bc.count': 'Счётчик вариантов:',
  'bc.count.off': 'скрыт',
  'bc.count.on': 'показывать',
  'bc.again': 'ещё раз!',
  'bc.p0': 'Синий',
  'bc.p1': 'Красный',
  'bc.cpu': 'Компьютер',
  'bc.guesses': ['попытка', 'попытки', 'попыток'],
  'bc.bulls': ['в яблочко', 'в яблочко', 'в яблочко'],
  'bc.closes': ['почти', 'почти', 'почти'],
  'bc.fb.zero': 'Ни одной цифры!',
  'bc.lbl.bull': 'в яблочко',
  'bc.lbl.close': 'почти',
  'bc.fb.win': 'Все {n} в яблочко!',
  'bc.card.secret': '№ {code}',
  'bc.card.choosing': 'загадывает…',
  'bc.card.ready': 'загадано ✓',
  'bc.col': '{name} угадывает',
  'bc.more': '↑ ещё {n}',
  'bc.st.cover': 'Загадывает {name}',
  'bc.st.setup': '{name}: загадайте число',
  'bc.st.setup.you': 'Загадайте своё число',
  'bc.st.setup.wait': 'Ждём, пока {name} загадает число…',
  'bc.st.turn': 'Угадывает {name}',
  'bc.st.you': 'Ваша попытка',
  'bc.st.them': 'Угадывает {name}…',
  'bc.st.thinking': '{name} думает…',
  'bc.st.last': '{name}: последний шанс сравнять!',
  'bc.setup.title': 'Загадайте число',
  'bc.setup.distinct': '{d} — соперник будет его угадывать',
  'bc.setup.rep': '{d}, можно с повторами',
  'bc.ddigits': ['разная цифра', 'разные цифры', 'разных цифр'],
  'bc.digits': ['цифра', 'цифры', 'цифр'],
  'bc.setup.waiting': 'Ваше число загадано. Ждём соперника…',
  'bc.lock': 'загадать!',
  'bc.go': 'проверить!',
  'bc.notes': 'заметки',
  'bc.possible': 'подходит чисел: {n}',
  'bc.reveal': 'Числа: {a} и {b}',
  'bc.cover.title': 'Передайте устройство',
  'bc.cover.who': '{name} загадывает число',
  'bc.cover.note': 'Остальным — не подглядывать!',
  'bc.cover.btn': 'показать',
  'bc.win': 'Побеждает {name}!',
  'bc.win.sub': 'отгадано за {n}',
  'bc.tie': 'Ничья!',
  'bc.tie.sub': 'обоим понадобилось {n}',
  'bc.next': 'Следующую партию начинает {name}',
  'bc.online.wait': 'Ждём второго игрока…',
  'bc.online.note': 'Сейчас идёт игра по сети: длину числа и новую партию выбирает создатель комнаты.',
  'bc.online.waitnew': 'Ждём, когда {name} начнёт новую партию',
  'bc.say.locked': ['Загадано!', 'Не угадаешь!', 'Готово', 'Хе-хе'],
  'bc.say.great': ['Ага!', 'Многое прояснилось', 'Вот это улов!', 'Отличная проба'],
  'bc.say.meh': ['Хм…', 'Мало толку', 'Ничего нового', 'Эх'],
  'bc.say.zero': ['Ноль — тоже ответ!', 'Вычёркиваю!', 'Минус четыре цифры'],
  'bc.say.know': ['Я знаю твоё число!', 'Теперь не уйдёшь!', 'Осталось одно…'],
  'bc.say.last': ['Последний шанс…', 'Не всё потеряно!', 'Ну держись'],
  'bc.say.win': ['Ура!', 'Победа!', 'Элементарно!'],
  'bc.say.lose': ['Реванш?', 'В следующий раз…', 'Почти!'],
  'bc.say.tie': ['Ничья!', 'Поровну', 'Ноздря в ноздрю'],
  'bc.h.how': 'Как играть',
  'bc.how': `
    <p><b>Что нужно:</b> двое, ручка и бумага. Здесь бумагу заменяет экран, а ответы считает компьютер — честно.</p>
    <p><b>Цель:</b> отгадать тайное число соперника за меньшее число попыток.</p>
    <ol>
      <li>Каждый загадывает число из <b>четырёх разных цифр</b> (ноль в начале — можно). В игре вдвоём за одним экраном загадывайте по очереди, пока второй отвернулся.</li>
      <li>По очереди называйте догадки — тоже четыре разные цифры. В ответ вы узнаёте:
        <br>${BULL} <b>в яблочко</b> — цифра есть в числе и стоит на своём месте;
        <br>${CLOSE} <b>почти</b> — цифра есть, но стоит в другом месте.
        <br>Сколько каких — скажут, а <i>какие именно</i> — нет.</li>
      <li>Побеждает тот, кто отгадает число за меньшее число попыток. Если первый игрок отгадал, у второго есть ещё одна попытка: отгадает тоже — ничья.</li>
    </ol>
    <p>Кнопка <b>✎ заметки</b> превращает клавиатуру в черновик: нажатия по цифрам вычёркивают их или обводят. В настройках можно играть числами из 3 или 5 цифр и разрешить повторы.</p>`,
  'bc.h.tips': 'Хитрости',
  'bc.tips': `
    <ul>
      <li>Ответ «ни одной цифры» — подарок: сразу вычёркивайте все четыре.</li>
      <li>Каждая догадка — это вопрос. Хороший вопрос делит оставшиеся варианты на много мелких кучек, чтобы любой ответ отсекал побольше.</li>
      <li>Не обязательно называть число, которое может быть ответом. Пусть осталось четыре варианта, отличающихся одной цифрой: перебирая их, можно потратить четыре хода. А одна хитрая «проба» с заведомо неверным числом различит их все — и следующий ход будет победным.</li>
      <li>Включите в настройках <b>счётчик вариантов</b> — и смотрите, во сколько раз сузился круг после каждого ответа.</li>
    </ul>
    <p class="tip"><b>Компьютер.</b> Рассеянный помнит только три последних ответа. Обычный каждый раз называет любое число, подходящее под все ответы, — и чаще всего отгадывает за 5–6 ходов. Сыщик выбирает самую полезную пробу, даже если это заведомо не ответ.</p>
    <p><b>Варианты:</b></p>
    <ul>
      <li><b>С повторами</b> (есть в настройках): цифры в числах могут повторяться. Каждая цифра засчитывается один раз: для числа 1112 догадка 2223 даёт всего одно «почти».</li>
      <li><b>Сам себя выдаёшь:</b> каждую догадку проверяют на обоих числах — и вы честно сообщаете, что она дала бы против вашего собственного. Осторожнее с вопросами!</li>
      <li><b>Одна ложь:</b> раз за игру каждый может дать неверный ответ (кроме случая, когда число отгадано целиком).</li>
      <li><b>Скупой ответ:</b> говорят только «есть хоть одно попадание в яблочко» или «нет». Игра становится медленнее и коварнее.</li>
      <li><b>Слова вместо чисел:</b> загадываются слова из четырёх (или пяти) разных букв, а угадывать можно только настоящими словами.</li>
    </ul>`,
  'bc.h.origin': 'Откуда игра',
  'bc.origin': `
    <p>Это старая бумажная игра «Быки и коровы»: бык — попадание точно в цель, корова — нужная цифра не на своём месте. Кто её придумал, неизвестно; в Британии в неё играли уже в начале XX века. В конце 1960-х — начале 1970-х её версии появились на компьютерах Кембриджа и MIT, а израильский инженер-связист Мордехай Мейеровиц превратил её в настольную игру с цветными штырьками — «Мастермайнд», которая разошлась десятками миллионов коробок. Бен Орлин переименовал быков и коров в «яблочко» и «почти».</p>
    <p>В 1976 году Дональд Кнут показал, что в «Мастермайнд» можно всегда отгадать код не больше чем за пять ходов: на каждом шаге выбирать догадку, у которой даже самый неудачный ответ отсекает больше всего вариантов.</p>
    <p><b>Почему это важно.</b> Игра — про поиск информации. Люди склонны задавать вопросы, которые подтверждают то, во что они уже верят, а не те, что могут их опровергнуть. Здесь такая привычка наказывается сразу: пустой вопрос — пустой ответ.</p>`,
});

addStrings('en', {
  'bc.title': 'Bullseyes and Close Calls',
  'bc.tagline': 'bulls and cows: crack their number before they crack yours',
  'bc.mode': 'Play:',
  'bc.mode.pvp': 'two players',
  'bc.mode.easy': 'vs computer (scatterbrain)',
  'bc.mode.normal': 'vs computer (normal)',
  'bc.mode.hard': 'vs computer (detective)',
  'bc.len': 'Digits:',
  'bc.rep': 'Repeated digits:',
  'bc.rep.off': 'not allowed',
  'bc.rep.on': 'allowed (variant)',
  'bc.count': 'Options counter:',
  'bc.count.off': 'hidden',
  'bc.count.on': 'shown',
  'bc.again': 'again!',
  'bc.p0': 'Blue',
  'bc.p1': 'Red',
  'bc.cpu': 'Computer',
  'bc.guesses': ['guess', 'guesses'],
  'bc.bulls': ['bullseye', 'bullseyes'],
  'bc.closes': ['close call', 'close calls'],
  'bc.fb.zero': 'Not a single digit!',
  'bc.lbl.bull': 'bullseye',
  'bc.lbl.close': 'close call',
  'bc.fb.win': 'All {n} bullseyes!',
  'bc.card.secret': '# {code}',
  'bc.card.choosing': 'choosing…',
  'bc.card.ready': 'ready ✓',
  'bc.col': '{name} guesses',
  'bc.more': '↑ {n} more',
  'bc.st.cover': '{name} picks a number',
  'bc.st.setup': '{name}: pick your number',
  'bc.st.setup.you': 'Pick your secret number',
  'bc.st.setup.wait': 'Waiting for {name} to pick a number…',
  'bc.st.turn': '{name} guesses',
  'bc.st.you': 'Your guess',
  'bc.st.them': '{name} is guessing…',
  'bc.st.thinking': '{name} is thinking…',
  'bc.st.last': '{name}: last chance to tie!',
  'bc.setup.title': 'Pick a secret number',
  'bc.setup.distinct': '{d} — your opponent will hunt for it',
  'bc.setup.rep': '{d}, repeats allowed',
  'bc.ddigits': ['different digit', 'different digits'],
  'bc.digits': ['digit', 'digits'],
  'bc.setup.waiting': 'Your number is set. Waiting for your opponent…',
  'bc.lock': 'lock it!',
  'bc.go': 'check!',
  'bc.notes': 'notes',
  'bc.possible': 'numbers still possible: {n}',
  'bc.reveal': 'Numbers: {a} and {b}',
  'bc.cover.title': 'Pass the device',
  'bc.cover.who': '{name} picks a number',
  'bc.cover.note': 'Everyone else — no peeking!',
  'bc.cover.btn': 'show',
  'bc.win': '{name} wins!',
  'bc.win.sub': 'cracked in {n}',
  'bc.tie': 'A tie!',
  'bc.tie.sub': 'both needed {n}',
  'bc.next': '{name} starts the next game',
  'bc.online.wait': 'Waiting for the other player…',
  'bc.online.note': 'You’re playing online: the room creator picks the number length and starts new games.',
  'bc.online.waitnew': 'Waiting for {name} to start a new game',
  'bc.say.locked': ['Locked in!', 'Good luck!', 'Done', 'Heh heh'],
  'bc.say.great': ['Aha!', 'That helps a lot', 'Great probe!', 'Now we’re talking'],
  'bc.say.meh': ['Hmm…', 'Not much there', 'Nothing new', 'Meh'],
  'bc.say.zero': ['Zero is an answer too!', 'Crossing them out!', 'Four digits gone'],
  'bc.say.know': ['I know your number!', 'Got you!', 'Only one left…'],
  'bc.say.last': ['One last shot…', 'Not over yet!', 'Hold on'],
  'bc.say.win': ['Hooray!', 'Victory!', 'Elementary!'],
  'bc.say.lose': ['Rematch?', 'Next time…', 'So close!'],
  'bc.say.tie': ['A tie!', 'Even!', 'Neck and neck'],
  'bc.h.how': 'How to play',
  'bc.how': `
    <p><b>You need:</b> two players, pens and paper. Here the screen is the paper and the computer gives the answers — honestly.</p>
    <p><b>Goal:</b> crack your opponent’s secret number in fewer guesses than they need for yours.</p>
    <ol>
      <li>Each player picks a secret number of <b>four different digits</b> (a leading zero is fine). Sharing one screen? Take turns while the other looks away.</li>
      <li>Take turns guessing — again four different digits. Each guess gets an answer:
        <br>${BULL} <b>bullseye</b> — a right digit in the right place;
        <br>${CLOSE} <b>close call</b> — a right digit in the wrong place.
        <br>You learn how many of each, but <i>not which digits</i> they are.</li>
      <li>Whoever cracks the number in fewer guesses wins. If the first player cracks it, the second still gets one more try: cracking it too makes a tie.</li>
    </ol>
    <p>The <b>✎ notes</b> button turns the keypad into scratch paper: tap digits to cross them out or circle them. Settings let you play with 3 or 5 digits and allow repeats.</p>`,
  'bc.h.tips': 'Tricks',
  'bc.tips': `
    <ul>
      <li>“Not a single digit” is a gift: cross out all four at once.</li>
      <li>Every guess is a question. A good question splits the remaining options into many small piles, so whatever the answer, lots get crossed out.</li>
      <li>You don’t have to guess a number that could be right. Say four options remain, differing in one digit: trying them one by one may cost four turns. One clever probe with a number you know is wrong can tell them all apart — and your next guess wins.</li>
      <li>Turn on the <b>options counter</b> in settings and watch how much each answer shrinks the field.</li>
    </ul>
    <p class="tip"><b>The computer.</b> The scatterbrain only remembers its last three answers. Normal always guesses some number that fits every answer so far — usually cracking yours in 5–6 turns. The detective picks the most useful probe, even when it knows the probe is wrong.</p>
    <p><b>Variants:</b></p>
    <ul>
      <li><b>Repeats allowed</b> (in settings): digits may repeat. Each digit counts only once: against 1112, the guess 2223 earns just one close call.</li>
      <li><b>Self-incrimination:</b> every guess is checked against both numbers — you also announce what it would score against your own. Choose your questions carefully!</li>
      <li><b>One lie:</b> once per game each player may give a false answer (except when the number has been cracked).</li>
      <li><b>Tight lips:</b> the only answer is “there’s at least one bullseye” or “there isn’t”. Slower and sneakier.</li>
      <li><b>Words instead of numbers:</b> pick a word of four (or five) different letters; guesses must be real words too.</li>
    </ul>`,
  'bc.h.origin': 'Where it comes from',
  'bc.origin': `
    <p>This is the old pen-and-paper game Bulls and Cows: a bull is a dead hit, a cow is a right digit in the wrong spot. Nobody knows who invented it; British players knew it by the early 20th century. In the late 1960s and early 1970s it showed up on computers at Cambridge and MIT, and then the Israeli telecom engineer Mordecai Meirowitz turned it into a board game with colored pegs — Mastermind — which sold tens of millions of copies. Ben Orlin renamed the bulls and cows “bullseyes” and “close calls”.</p>
    <p>In 1976 Donald Knuth showed that a Mastermind code can always be cracked in at most five guesses: at every step, pick the guess whose most disappointing answer still crosses out the most options.</p>
    <p><b>Why it matters.</b> The game is about hunting for information. People tend to ask questions that confirm what they already believe rather than ones that might prove them wrong. Here that habit is punished at once: ask an empty question, get an empty answer.</p>`,
});
