import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'sae.title': 'Саэсара',
  'sae.tagline': 'угадай тайное правило, по которому на доску ложатся числа',
  'sae.p0': 'Синий', 'sae.p1': 'Красный', 'sae.p2': 'Зелёный', 'sae.p3': 'Лиловый',
  'sae.cpu': 'Компьютер',
  'sae.pts': ['очко', 'очка', 'очков'],
  'sae.maker.badge': 'загадывает',

  // settings
  'sae.mode': 'Играем:',
  'sae.mode.hot': 'за одним устройством',
  'sae.mode.easy': 'с компьютером (простой)',
  'sae.mode.normal': 'с компьютером (обычный)',
  'sae.mode.hard': 'с компьютером (сильный)',
  'sae.players': 'Игроков:',
  'sae.players.1': '1 (головоломка)',
  'sae.maker': 'Правило загадывает:',
  'sae.maker.cpu': 'компьютер',
  'sae.maker.players': 'каждый по очереди',
  'sae.tier': 'Правила:',
  'sae.tier.easy': 'простые',
  'sae.tier.medium': 'посложнее',
  'sae.tier.hard': 'коварные',
  'sae.board': 'Доска:',
  'sae.board.6': '6 × 6, до 10 (быстрая)',
  'sae.board.8': '8 × 8, до 20 (обычная)',
  'sae.board.10': '10 × 10, до 30 (большая)',
  'sae.rounds': 'Раундов:',
  'sae.note.players': 'Каждый игрок по разу загадывает правило — раундов столько же, сколько игроков. Компьютер следит за честностью: отвечает «да/нет» и находит контрпримеры.',
  'sae.online.note': 'Идёт игра по сети: правило загадывает компьютер, а новую партию и настройки выбирает создатель комнаты.',

  // status line
  'sae.st.try': '{name}: куда поставить {n}?',
  'sae.st.try.solo': 'Куда поставить {n}?',
  'sae.st.decide': '{name}: угадаете правило или пас?',
  'sae.st.decide.solo': 'Угадаете правило или ещё попытка?',
  'sae.st.thinking': '{name} думает…',
  'sae.st.you': 'Ваш ход: куда поставить {n}?',
  'sae.st.you.decide': 'Угадаете правило или пас?',
  'sae.st.them': 'Ходит {name}…',
  'sae.st.wait': 'Ждём второго игрока…',
  'sae.st.make': '{name} загадывает правило…',
  'sae.st.vote': '{name} предлагает сдаться',
  'sae.st.yes': 'Да! {n} встаёт сюда.',
  'sae.st.no': 'Нет, {n} сюда нельзя.',
  'sae.st.round': 'Раунд {r} из {k}',

  // action bar
  'sae.btn.guess': 'угадать правило',
  'sae.btn.pass': 'пас',
  'sae.btn.more': 'ещё попытка',
  'sae.btn.giveup': 'сдаться?',
  'sae.btn.giveup.sure': 'точно сдаться?',
  'sae.btn.giveup.agree': 'согласиться сдаться',
  'sae.btn.giveup.wait': 'ждём согласия…',
  'sae.btn.log': 'догадки: {k}',

  // cover for the human patternmaker
  'sae.cover.title': 'Правило загадывает {name}',
  'sae.cover.text': 'Остальные — отвернитесь! Сейчас будет придумано тайное правило.',
  'sae.cover.btn': 'я {name} — загадать',

  // rule builder
  'sae.g.title': 'Ваша догадка',
  'sae.g.title.make': 'Тайное правило',
  'sae.g.who': '{name} угадывает правило:',
  'sae.g.who.make': '{name}, придумайте правило. Компьютер будет отвечать за вас.',
  'sae.g.kind.all': 'одно для всех чисел',
  'sae.g.kind.par': 'нечётные / чётные',
  'sae.g.a': 'Числа ставятся…',
  'sae.g.op': 'и ещё:',
  'sae.g.op.none': '— больше ничего',
  'sae.g.op.and': 'И при этом…',
  'sae.g.op.or': 'ИЛИ…',
  'sae.g.odd': 'Нечётные (1, 3, 5…):',
  'sae.g.even': 'Чётные (2, 4, 6…):',
  'sae.g.check': 'проверить!',
  'sae.g.make': 'загадать!',
  'sae.g.cancel': 'отмена',
  'sae.g.first': 'Первое число можно будет поставить на {k} клеток.',
  'sae.g.stuck': 'Осторожно: с таким правилом игра часто упирается в тупик раньше, чем дойдёт до {max}.',
  'sae.g.none': 'С таким правилом первое число поставить некуда — придумайте другое.',
  'sae.g.loose': 'Правило разрешает почти всё — угадать его будет трудно.',
  'sae.grp.special': 'Особые',
  'sae.grp.geo': 'Место на доске',
  'sae.grp.prev': 'Относительно предыдущего числа',
  'sae.grp.all': 'Относительно всех чисел',

  // rule text
  'sae.r.all': 'Числа ставятся {a}.',
  'sae.r.and': '{a} и {b}',
  'sae.r.or': '{a} или {b}',
  'sae.r.par': 'Нечётные числа ставятся {a}; чётные — {b}.',
  'sae.a.any': 'куда угодно',
  'sae.a.none': 'никуда',
  'sae.a.chessA': 'на клетки цвета левого верхнего угла (как на шахматной доске)',
  'sae.a.chessB': 'на клетки другого цвета, чем левый верхний угол (как на шахматной доске)',
  'sae.a.top': 'в верхнюю половину доски',
  'sae.a.bottom': 'в нижнюю половину доски',
  'sae.a.left': 'в левую половину доски',
  'sae.a.right': 'в правую половину доски',
  'sae.a.edge': 'к краю доски (в крайнюю строку или столбец)',
  'sae.a.inner': 'не к краю доски',
  'sae.a.diag': 'на одну из двух больших диагоналей',
  'sae.a.center': 'в центральный квадрат {k} × {k}',
  'sae.a.rowsOdd': 'в 1-ю, 3-ю, 5-ю… строку сверху',
  'sae.a.rowsEven': 'во 2-ю, 4-ю, 6-ю… строку сверху',
  'sae.a.colsOdd': 'в 1-й, 3-й, 5-й… столбец слева',
  'sae.a.colsEven': 'во 2-й, 4-й, 6-й… столбец слева',
  'sae.a.adjPrev': 'вплотную к предыдущему числу (сбоку или наискосок)',
  'sae.a.sidePrev': 'бок о бок с предыдущим числом (через сторону клетки)',
  'sae.a.farPrev': 'не вплотную к предыдущему числу',
  'sae.a.linePrev': 'в строку или столбец предыдущего числа',
  'sae.a.rowPrev': 'в строку предыдущего числа',
  'sae.a.colPrev': 'в столбец предыдущего числа',
  'sae.a.offPrev': 'не в строку и не в столбец предыдущего числа',
  'sae.a.diagPrev': 'на диагональ, проходящую через предыдущее число',
  'sae.a.knightPrev': 'ходом коня от предыдущего числа',
  'sae.a.belowPrev': 'ниже предыдущего числа',
  'sae.a.abovePrev': 'выше предыдущего числа',
  'sae.a.rightPrev': 'правее предыдущего числа',
  'sae.a.leftPrev': 'левее предыдущего числа',
  'sae.a.touch1': 'вплотную ровно к одному числу на доске',
  'sae.a.touchAny': 'вплотную хотя бы к одному числу на доске',
  'sae.a.touchNone': 'не касаясь ни одного числа на доске',
  'sae.a.rowEmpty': 'в строку, где ещё нет чисел',
  'sae.a.colEmpty': 'в столбец, где ещё нет чисел',

  // counterexample
  'sae.cx.title': 'Не угадано!',
  'sae.cx.guess': 'Догадка: {who} — «{rule}»',
  'sae.cx.past.yes': 'Число {n} уже стояло вот здесь — а по этой догадке ему сюда нельзя.',
  'sae.cx.past.no': 'Число {n} сюда уже пытались поставить, и было нельзя — а догадка это разрешает.',
  'sae.cx.now.yes': 'Число {n} можно поставить сюда (зелёный кружок), а догадка это запрещает.',
  'sae.cx.now.no': 'Число {n} сюда ставить нельзя (красный крестик), а догадка это разрешает.',
  'sae.cx.future.yes': 'Представим, что игра пошла дальше (числа пунктиром). Тогда {n} можно поставить в зелёный кружок, а догадка это запрещает.',
  'sae.cx.future.no': 'Представим, что игра пошла дальше (числа пунктиром). Тогда {n} нельзя ставить в клетку с крестиком, а догадка это разрешает.',
  'sae.cx.ok': 'ясно',
  'sae.log.title': 'Догадки этого раунда',
  'sae.log.empty': 'Пока никто не пытался угадать правило.',
  'sae.log.show': 'контрпример',

  // results
  'sae.res.guessed': 'Разгадано!',
  'sae.res.guessed.by': '{name} получает {pts}',
  'sae.res.guessed.maker': '{name} получает {pts}, и столько же — {maker}',
  'sae.res.max': 'Тупик: дошли до {max}',
  'sae.res.stuck': 'Тупик: числу {n} некуда встать',
  'sae.res.giveup': 'Сдались',
  'sae.res.zero': 'В этом раунде очков нет ни у кого.',
  'sae.res.rule': 'Правило было: {rule}',
  'sae.res.next': 'следующий раунд',
  'sae.res.again': 'ещё партию!',
  'sae.res.win': 'Побеждает {name}!',
  'sae.res.tie': 'Ничья!',
  'sae.res.solo': 'Итого: {pts}',
  'sae.res.scores': 'Счёт: {s}',
  'sae.res.waitnext': 'Следующий раунд начнёт {name}',
  'sae.res.waitnew': 'Новую партию начнёт {name}',

  // speech bubbles
  'sae.say.yes': ['Есть!', 'Встало!', 'Ага!', 'Отлично'],
  'sae.say.no': ['Хм…', 'Мимо', 'Не сюда?', 'Интересно…', 'Запишем'],
  'sae.say.wrong': ['Эх…', 'Почти?', 'Не то', 'Ну вот'],
  'sae.say.relief': ['Фух!', 'Повезло', 'Ещё есть шанс'],
  'sae.say.smug': ['Хе-хе', 'Не угадали!', 'Тёпло… нет'],
  'sae.say.eureka': ['Эврика!', 'Так и есть!', 'Разгадано!'],
  'sae.say.missed': ['Опередили…', 'Эх, я почти', 'Ну вот'],
  'sae.say.makerHappy': ['Наконец-то!', 'Ура, разгадали!'],
  'sae.say.stalemate': ['Тупик…', 'Сдаёмся', 'Ну и правило!'],
  'sae.say.win': ['Ура!', 'Победа!', 'Я учёный!'],
  'sae.say.lose': ['Реванш?', 'В следующий раз…', 'Ну и ладно'],
  'sae.say.think': ['Так-так…', 'Есть идея', 'Проверим…'],

  'sae.h.how': 'Как играть',
  'sae.how': `
    <p><b>Цель:</b> разгадать тайное правило, по которому на доску ставятся числа 1, 2, 3…</p>
    <ol>
      <li>Правило загадывает компьютер (или по очереди кто-то из игроков). Иногда на доске заранее стоит 0 — чтобы у первого числа было «предыдущее».</li>
      <li>В свой ход нажмите на пустую клетку — это вопрос «можно поставить следующее число сюда?». Если можно, число появляется. Если нельзя, клетка помечается крестиком.</li>
      <li>После этой попытки можно <b>угадать правило</b> (собрать его из готовых кусочков) или сказать «пас».</li>
      <li>Ошиблись — компьютер покажет <b>контрпример</b>: клетку, где ваша догадка расходится с правилом. Он виден всем!</li>
      <li>Угадали — раунд окончен: вы получаете половину самого большого числа на доске (с округлением вниз). Если правило загадывал игрок, он получает столько же.</li>
      <li>Если на доске появилось последнее число (20 на обычной доске), следующему числу некуда встать или все решили сдаться — тупик, очков нет ни у кого.</li>
      <li>Партия длится несколько раундов. Побеждает тот, кто наберёт больше очков за все раунды.</li>
    </ol>
    <p>Догадка засчитывается, если она совпадает с тайным правилом во всём, что уже было, и во всём, что ещё может случиться, — даже если сформулирована иначе.</p>
    <p>«Вплотную» — значит в соседней клетке, через сторону или наискосок.</p>`,
  'sae.h.tips': 'Хитрости',
  'sae.tips': `
    <ul>
      <li><b>Сначала гипотеза, потом проверка.</b> Не тыкайте наугад: выберите клетку, которая разделит ваши версии — «если правило такое, то да, а если другое — нет».</li>
      <li><b>Нельзя — тоже ответ.</b> Крестик часто рассказывает о правиле больше, чем новое число.</li>
      <li><b>Догадка — это ещё и вопрос.</b> Неверная догадка приносит контрпример. Можно даже предположить «никуда», чтобы компьютер показал, куда можно.</li>
      <li><b>Но контрпример видят все.</b> Поспешная догадка подскажет соперникам. А чем дольше ждёте, тем больше очков — и тем выше риск, что угадают раньше вас.</li>
      <li>Нуля на доске нет? Значит, правило не смотрит на предыдущее число. А если ноль есть — возможно, смотрит.</li>
      <li>Чётные и нечётные числа могут подчиняться разным правилам — посмотрите на них по отдельности.</li>
      <li><b>Загадываете сами?</b> Делайте правило <i>угадываемым</i>: если раунд кончится тупиком, вы тоже останетесь без очков.</li>
    </ul>
    <p class="tip"><b>Варианты.</b> Быстрая Саэсара — доска 6 × 6 и тупик на 10. Большая — доска 10 × 10 и тупик на 30, для мудрёных правил. Обе есть в настройках.</p>
    <p class="tip"><b>Родственная игра без доски.</b> Судья делит предметы любого рода (числа, слова, города…) на «сокровища» и «песок», показывает по одному примеру каждого, а игроки спрашивают про другие предметы и пытаются назвать признак.</p>`,
  'sae.h.origin': 'Откуда игра',
  'sae.origin': `
    <p>Большинство игр тренируют <i>дедукцию</i>: правила известны, нужно применять их. Саэсара — редкая игра на <i>индукцию</i>: правила неизвестны, их надо вывести из наблюдений. Совсем как в науке: придумать гипотезу, вывести из неё предсказание и поставить опыт, который может её опровергнуть.</p>
    <p>Прародитель жанра — карточная игра «Элевсин» Роберта Эббота (1956): угадывать нужно правило, по которому карты можно выкладывать. От неё пошли «Зендо», «Паттерны» Сида Сэксона и бумажная версия Эрика Соломона. Бен Орлин переделал игру Соломона: заменил буквы числами, поменял подсчёт очков и сделал главным угадывание правила. Новое имя — древнее название самого Элевсина.</p>`,
});

addStrings('en', {
  'sae.title': 'Saesara',
  'sae.tagline': 'crack the secret rule that decides where the numbers go',
  'sae.p0': 'Blue', 'sae.p1': 'Red', 'sae.p2': 'Green', 'sae.p3': 'Violet',
  'sae.cpu': 'Computer',
  'sae.pts': ['point', 'points'],
  'sae.maker.badge': 'rule maker',

  'sae.mode': 'Play:',
  'sae.mode.hot': 'on one device',
  'sae.mode.easy': 'vs computer (easy)',
  'sae.mode.normal': 'vs computer (normal)',
  'sae.mode.hard': 'vs computer (strong)',
  'sae.players': 'Players:',
  'sae.players.1': '1 (puzzle)',
  'sae.maker': 'Rule maker:',
  'sae.maker.cpu': 'the computer',
  'sae.maker.players': 'each player in turn',
  'sae.tier': 'Rules:',
  'sae.tier.easy': 'simple',
  'sae.tier.medium': 'trickier',
  'sae.tier.hard': 'sneaky',
  'sae.board': 'Board:',
  'sae.board.6': '6 × 6, up to 10 (speedy)',
  'sae.board.8': '8 × 8, up to 20 (classic)',
  'sae.board.10': '10 × 10, up to 30 (grand)',
  'sae.rounds': 'Rounds:',
  'sae.note.players': 'Everyone makes up a rule once, so there are as many rounds as players. The computer keeps it honest: it answers yes/no and finds the counterexamples.',
  'sae.online.note': 'You’re playing online: the computer makes the rules, and the room creator starts new games and picks the settings.',

  'sae.st.try': '{name}: where does {n} go?',
  'sae.st.try.solo': 'Where does {n} go?',
  'sae.st.decide': '{name}: guess the rule, or pass?',
  'sae.st.decide.solo': 'Guess the rule, or try again?',
  'sae.st.thinking': '{name} is thinking…',
  'sae.st.you': 'Your turn: where does {n} go?',
  'sae.st.you.decide': 'Guess the rule, or pass?',
  'sae.st.them': '{name} is playing…',
  'sae.st.wait': 'Waiting for the other player…',
  'sae.st.make': '{name} is making up a rule…',
  'sae.st.vote': '{name} suggests giving up',
  'sae.st.yes': 'Yes! {n} goes here.',
  'sae.st.no': 'No, {n} can’t go here.',
  'sae.st.round': 'Round {r} of {k}',

  'sae.btn.guess': 'guess the rule',
  'sae.btn.pass': 'pass',
  'sae.btn.more': 'try again',
  'sae.btn.giveup': 'give up?',
  'sae.btn.giveup.sure': 'really give up?',
  'sae.btn.giveup.agree': 'agree to give up',
  'sae.btn.giveup.wait': 'waiting…',
  'sae.btn.log': 'guesses: {k}',

  'sae.cover.title': '{name} makes the rule',
  'sae.cover.text': 'Everyone else, look away! A secret rule is about to be born.',
  'sae.cover.btn': 'I’m {name} — make a rule',

  'sae.g.title': 'Your guess',
  'sae.g.title.make': 'Secret rule',
  'sae.g.who': '{name} guesses the rule:',
  'sae.g.who.make': '{name}, make up a rule. The computer will answer on your behalf.',
  'sae.g.kind.all': 'same for all numbers',
  'sae.g.kind.par': 'odd / even',
  'sae.g.a': 'Numbers go…',
  'sae.g.op': 'and also:',
  'sae.g.op.none': '— nothing else',
  'sae.g.op.and': 'AND also…',
  'sae.g.op.or': 'OR…',
  'sae.g.odd': 'Odd (1, 3, 5…):',
  'sae.g.even': 'Even (2, 4, 6…):',
  'sae.g.check': 'check it!',
  'sae.g.make': 'that’s my rule!',
  'sae.g.cancel': 'cancel',
  'sae.g.first': 'The first number will have {k} squares to choose from.',
  'sae.g.stuck': 'Careful: with this rule the game often runs out of moves before reaching {max}.',
  'sae.g.none': 'This rule leaves no square for the first number — try another one.',
  'sae.g.loose': 'This rule allows almost everything — it will be hard to guess.',
  'sae.grp.special': 'Special',
  'sae.grp.geo': 'Where on the board',
  'sae.grp.prev': 'Compared to the previous number',
  'sae.grp.all': 'Compared to all numbers',

  'sae.r.all': 'Numbers go {a}.',
  'sae.r.and': '{a} and {b}',
  'sae.r.or': '{a} or {b}',
  'sae.r.par': 'Odd numbers go {a}; even numbers go {b}.',
  'sae.a.any': 'anywhere',
  'sae.a.none': 'nowhere',
  'sae.a.chessA': 'on squares coloured like the top-left corner (chessboard pattern)',
  'sae.a.chessB': 'on squares not coloured like the top-left corner (chessboard pattern)',
  'sae.a.top': 'in the top half',
  'sae.a.bottom': 'in the bottom half',
  'sae.a.left': 'in the left half',
  'sae.a.right': 'in the right half',
  'sae.a.edge': 'along the edge (outer row or column)',
  'sae.a.inner': 'away from the edge',
  'sae.a.diag': 'on one of the two long diagonals',
  'sae.a.center': 'inside the central {k} × {k} square',
  'sae.a.rowsOdd': 'in rows 1, 3, 5… from the top',
  'sae.a.rowsEven': 'in rows 2, 4, 6… from the top',
  'sae.a.colsOdd': 'in columns 1, 3, 5… from the left',
  'sae.a.colsEven': 'in columns 2, 4, 6… from the left',
  'sae.a.adjPrev': 'touching the previous number (side or corner)',
  'sae.a.sidePrev': 'side by side with the previous number',
  'sae.a.farPrev': 'not touching the previous number',
  'sae.a.linePrev': 'in the previous number’s row or column',
  'sae.a.rowPrev': 'in the previous number’s row',
  'sae.a.colPrev': 'in the previous number’s column',
  'sae.a.offPrev': 'outside the previous number’s row and column',
  'sae.a.diagPrev': 'on a diagonal through the previous number',
  'sae.a.knightPrev': 'a knight’s move from the previous number',
  'sae.a.belowPrev': 'lower than the previous number',
  'sae.a.abovePrev': 'higher than the previous number',
  'sae.a.rightPrev': 'to the right of the previous number',
  'sae.a.leftPrev': 'to the left of the previous number',
  'sae.a.touch1': 'touching exactly one number on the board',
  'sae.a.touchAny': 'touching at least one number on the board',
  'sae.a.touchNone': 'touching no numbers on the board',
  'sae.a.rowEmpty': 'in a row with no numbers yet',
  'sae.a.colEmpty': 'in a column with no numbers yet',

  'sae.cx.title': 'Not quite!',
  'sae.cx.guess': 'Guess by {who}: “{rule}”',
  'sae.cx.past.yes': 'Number {n} already stood right here — but this guess says it couldn’t.',
  'sae.cx.past.no': 'Someone already tried {n} here and it wasn’t allowed — but this guess would allow it.',
  'sae.cx.now.yes': 'Number {n} may go here (green circle), but this guess forbids it.',
  'sae.cx.now.no': 'Number {n} may not go here (red cross), but this guess allows it.',
  'sae.cx.future.yes': 'Imagine the game went on (dashed numbers). Then {n} could go in the green circle, but this guess forbids it.',
  'sae.cx.future.no': 'Imagine the game went on (dashed numbers). Then {n} could not go on the cross, but this guess allows it.',
  'sae.cx.ok': 'got it',
  'sae.log.title': 'Guesses this round',
  'sae.log.empty': 'Nobody has guessed yet.',
  'sae.log.show': 'counterexample',

  'sae.res.guessed': 'Cracked it!',
  'sae.res.guessed.by': '{name} scores {pts}',
  'sae.res.guessed.maker': '{name} scores {pts}, and so does {maker}',
  'sae.res.max': 'Stalemate: we reached {max}',
  'sae.res.stuck': 'Stalemate: no room for {n}',
  'sae.res.giveup': 'We gave up',
  'sae.res.zero': 'Nobody scores this round.',
  'sae.res.rule': 'The rule was: {rule}',
  'sae.res.next': 'next round',
  'sae.res.again': 'play again!',
  'sae.res.win': '{name} wins!',
  'sae.res.tie': 'A tie!',
  'sae.res.solo': 'Total: {pts}',
  'sae.res.scores': 'Score: {s}',
  'sae.res.waitnext': '{name} will start the next round',
  'sae.res.waitnew': '{name} will start the next game',

  'sae.say.yes': ['Yes!', 'It fits!', 'Aha!', 'As I thought', 'Nice'],
  'sae.say.no': ['Hmm…', 'Nope', 'Not there?', 'Interesting…', 'Noted'],
  'sae.say.wrong': ['Ugh…', 'So close?', 'Not it', 'Oh well'],
  'sae.say.relief': ['Phew!', 'Lucky', 'Still a chance'],
  'sae.say.smug': ['Heh', 'Nope!', 'Warm… no'],
  'sae.say.eureka': ['Eureka!', 'I knew it!', 'Cracked it!'],
  'sae.say.missed': ['Beaten to it…', 'I almost had it', 'Oh well'],
  'sae.say.makerHappy': ['Finally!', 'Yay, you got it!'],
  'sae.say.stalemate': ['Stuck…', 'We give up', 'What a rule!'],
  'sae.say.win': ['Hooray!', 'Victory!', 'Science!'],
  'sae.say.lose': ['Rematch?', 'Next time…', 'Whatever'],
  'sae.say.think': ['Let’s see…', 'I have an idea', 'Testing…'],

  'sae.h.how': 'How to play',
  'sae.how': `
    <p><b>Goal:</b> work out the secret rule that decides where the numbers 1, 2, 3… may be written.</p>
    <ol>
      <li>The computer makes up the rule (or the players take turns doing it). Sometimes a 0 is already on the board, so that the first number has a “previous” one.</li>
      <li>On your turn, tap an empty square. That asks “may the next number go here?” If yes, the number appears. If no, the square gets a cross.</li>
      <li>After that attempt you may <b>guess the rule</b> (assemble it from ready-made pieces) or pass.</li>
      <li>Wrong guess? The computer shows a <b>counterexample</b>: a square where your guess and the rule disagree. Everyone sees it!</li>
      <li>Right guess? The round ends and you score half the highest number on the board, rounded down. If a player made the rule, they score the same.</li>
      <li>If the last number appears (20 on the classic board), the next number has nowhere to go, or everyone agrees to give up, it’s a stalemate: nobody scores.</li>
      <li>A match has several rounds. The highest total score wins.</li>
    </ol>
    <p>A guess counts if it agrees with the secret rule on everything that has happened and everything that still could — even if it’s worded differently.</p>
    <p>“Touching” means in a neighbouring square, across a side or a corner.</p>`,
  'sae.h.tips': 'Tricks',
  'sae.tips': `
    <ul>
      <li><b>Hypothesis first, then experiment.</b> Don’t tap at random: pick a square that splits your theories — “if it’s this rule then yes, if it’s that one then no.”</li>
      <li><b>“No” is an answer too.</b> A cross often tells you more about the rule than a new number does.</li>
      <li><b>A guess is also a question.</b> A wrong guess earns a counterexample. You can even guess “nowhere” just to make the computer show you a square that works.</li>
      <li><b>But everyone sees the counterexample.</b> A hasty guess helps your rivals. Waiting earns more points — and raises the risk that someone beats you to it.</li>
      <li>No 0 on the board? Then the rule ignores the previous number. If there is a 0, it may well care.</li>
      <li>Odd and even numbers may follow different rules — look at them separately.</li>
      <li><b>Making the rule yourself?</b> Keep it <i>guessable</i>: if the round ends in a stalemate, you score nothing either.</li>
    </ul>
    <p class="tip"><b>Variants.</b> Speedy Saesara uses a 6 × 6 board and stalls at 10. Grand Saesara uses a 10 × 10 board and stalls at 30, leaving room for stranger rules. Both are in the settings.</p>
    <p class="tip"><b>A board-free cousin.</b> A judge sorts objects of some kind (numbers, words, cities…) into “jewels” and “sand,” shows one example of each, and players ask about other objects while trying to name the secret criterion.</p>`,
  'sae.h.origin': 'Where it comes from',
  'sae.origin': `
    <p>Most games train <i>deduction</i>: you know the rules and apply them. Saesara is a rare game of <i>induction</i>: the rules are hidden and must be inferred from evidence. That’s science in miniature — form a hypothesis, derive a prediction, and run an experiment that could prove you wrong.</p>
    <p>The family tree starts with Robert Abbott’s card game <i>Eleusis</i> (1956), where players hunt for the dealer’s rule about which cards may be played. Its descendants include <i>Zendo</i>, Sid Sackson’s <i>Patterns</i>, and a pencil-and-paper version by Eric Solomon. Ben Orlin reworked Solomon’s game — numbers instead of letters, new scoring, and the focus on naming the rule — and gave it the ancient name of the city of Eleusis itself.</p>`,
});
