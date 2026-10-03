import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'pii.title': 'Узоры II',
  'pii.tagline': 'один прячет мозаику, остальные выведывают её по клеточке',
  'pii.again': 'ещё раз!',
  'pii.next': 'следующий раунд',
  'pii.look': 'посмотреть листы',
  'pii.results': 'итоги',
  'pii.p0': 'Синий', 'pii.p1': 'Красный', 'pii.p2': 'Зелёный', 'pii.p3': 'Рыжий', 'pii.p4': 'Фиолетовый',
  'pii.cpu': 'Робот {n}',
  'pii.cpu.designer': 'Компьютер',

  // settings
  'pii.designer': 'Узор рисует:',
  'pii.designer.cpu': 'компьютер',
  'pii.designer.rotate': 'игроки по очереди',
  'pii.players': 'Игроков:',
  'pii.players.solo': '1 (головоломка)',
  'pii.bots': 'Из них роботов:',
  'pii.level': 'Роботы играют:',
  'pii.level.easy': 'наугад',
  'pii.level.normal': 'толково',
  'pii.level.hard': 'зорко',
  'pii.settings.note': 'Один раунд — один узор. Если рисуют игроки, партия длится, пока каждый не нарисует по узору.',
  'pii.online.note': 'По сети каждый играет со своего устройства, до 5 человек. За свободные места играют роботы; кто подключится, когда робот уже начал свой лист, сменит его со следующего раунда. Если игрок отключится, через 30 секунд робот доиграет за него. Настройки и новую партию выбирает создатель комнаты.',

  // tools / actions
  'pii.tool.peek': 'спросить',
  'pii.tool.erase': 'стереть',
  'pii.ask': 'Открыть ({n})',
  'pii.ask0': 'Открыть',
  'pii.done': 'Готово',
  'pii.giveup': 'Сдаюсь',
  'pii.giveup.sure': 'Точно?',
  'pii.random': 'наугад',
  'pii.fill': 'залить',
  'pii.design.done': 'Узор готов',

  // cover
  'pii.cover.title': 'Передайте устройство: {name}',
  'pii.cover.note.design': 'Остальные — не подглядывайте, сейчас будет придуман узор.',
  'pii.cover.note.guess': 'Остальные — отвернитесь: это личный лист.',
  'pii.cover.btn': 'Это я, {name}',

  // cards
  'pii.card.author': 'автор узора',
  'pii.card.drawing': 'рисует…',
  'pii.card.wait': 'ждёт',
  'pii.card.peeks': 'открыто: {n}',
  'pii.card.done': 'лист сдан',
  'pii.card.gaveup': 'сдаётся',
  'pii.card.off': 'не в сети…',
  'pii.card.total': 'всего {n}',
  'pii.points': ['очко', 'очка', 'очков'],

  // status
  'pii.st.design.you': 'Нарисуйте узор: выберите значок и закрашивайте клетки',
  'pii.st.design.them': '{name} рисует узор…',
  'pii.st.peek': 'Отметьте клетки и нажмите «Открыть»',
  'pii.st.guess': 'Ставьте значки туда, где уверены: +1 / −1',
  'pii.st.cover': 'Ход: {name}',
  'pii.st.wait.others': 'Ждём остальных…',
  'pii.st.wait.them': 'Отгадывают: {names}',
  'pii.st.done.view': 'Лист: {name} · нажмите на игрока, чтобы посмотреть другой',
  'pii.st.done.pattern': 'Узор целиком · нажмите на игрока, чтобы увидеть его лист',
  'pii.online.wait': 'Ждём второго игрока…',
  'pii.online.waitnew': 'Дальше продолжит {name}',
  'pii.online.lost': 'Связь с создателем комнаты пропала, ждём…',
  'pii.online.botseat': 'Этот лист за вас уже начал робот — вы вступите со следующего раунда',
  'pii.online.watch': 'В этой партии {n} мест, вам не хватило — смотрите со стороны',

  // results
  'pii.res.round': 'Раунд {i} из {n}',
  'pii.res.win': 'Побеждает {name}!',
  'pii.res.win.you': 'Вы победили!',
  // A device that is turned away doesn't learn the room size, so don't claim "two players" (rooms here hold up to 5).
  'net.full': 'В комнате {code} нет свободных мест. Создайте свою комнату или введите другой код.',
  'pii.res.tie': 'Ничья: {names}',
  'pii.res.solo': 'Ваш счёт: {n}',
  'pii.res.designer': 'автор: разброс {spread}',
  'pii.res.penalty': ', штраф −{p}',
  'pii.res.gaveup': 'сдаётся',
  'pii.res.line': '{right} верно, {wrong} мимо',

  // bubbles
  'pii.say.design': ['Попробуйте-ка!', 'Простенько…', 'Хе-хе', 'Шедевр!'],
  'pii.say.peek': ['Хм…', 'Ага!', 'Так-так', 'Любопытно', 'Вот оно что'],
  'pii.say.bold': ['Рискну!', 'Всё ясно!', 'Ва-банк!'],
  'pii.say.careful': ['Пожалуй, хватит', 'Готово', 'Осторожненько'],
  'pii.say.giveup': ['Сдаюсь…', 'Это слишком', 'Пас'],
  'pii.say.ouch': ['Ой', 'Штраф!', 'Ну вот…'],
  'pii.say.win': ['Ура!', 'Очевидно же!', 'Видно же!'],
  'pii.say.minus': ['Как так?!', 'Эх…', 'Ошибочка'],
  'pii.say.zero': ['Ну, хоть не минус', 'Ноль — тоже число'],
  'pii.say.spread': ['Красота!', 'Кому-то было легко…', 'Удачный узор'],

  // sheets
  'pii.h.how': 'Как играть',
  'pii.how': `
    <p><b>Что нужно:</b> три–пять игроков (здесь можно и вдвоём или в одиночку — узор нарисует компьютер) и сетка 6 × 6.</p>
    <p><b>Цель:</b> угадать чужой тайный узор, подсмотрев как можно меньше.</p>
    <ol>
      <li><b>Автор</b> заполняет всю сетку четырьмя значками: △ ● + ⁘ — в любом порядке и тайно.</li>
      <li>У каждого отгадчика свой пустой лист. Выберите <b>«спросить»</b>, отметьте любые клетки и нажмите <b>«Открыть»</b> — автор покажет, что там. Спрашивать можно сколько угодно раз, очерёдности нет.</li>
      <li>Когда кажется, что узор понятен, ставьте значки в <b>закрытые</b> клетки — сколько хотите, можно оставить пустые. Потом жмите <b>«Готово»</b>.</li>
      <li>Каждая верная догадка: <b>+1</b>, каждая ошибка: <b>−1</b>. Открытые клетки очков не дают — чем больше спросили, тем меньше можно заработать.</li>
      <li>Можно <b>сдаться</b>: это 0 очков. Автору за первого сдавшегося −5, за каждого следующего ещё −10.</li>
      <li><b>Автор</b> получает разницу между лучшим и худшим счётом отгадчиков: идеальный узор лёгок для одного и труден для другого.</li>
    </ol>
    <p>Если рисуют игроки, раундов столько, сколько игроков: каждый побудет автором. Побеждает больший итог.</p>`,
  'pii.h.tips': 'Хитрости',
  'pii.tips': `
    <ul>
      <li><b>Спрашивайте вразброс.</b> Пара клеток в разных углах и одна в центре скажут о симметрии больше, чем целая строка.</li>
      <li>Ищите знакомое: зеркало, поворот, полосы, шахматку, кольца, повторяющуюся плитку. Проверьте догадку ещё одной клеткой — это дешевле, чем десяток ошибок.</li>
      <li>Не уверены в клетке — оставьте её пустой: ноль лучше минуса.</li>
      <li>Автору: узор, который кажется вам простым, другим почти всегда кажется сложным. <b>Рисуйте проще, чем хочется.</b> Слишком хитрый узор заставит всех сдаться — и это дорого.</li>
    </ul>
    <p class="tip"><b>Варианты.</b> Можно взять поле побольше или поменьше, добавить пятый значок, а можно разрешить спрашивать не больше определённого числа клеток. Роботы здесь знают десятки видов регулярности — симметрии, полосы, плитки, кольца и их сочетания — и взвешивают, какой объясняет увиденное лучше.</p>`,
  'pii.h.origin': 'Откуда игра',
  'pii.origin': `
    <p>Игру придумал Сид Сэксон — американский изобретатель настольных игр, автор «Acquire» и «Can't Stop». Она вошла в его сборник <i>A Gamut of Games</i> (1969). Несмотря на «II» в названии, это вовсе не продолжение какой-то первой игры: она вполне самостоятельна.</p>
    <p>По духу «Узоры II» — родственник игр вроде «Элевсина» и «Дзена», где нужно разгадать скрытое правило по примерам. Это и есть работа учёного: собрать немного данных, выдвинуть гипотезу и решить, достаточно ли ты уверен, чтобы на неё поставить.</p>`,
});

addStrings('en', {
  'pii.title': 'Patterns II',
  'pii.tagline': 'one player hides a mosaic, the rest pry it out square by square',
  'pii.again': 'again!',
  'pii.next': 'next round',
  'pii.look': 'look at the sheets',
  'pii.results': 'results',
  'pii.p0': 'Blue', 'pii.p1': 'Red', 'pii.p2': 'Green', 'pii.p3': 'Orange', 'pii.p4': 'Purple',
  'pii.cpu': 'Robot {n}',
  'pii.cpu.designer': 'Computer',

  'pii.designer': 'Pattern by:',
  'pii.designer.cpu': 'the computer',
  'pii.designer.rotate': 'players in turn',
  'pii.players': 'Players:',
  'pii.players.solo': '1 (puzzle)',
  'pii.bots': 'Robots among them:',
  'pii.level': 'Robots play:',
  'pii.level.easy': 'at random',
  'pii.level.normal': 'sensibly',
  'pii.level.hard': 'sharp-eyed',
  'pii.settings.note': 'One round = one pattern. When players draw, the match lasts until everyone has drawn once.',
  'pii.online.note': 'Online, everyone plays on their own device, up to 5 people. Robots fill the empty seats; if you join after a robot has started your sheet, you take over from the next round. If a player drops out, a robot finishes for them after 30 seconds. The room creator picks settings and starts new games.',

  'pii.tool.peek': 'ask',
  'pii.tool.erase': 'erase',
  'pii.ask': 'Reveal ({n})',
  'pii.ask0': 'Reveal',
  'pii.done': 'Done',
  'pii.giveup': 'Give up',
  'pii.giveup.sure': 'Sure?',
  'pii.random': 'random',
  'pii.fill': 'fill',
  'pii.design.done': 'Pattern ready',

  'pii.cover.title': 'Pass the device to {name}',
  'pii.cover.note.design': 'Everyone else: no peeking, a pattern is being made.',
  'pii.cover.note.guess': 'Everyone else: look away, this sheet is private.',
  'pii.cover.btn': 'I’m {name}',

  'pii.card.author': 'designer',
  'pii.card.drawing': 'drawing…',
  'pii.card.wait': 'waiting',
  'pii.card.peeks': 'revealed: {n}',
  'pii.card.done': 'handed in',
  'pii.card.gaveup': 'gave up',
  'pii.card.off': 'offline…',
  'pii.card.total': 'total {n}',
  'pii.points': ['point', 'points'],

  'pii.st.design.you': 'Draw a pattern: pick a symbol and paint the squares',
  'pii.st.design.them': '{name} is drawing a pattern…',
  'pii.st.peek': 'Mark squares, then press “Reveal”',
  'pii.st.guess': 'Place symbols where you’re sure: +1 / −1',
  'pii.st.cover': 'Turn: {name}',
  'pii.st.wait.others': 'Waiting for the others…',
  'pii.st.wait.them': 'Still guessing: {names}',
  'pii.st.done.view': 'Sheet: {name} · tap a player to see theirs',
  'pii.st.done.pattern': 'The whole pattern · tap a player to see their sheet',
  'pii.online.wait': 'Waiting for the other player…',
  'pii.online.waitnew': '{name} will continue',
  'pii.online.lost': 'Lost the room creator, waiting…',
  'pii.online.botseat': 'A robot has already started this sheet for you — you join from the next round',
  'pii.online.watch': 'This game has {n} seats and you didn’t get one — watching',

  'pii.res.round': 'Round {i} of {n}',
  'pii.res.win': '{name} wins!',
  'pii.res.win.you': 'You win!',
  'net.full': 'Room {code} has no free seats. Create your own room or enter another code.',
  'pii.res.tie': 'A tie: {names}',
  'pii.res.solo': 'Your score: {n}',
  'pii.res.designer': 'designer: spread {spread}',
  'pii.res.penalty': ', penalty −{p}',
  'pii.res.gaveup': 'gave up',
  'pii.res.line': '{right} right, {wrong} wrong',

  'pii.say.design': ['Try this one!', 'Easy peasy…', 'Heh heh', 'A masterpiece!'],
  'pii.say.peek': ['Hmm…', 'Aha!', 'I see…', 'Interesting', 'Oh, so that’s it'],
  'pii.say.bold': ['Let’s risk it!', 'I’ve got it!', 'All in!'],
  'pii.say.careful': ['That’s enough', 'Done', 'Playing it safe'],
  'pii.say.giveup': ['I give up…', 'Too much', 'Pass'],
  'pii.say.ouch': ['Ouch', 'A penalty!', 'Oh no…'],
  'pii.say.win': ['Hooray!', 'I knew it!', 'So obvious!'],
  'pii.say.minus': ['How?!', 'Ugh…', 'Oops'],
  'pii.say.zero': ['Well, not negative', 'Zero is a number too'],
  'pii.say.spread': ['Beautiful!', 'Someone found it easy…', 'Nice pattern'],

  'pii.h.how': 'How to play',
  'pii.how': `
    <p><b>You need:</b> three to five players (here you can also play as two, or alone — the computer will draw the pattern) and a 6 × 6 grid.</p>
    <p><b>Goal:</b> work out someone’s secret pattern while looking at as little of it as you can.</p>
    <ol>
      <li>The <b>designer</b> secretly fills the whole grid with four symbols: △ ● + ⁘, in any arrangement.</li>
      <li>Every guesser has a blank sheet. Choose <b>“ask”</b>, mark any squares, and press <b>“Reveal”</b> — the designer shows what’s there. Ask as often as you like; there are no turns.</li>
      <li>Once you think you see the pattern, place symbols in <b>hidden</b> squares — as many as you want, blanks are fine. Then press <b>“Done”</b>.</li>
      <li>Each right guess is <b>+1</b>, each wrong one <b>−1</b>. Revealed squares score nothing — the more you ask, the less you can win.</li>
      <li>You may <b>give up</b> for 0 points. The designer loses 5 for the first player who gives up and 10 more for each one after that.</li>
      <li>The <b>designer</b> scores the gap between the best and the worst guesser: the ideal pattern is easy for one player and hard for another.</li>
    </ol>
    <p>When players draw, there are as many rounds as players, so everyone designs once. Highest total wins.</p>`,
  'pii.h.tips': 'Tricks',
  'pii.tips': `
    <ul>
      <li><b>Ask in scattered places.</b> A couple of corners and one central square say more about symmetry than a whole row.</li>
      <li>Look for familiar shapes: mirrors, rotations, stripes, checkerboards, rings, a repeating tile. Test your hunch with one more square — cheaper than ten wrong guesses.</li>
      <li>Not sure about a square? Leave it blank: zero beats minus one.</li>
      <li>Designers: a pattern that looks simple to you almost always looks hard to others. <b>Draw simpler than you want to.</b> If everyone gives up, it costs you dearly.</li>
    </ul>
    <p class="tip"><b>Variants.</b> Try a bigger or smaller grid, add a fifth symbol, or cap how many squares each guesser may ask about. The robots here know dozens of kinds of regularity — symmetries, stripes, tiles, rings and their combinations — and weigh which one best explains what they’ve seen.</p>`,
  'pii.h.origin': 'Where it comes from',
  'pii.origin': `
    <p>The game is by Sid Sackson, the American designer behind <i>Acquire</i> and <i>Can’t Stop</i>. It appeared in his collection <i>A Gamut of Games</i> (1969). Despite the “II”, it isn’t a sequel to anything — it stands entirely on its own.</p>
    <p>In spirit it’s a cousin of games like <i>Eleusis</i> and <i>Zendo</i>, where you uncover a hidden rule from examples. That’s a scientist’s job in miniature: gather a little data, form a hypothesis, and decide whether you’re confident enough to bet on it.</p>`,
});
