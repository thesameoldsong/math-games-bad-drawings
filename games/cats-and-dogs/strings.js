import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'cad.title': 'Кошки и собаки',
  'cad.tagline': 'расселите своих зверей так, чтобы чужим не осталось места',
  'cad.size': 'Поле:',
  'cad.rule': 'Правило:',
  'cad.rule.snort': 'классика',
  'cad.rule.col': 'наоборот (свои врозь)',
  'cad.touch': 'Соседи — это:',
  'cad.touch.diag': 'стороны и уголки',
  'cad.touch.side': 'только стороны',
  'cad.first': 'Первыми ходят:',
  'cad.hints': 'Подсветка:',
  'cad.hints.on': 'включена',
  'cad.hints.off': 'выключена',
  'cad.mode': 'Играем:',
  'cad.mode.pvp': 'вдвоём',
  'cad.mode.easy': 'с компьютером (простой)',
  'cad.mode.normal': 'с компьютером (обычный)',
  'cad.mode.hard': 'с компьютером (хитрый)',
  'cad.again': 'ещё раз!',
  'cad.p0': 'Кошки',
  'cad.p1': 'Собаки',
  'cad.cpu': 'Компьютер',
  'cad.spots': ['место', 'места', 'мест'],
  'cad.spots.title': 'Сколько клеток сейчас доступно',
  'cad.turn': 'Ход: {name}',
  'cad.thinking': '{name} думает…',
  'cad.turn.you': 'Ваш ход',
  'cad.turn.them': 'Ход соперника: {name}…',
  'cad.online.wait': 'Ждём второго игрока…',
  'cad.online.note': 'Идёт игра по сети: новую партию и правила выбирает создатель комнаты.',
  'cad.online.waitnew': 'Ждём, когда {name} запустит новую партию',
  'cad.win': 'Победитель — {name}!',
  'cad.why0': 'Собакам больше некуда сесть.',
  'cad.why1': 'Кошкам больше некуда сесть.',
  'cad.next': 'В новой партии первый ход: {name}',
  'cad.say.grab0': ['Мяу!', 'Фыр-р!', 'Моё!', 'Брысь!'],
  'cad.say.grab1': ['Гав!', 'Р-р-р!', 'Моё!', 'Кыш!'],
  'cad.say.squeezed': ['Эй!', 'Тесно…', 'Куда же мне?', 'Ну вот…'],
  'cad.say.low': ['Места мало…', 'Почти некуда…', 'Ой-ой'],
  'cad.say.waste': ['Хм', 'Ну-ну', 'Спасибо!'],
  'cad.say.mirror': ['Как в зеркале!', 'Повторяю за тобой', 'Отражаю!'],
  'cad.say.win': ['Ура!', 'Последний ход мой!', 'Победа!'],
  'cad.say.lose': ['Некуда ступить…', 'Реванш?', 'Эх…'],
  'cad.h.how': 'Как играть',
  'cad.how': `
    <p><b>Что нужно:</b> двое и клетчатое поле 7 × 7. Один играет за кошек (синие), другой — за собак (красные).</p>
    <p><b>Цель:</b> сделать последний ход.</p>
    <ol>
      <li>Ходите по очереди: посадите своего зверя в любую <b>пустую</b> клетку. Просто нажмите на неё.</li>
      <li>Кошка и собака <b>никогда не сидят рядом</b> — ни бок о бок, ни даже наискосок, уголком. Кошкам рядом с кошками можно, собакам с собаками — тоже.</li>
      <li>Если в свой ход вам некуда посадить зверя — вы проиграли. Побеждает тот, кто походил последним.</li>
    </ol>
    <p class="tip">Подсветка показывает, кому какие клетки остались: голубые — только кошкам, розовые — только собакам, серый крестик — никому. Её можно выключить в настройках.</p>`,
  'cad.h.tips': 'Хитрости',
  'cad.tips': `
    <ul>
      <li>Начинайте с <b>середины</b>: каждый зверь отнимает у соперника до восьми клеток вокруг себя.</li>
      <li>Клетки, куда можете сесть только вы, — это ваш <b>запас</b>. Сначала боритесь за общие клетки, а запас тратьте в конце.</li>
      <li>Запас надёжен, только если соперник не может сесть <b>рядом</b> с ним: чужой зверь по соседству сразу закроет вам клетку.</li>
      <li>Выстраивайте <b>стенки</b> из своих зверей — за стенкой получается целый загон, куда чужим ходу нет.</li>
      <li>Когда общих клеток не осталось, просто посчитайте запасы: тому, чей сейчас ход, нужно <b>больше</b> клеток, чем у соперника, — равенства мало.</li>
    </ul>
    <p class="tip"><b>Секрет для полей 5 × 5, 7 × 7 и 9 × 9.</b> У начинающего есть беспроигрышный план: сесть в самый центр, а потом на каждый ход соперника отвечать клеткой, симметричной ей относительно центра. Попробуйте понять, почему такой ответ всегда разрешён. На чётных полях центральной клетки нет, и трюк не работает. Хитрый компьютер этот план знает.</p>
    <p><b>Другие варианты</b> (есть в настройках):</p>
    <ul>
      <li><b>Наоборот.</b> Запрещено сидеть рядом со <i>своими</i>, а с чужими можно. Математикам такой вариант анализировать проще, а играть — скучнее: вместо загонов приходится раскидывать зверей поодиночке.</li>
      <li><b>Только стороны.</b> Соседями считаются лишь клетки с общей стороной, уголком касаться можно.</li>
      <li>Поле не обязано быть клетчатым: нарисуйте на бумаге любую карту из «пастбищ» — соседями будут пастбища с общей границей.</li>
    </ul>`,
  'cad.h.origin': 'Откуда игра',
  'cad.origin': `
    <p>Игру придумал британский математик Саймон Нортон, и в его честь её прозвали <i>Snort</i> (от его имени и фамилии). В исходной истории вместо кошек и собак были быки и коровы на пастбищах: окажись они по соседству — поднимется фырканье, по-английски <i>snort</i>.</p>
    <p>Вариант «наоборот» называется <i>Col</i>. Обе игры стали классическими примерами в теории комбинаторных игр — разделе математики, где позиции складывают и сравнивают, как числа. Подробно их разбирают Берлекэмп, Конвей и Гай в знаменитой книге «Winning Ways».</p>`,
});

addStrings('en', {
  'cad.title': 'Cats and Dogs',
  'cad.tagline': 'settle your animals so the other side runs out of room',
  'cad.size': 'Board:',
  'cad.rule': 'Rule:',
  'cad.rule.snort': 'classic',
  'cad.rule.col': 'reversed (own kind apart)',
  'cad.touch': 'Neighbours are:',
  'cad.touch.diag': 'sides and corners',
  'cad.touch.side': 'sides only',
  'cad.first': 'First move:',
  'cad.hints': 'Highlight:',
  'cad.hints.on': 'on',
  'cad.hints.off': 'off',
  'cad.mode': 'Play:',
  'cad.mode.pvp': 'two players',
  'cad.mode.easy': 'vs computer (easy)',
  'cad.mode.normal': 'vs computer (normal)',
  'cad.mode.hard': 'vs computer (sneaky)',
  'cad.again': 'again!',
  'cad.p0': 'Cats',
  'cad.p1': 'Dogs',
  'cad.cpu': 'Computer',
  'cad.spots': ['spot', 'spots'],
  'cad.spots.title': 'Squares you can still use',
  'cad.turn': 'Turn: {name}',
  'cad.thinking': '{name} is thinking…',
  'cad.turn.you': 'Your move',
  'cad.turn.them': 'Waiting for {name}…',
  'cad.online.wait': 'Waiting for the other player…',
  'cad.online.note': 'You’re playing online: the room creator starts new games and picks the rules.',
  'cad.online.waitnew': 'Waiting for {name} to set up the next game',
  'cad.win': 'Winner: {name}!',
  'cad.why0': 'No room left for the dogs.',
  'cad.why1': 'No room left for the cats.',
  'cad.next': 'First move next game: {name}',
  'cad.say.grab0': ['Meow!', 'Hiss!', 'Mine!', 'Shoo!'],
  'cad.say.grab1': ['Woof!', 'Grrr!', 'Mine!', 'Scram!'],
  'cad.say.squeezed': ['Hey!', 'Cramped…', 'Where do I go?', 'Oh no'],
  'cad.say.low': ['Running out…', 'Hardly any room', 'Uh-oh'],
  'cad.say.waste': ['Hmm', 'Okay then', 'Thanks!'],
  'cad.say.mirror': ['Mirror, mirror!', 'Copying you', 'Reflected!'],
  'cad.say.win': ['Hooray!', 'Last move is mine!', 'Victory!'],
  'cad.say.lose': ['Nowhere to go…', 'Rematch?', 'Ugh…'],
  'cad.h.how': 'How to play',
  'cad.how': `
    <p><b>You need:</b> two players and a 7 × 7 grid. One side plays cats (blue), the other dogs (red).</p>
    <p><b>Goal:</b> make the last move.</p>
    <ol>
      <li>Take turns placing one of your animals on any <b>empty</b> square. Just tap it.</li>
      <li>A cat and a dog may <b>never be neighbours</b> — not side by side, not even touching at a corner. Cats may sit next to cats, and dogs next to dogs.</li>
      <li>If it’s your turn and there’s nowhere left for your animal, you lose. Whoever moves last wins.</li>
    </ol>
    <p class="tip">The highlight shows who can still use each square: blue — cats only, pink — dogs only, a grey cross — nobody. You can switch it off in the settings.</p>`,
  'cad.h.tips': 'Tricks',
  'cad.tips': `
    <ul>
      <li>Start in the <b>middle</b>: every animal takes up to eight squares around it away from the other side.</li>
      <li>Squares only you can use are your <b>savings</b>. Fight over the shared squares first and spend your savings at the end.</li>
      <li>Savings are only safe if your opponent can’t sit <b>next to</b> them: one enemy animal alongside and the square is closed.</li>
      <li>Build <b>walls</b> of your animals — behind a wall you get a whole pen the other side can’t enter.</li>
      <li>Once no shared squares are left, just count savings: whoever is to move needs <b>more</b> squares than the opponent — a tie isn’t enough.</li>
    </ul>
    <p class="tip"><b>A secret for 5 × 5, 7 × 7 and 9 × 9 boards.</b> The first player has a plan that can’t lose: take the very centre, then answer every move with the square opposite it through the centre. Can you see why that reply is always allowed? Even-sized boards have no centre square, so the trick fails there. The sneaky computer knows this plan.</p>
    <p><b>Other versions</b> (in the settings):</p>
    <ul>
      <li><b>Reversed.</b> Animals may not sit next to their <i>own</i> kind, but may sit next to the others. It’s easier for mathematicians to analyse and duller to play: instead of building pens you scatter lone animals around.</li>
      <li><b>Sides only.</b> Only squares sharing a side count as neighbours; touching at a corner is fine.</li>
      <li>The board needn’t be a grid: on paper, draw any map of “fields” — fields sharing a border are neighbours.</li>
    </ul>`,
  'cad.h.origin': 'Where it comes from',
  'cad.origin': `
    <p>The game was invented by the British mathematician Simon Norton and nicknamed <i>Snort</i> after him (S. Norton). In his version, bulls and cows graze in fields — put them in neighbouring fields and the snorting begins.</p>
    <p>The reversed version is called <i>Col</i>. Both became textbook examples in combinatorial game theory, the branch of mathematics where game positions are added and compared like numbers. Berlekamp, Conway and Guy study them in detail in their famous book <i>Winning Ways</i>.</p>`,
});
