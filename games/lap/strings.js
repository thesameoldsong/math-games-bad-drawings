import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'lap.title': 'LAP',
  'lap.tagline': 'разгадай тайную карту соперника раньше, чем он — твою',
  'lap.mode': 'Играем:',
  'lap.mode.pvp': 'вдвоём',
  'lap.mode.easy': 'с компьютером (простой)',
  'lap.mode.normal': 'с компьютером (обычный)',
  'lap.mode.hard': 'с компьютером (сильный)',
  'lap.variant': 'Поле:',
  'lap.variant.std': '6 × 6, четыре области',
  'lap.variant.beginner': '6 × 6, две области',
  'lap.variant.expert': '8 × 8, четыре области',
  'lap.probe': 'Вопросы:',
  'lap.probe.any': 'любой прямоугольник',
  'lap.probe.classic': 'только 2 × 2',
  'lap.again': 'ещё раз!',
  'lap.p0': 'Синий',
  'lap.p1': 'Красный',
  'lap.cpu': 'Компьютер',
  'lap.probes': ['вопрос', 'вопроса', 'вопросов'],
  'lap.tool.probe': 'вопрос',
  'lap.tool.erase': 'стереть',
  'lap.act.random': 'случайно',
  'lap.act.clear': 'очистить',
  'lap.act.ready': 'готово ✓',
  'lap.act.ask': 'спросить {rect}',
  'lap.act.ask0': 'спросить',
  'lap.act.guess': 'угадать!',
  'lap.act.sure': 'точно?',
  'lap.act.mine': 'моя карта',
  'lap.act.theirs': 'разгадка',
  'lap.act.pass': 'передать ход →',
  'lap.act.look': 'посмотреть карты',
  'lap.cover.title': 'Тайную карту рисует {name}',
  'lap.cover.note': 'Остальные — не подглядывайте!',
  'lap.cover.btn': 'это я, {name}',
  'lap.st.setup': '{name}: раскрасьте {k} области по {s} клеток',
  'lap.st.setup.bad': 'Область {reg} разорвана',
  'lap.st.setup.count': 'Нужно ровно по {s} клеток каждого цвета',
  'lap.st.setup.amb': 'Эту карту не разгадать квадратами 2 × 2 — измените её',
  'lap.st.setup.ok': 'Карта готова — жмите «готово»',
  'lap.st.cover': 'Передайте устройство: карту рисует {name}',
  'lap.st.waitsetup': 'Ждём, пока {name} нарисует карту…',
  'lap.st.turn': '{name}: выделите прямоугольник',
  'lap.st.turn.you': 'Ваш ход: выделите прямоугольник',
  'lap.st.corner': 'Теперь коснитесь противоположного угла',
  'lap.st.small': 'Нужен прямоугольник хотя бы 2 × 2',
  'lap.st.classic': 'По классике — только квадрат 2 × 2',
  'lap.st.sel': 'Спросить про {rect}?',
  'lap.st.pass': 'Запомните ответ и передайте ход: {name}',
  'lap.st.thinking': '{name} думает…',
  'lap.st.them': 'Ходит {name}…',
  'lap.st.asked': '{name} спрашивает {rect}',
  'lap.st.mine': 'Ваша карта и вопросы соперника',
  'lap.st.notmap': 'Заметки пока не карта: нужны цельные области по {s} клеток',
  'lap.online.wait': 'Ждём второго игрока…',
  'lap.online.note': 'Сейчас идёт игра по сети: новую партию и правила выбирает создатель комнаты.',
  'lap.online.waitnew': 'Новую партию начнёт {name}',
  'lap.win.right': 'Карта разгадана! Побеждает {name}',
  'lap.win.wrong': 'Мимо! Побеждает {name}',
  'lap.next': 'Первым спрашивает {name}',
  'lap.log.empty': 'здесь появятся ответы',
  'say.ready': ['Готово!', 'Нарисовано.', 'Попробуй разгадай'],
  'say.peek': ['Не подглядывай!', 'Отвернись!', 'Чур не смотреть'],
  'say.clean': ['Сплошь одна область!', 'Однородно!', 'Чистый кусок'],
  'say.mess': ['Ну и винегрет…', 'Всё вперемешку', 'Хм, запутанно'],
  'say.probe': ['Любопытно…', 'Так-так', 'Записываю', 'Хм'],
  'say.tease': ['Ничего не скажу… ой', 'Холодно', 'Ищи-ищи', 'Не догадаешься'],
  'say.close': ['Кажется, я знаю твою карту', 'Почти разгадано', 'Картинка складывается'],
  'say.win': ['Ура!', 'Разгадано!', 'Я гений'],
  'say.lose': ['Реванш?', 'Эх…', 'В следующий раз'],
  'say.wrong': ['Ой…', 'Не та карта', 'Ошибочка…'],
  'say.miss': ['Мимо!', 'Не угадано!', 'Хе-хе'],
  'lap.h.how': 'Как играть',
  'lap.how': `
    <p><b>Что нужно:</b> двое. У каждого своё поле 6 × 6.</p>
    <p><b>Цель:</b> разгадать, как соперник поделил своё поле, раньше, чем он разгадает ваше.</p>
    <ol>
      <li><b>Тайная карта.</b> Тайком раскрасьте своё поле в четыре области — I, II, III и IV — по 9 клеток. Каждая область должна быть одним куском: клетки связаны сторонами, по диагонали не считается. Можно нажать «случайно».</li>
      <li><b>Вопросы.</b> В свой ход выделите на поле соперника прямоугольник — хотя бы 2 × 2, можно больше — пальцем или двумя касаниями углов, и нажмите «спросить». Ответ: сколько клеток каждой области внутри (например: две клетки III и по одной I и II). Но <i>где именно</i> какая клетка — не говорится.</li>
      <li><b>Заметки.</b> Раскрашивайте поле соперника своими догадками цветными карандашами I–IV. Это не тратит ход. Все ответы копятся в ленте под полем — коснитесь ответа, чтобы увидеть его прямоугольник.</li>
      <li><b>Разгадка.</b> Когда уверены, раскрасьте всё поле и нажмите «угадать!» вместо вопроса. Совпали области — вы победили. Ошиблись хоть в одной клетке — побеждает соперник. Номера областей могут не совпадать — важны только сами формы.</li>
    </ol>`,
  'lap.h.tips': 'Хитрости',
  'lap.tips': `
    <ul>
      <li><b>Начинайте с углов.</b> Угол 2 × 2 легко расшифровать: например, «три I и одна II» оставляет всего несколько вариантов — одинокая клетка II в углу была бы отрезана от своих.</li>
      <li><b>Связность — ваш главный союзник.</b> Каждая область — один кусок ровно из 9 клеток. Часто ответ невозможен «по-другому»: чтобы обогнуть чужую область, не хватит клеток.</li>
      <li><b>Большой вопрос или понятный?</b> Большой прямоугольник приносит больше сведений, но их труднее расшифровать. Маленький — наоборот. Ищите свой баланс.</li>
      <li><b>Своя карта.</b> Крупные плотные куски разгадываются легко. Извилистые области и «гребёнки» дольше остаются загадкой.</li>
    </ul>
    <p class="tip"><b>Варианты</b> (меняются в настройках). <i>Для начинающих:</i> всего две области по 18 клеток. <i>Эксперты:</i> поле 8 × 8 и четыре области по 16 — так игра была опубликована впервые. <i>Классика:</i> спрашивать можно только про квадрат 2 × 2; тогда некоторые карты неотличимы друг от друга, и рисовать их запрещено — игра проверит это сама.</p>
    <p class="tip"><b>Ещё вариант для класса</b> (здесь его нет): поле 4 × 4, четыре области по 4 клетки, а спрашивают не про прямоугольник, а про целую строку или столбец. Посложнее — 5 × 5 и пять областей.</p>`,
  'lap.h.origin': 'Откуда игра',
  'lap.origin': `
    <p>Название — инициалы автора, польского журналиста и знатока игр <b>Леха Пияновского</b> (Lech A. Pijanowski), который вёл игровую колонку в газете. Он отправил описание игры американскому изобретателю игр <b>Сиду Сэксону</b>, и тот с трудом, но перевёл письмо с польского и включил LAP в свою знаменитую книгу «A Gamut of Games» (1969).</p>
    <p>Сэксон считал, что хорошая игра проста в объяснении, но бесконечна в стратегиях, — и LAP как раз такая. В оригинале поле было 8 × 8, а спрашивать разрешалось только про квадраты 2 × 2. Бен Орлин в своей книге разрешил прямоугольники побольше: с ними любую правильную карту можно разгадать до конца.</p>
    <p>Игру часто сравнивают с «Морским боем», только вместо стрельбы наугад здесь — чистая логика: каждый ответ приходится примирять со всем, что вы уже знаете (или думаете, что знаете).</p>`,
});

addStrings('en', {
  'lap.title': 'LAP',
  'lap.tagline': 'map your opponent’s secret regions before they map yours',
  'lap.mode': 'Play:',
  'lap.mode.pvp': 'two players',
  'lap.mode.easy': 'vs computer (easy)',
  'lap.mode.normal': 'vs computer (normal)',
  'lap.mode.hard': 'vs computer (strong)',
  'lap.variant': 'Board:',
  'lap.variant.std': '6 × 6, four regions',
  'lap.variant.beginner': '6 × 6, two regions',
  'lap.variant.expert': '8 × 8, four regions',
  'lap.probe': 'Probes:',
  'lap.probe.any': 'any rectangle',
  'lap.probe.classic': '2 × 2 only',
  'lap.again': 'again!',
  'lap.p0': 'Blue',
  'lap.p1': 'Red',
  'lap.cpu': 'Computer',
  'lap.probes': ['probe', 'probes'],
  'lap.tool.probe': 'probe',
  'lap.tool.erase': 'erase',
  'lap.act.random': 'random',
  'lap.act.clear': 'clear',
  'lap.act.ready': 'ready ✓',
  'lap.act.ask': 'probe {rect}',
  'lap.act.ask0': 'probe',
  'lap.act.guess': 'guess!',
  'lap.act.sure': 'sure?',
  'lap.act.mine': 'my map',
  'lap.act.theirs': 'my notes',
  'lap.act.pass': 'pass turn →',
  'lap.act.look': 'see the maps',
  'lap.cover.title': '{name} draws a secret map',
  'lap.cover.note': 'Everyone else — no peeking!',
  'lap.cover.btn': 'it’s me, {name}',
  'lap.st.setup': '{name}: color {k} regions of {s} cells',
  'lap.st.setup.bad': 'Region {reg} is in pieces',
  'lap.st.setup.count': 'Each color needs exactly {s} cells',
  'lap.st.setup.amb': 'This map can’t be solved with 2 × 2 probes — change it',
  'lap.st.setup.ok': 'Map done — press “ready”',
  'lap.st.cover': 'Pass the device: {name} draws a map',
  'lap.st.waitsetup': 'Waiting for {name} to draw a map…',
  'lap.st.turn': '{name}: select a rectangle',
  'lap.st.turn.you': 'Your move: select a rectangle',
  'lap.st.corner': 'Now tap the opposite corner',
  'lap.st.small': 'A probe must be at least 2 × 2',
  'lap.st.classic': 'Classic rules: 2 × 2 squares only',
  'lap.st.sel': 'Probe {rect}?',
  'lap.st.pass': 'Note the answer and pass to {name}',
  'lap.st.thinking': '{name} is thinking…',
  'lap.st.them': '{name} is moving…',
  'lap.st.asked': '{name} probes {rect}',
  'lap.st.mine': 'Your map and the opponent’s probes',
  'lap.st.notmap': 'Your notes aren’t a map yet: each region must be one piece of {s} cells',
  'lap.online.wait': 'Waiting for the other player…',
  'lap.online.note': 'You’re playing online: the room creator starts new games and picks the rules.',
  'lap.online.waitnew': '{name} will start the next game',
  'lap.win.right': 'Map solved! {name} wins',
  'lap.win.wrong': 'Wrong guess! {name} wins',
  'lap.next': '{name} probes first',
  'lap.log.empty': 'answers will show up here',
  'say.ready': ['Done!', 'All drawn.', 'Good luck with that'],
  'say.peek': ['No peeking!', 'Look away!', 'Eyes closed!'],
  'say.clean': ['All one region!', 'Nice and clean', 'A solid chunk'],
  'say.mess': ['What a jumble…', 'All mixed up', 'Hmm, tangled'],
  'say.probe': ['Interesting…', 'Aha', 'Noted', 'Hmm'],
  'say.tease': ['My lips are sealed… oops', 'Cold', 'Keep looking', 'You’ll never guess'],
  'say.close': ['I think I know your map', 'Almost solved', 'It’s coming together'],
  'say.win': ['Hooray!', 'Solved it!', 'I’m a genius'],
  'say.lose': ['Rematch?', 'Ugh…', 'Next time'],
  'say.wrong': ['Oops…', 'Not that map', 'Too hasty…'],
  'say.miss': ['Wrong!', 'Nope!', 'Heh'],
  'lap.h.how': 'How to play',
  'lap.how': `
    <p><b>You need:</b> two players, each with a 6 × 6 grid.</p>
    <p><b>Goal:</b> work out how your opponent divided their grid before they work out yours.</p>
    <ol>
      <li><b>Secret map.</b> Secretly color your grid into four regions — I, II, III and IV — of 9 cells each. Every region must be one piece: cells joined by their sides (diagonals don’t count). “Random” will draw one for you.</li>
      <li><b>Probes.</b> On your turn, select a rectangle on your opponent’s grid — at least 2 × 2, bigger is fine — by dragging or by tapping two corners, then press “probe”. You learn how many of its cells belong to each region (say, two IIIs, one I and one II), but not <i>which</i> cell is which.</li>
      <li><b>Notes.</b> Color your guesses onto the opponent’s grid with the I–IV pencils. That doesn’t use up your turn. Every answer is kept in the strip under the grid — tap one to see its rectangle.</li>
      <li><b>The guess.</b> When you’re sure, color the whole grid and press “guess!” instead of probing. If your regions match theirs, you win. If even one cell is off, your opponent wins. Region numbers don’t need to match — only the shapes count.</li>
    </ol>`,
  'lap.h.tips': 'Tricks',
  'lap.tips': `
    <ul>
      <li><b>Start in the corners.</b> A 2 × 2 corner is easy to decode: “three I and one II” leaves only a few options — a lone II tucked in the corner would be cut off from the rest of its region.</li>
      <li><b>Connectedness is your best friend.</b> Each region is a single piece of exactly 9 cells. Often an answer can only fit one way: there simply aren’t enough cells to wrap one region around another.</li>
      <li><b>Big probe or clear probe?</b> A big rectangle carries more information but is harder to decode; a small one is the reverse. Find your own balance.</li>
      <li><b>Your own map.</b> Big solid blobs are easy to read. Twisty regions and interlocking “combs” stay mysterious much longer.</li>
    </ul>
    <p class="tip"><b>Variants</b> (in settings). <i>Beginners:</i> just two regions of 18 cells. <i>Experts:</i> an 8 × 8 grid with four regions of 16 — the way the game was first published. <i>Classic:</i> only 2 × 2 probes are allowed; then some maps can’t be told apart from others, so drawing them is forbidden — the game checks this for you.</p>
    <p class="tip"><b>A classroom cousin</b> (not included here): a 4 × 4 grid with four regions of 4 cells, where you ask about a whole row or column instead of a rectangle. For a harder version, try 5 × 5 with five regions.</p>`,
  'lap.h.origin': 'Where it comes from',
  'lap.origin': `
    <p>The name is the initials of its inventor, the Polish journalist and game expert <b>Lech A. Pijanowski</b>, who wrote a games column in a newspaper. He mailed the game to the American designer <b>Sid Sackson</b>, who translated the letter from Polish with some effort and put LAP into his classic book <i>A Gamut of Games</i> (1969).</p>
    <p>Sackson believed a good game is quick to learn yet endless in strategy — and LAP fits. The original used an 8 × 8 grid and allowed only 2 × 2 probes. In his book, Ben Orlin allows larger rectangles too: with them, any legal map can be pinned down completely.</p>
    <p>It’s often compared to Battleship, but instead of firing blind you reason: every new answer has to be squared with everything you already know (or think you know).</p>`,
});
