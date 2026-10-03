import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'bt.title': 'Зарытый клад',
  'bt.tagline': 'игра в блеф, где врать запрещено',
  'bt.mode': 'Играем:',
  'bt.mode.pvp': 'вдвоём',
  'bt.mode.easy': 'с компьютером (простой)',
  'bt.mode.normal': 'с компьютером (обычный)',
  'bt.mode.hard': 'с компьютером (хитрый)',
  'bt.size': 'Карта:',
  'bt.size.7': '7 × 7, по 3 карточки',
  'bt.size.9': '9 × 9, по 4 карточки',
  'bt.size.11': '11 × 11, по 5',
  'bt.notes': 'Пометки:',
  'bt.notes.smart': 'умные',
  'bt.notes.simple': 'только ответы',
  'bt.again': 'ещё раз!',
  'bt.p0': 'Синий',
  'bt.p1': 'Красный',
  'bt.cpu': 'Компьютер',
  'bt.digs': ['раскопка', 'раскопки', 'раскопок'],
  'bt.turn.ask': '{name}: о чём спросить?',
  'bt.turn.dig': '{name}: где копать?',
  'bt.you.ask': 'Спросите: нажмите букву или цифру',
  'bt.you.dig': 'Копайте: нажмите клетку карты',
  'bt.thinking': '{name} думает…',
  'bt.turn.them': 'Ходит {name}…',
  'bt.online.wait': 'Ждём второго игрока…',
  'bt.online.note': 'Сейчас идёт игра по сети: новую партию начинает и размер карты выбирает создатель комнаты.',
  'bt.online.waitnew': 'Новую партию начнёт {name}',
  'bt.cover.title': 'Передайте устройство',
  'bt.cover.note': 'Карточки на экране — секретные. Сопернику не подглядывать!',
  'bt.cover.btn': 'Это я, {name}!',
  'bt.cover.status': 'Ходит {name}',
  'bt.cover.last': 'Прошлый ход:',
  'bt.win': 'Клад находит {name}!',
  'bt.where': 'Он был зарыт в клетке {cell}',
  'bt.log.ask': '{name}: «{c} есть?» — «{ans}»',
  'bt.log.yes': 'есть',
  'bt.log.no': 'нет',
  'bt.log.dig': '{name} копает {cell}: {res}',
  'bt.log.opp': '«тут пусто»',
  'bt.log.self': '«вообще-то, пусто» (своя карточка)',
  'bt.log.win': 'клад!',
  'bt.legend': 'Ваши карточки обведены. Заштриховано — там клада точно нет.',
  'bt.say.ask': ['А «{c}» есть?', '«{c}» у тебя?', 'Есть «{c}»?'],
  'bt.say.yes': ['Есть.', 'Да, есть.', 'Угу.'],
  'bt.say.no': ['Нет.', 'Нету.', 'Не-а.'],
  'bt.say.dig': ['Копаю {cell}!', 'Пробую {cell}…', 'Лопату — в {cell}!'],
  'bt.say.empty': ['Тут клада нет.', 'Пусто!', 'Мимо.'],
  'bt.say.bluff': ['Вообще-то, тут пусто.', 'Шучу, тут ничего.', 'Хе-хе, пусто.'],
  'bt.say.worried': ['Хм…', 'Что-то тут нечисто…', 'Подозрительно'],
  'bt.say.win': ['Клад мой!', 'Вот он!', 'Ура, сокровище!'],
  'bt.say.lose': ['Эх, почти…', 'Реванш?', 'Ну вот'],
  'bt.h.how': 'Как играть',
  'bt.how': `
    <p><b>Что нужно:</b> двое и карта 9 × 9 — буквы A–I по горизонтали, цифры 1–9 по вертикали.</p>
    <p><b>Раздача.</b> Каждому тайно достаются 4 буквы и 4 цифры. Одна буква и одна цифра остаются ничьими — это и есть координаты клада.</p>
    <p><b>Цель:</b> выкопать клад первым.</p>
    <p>Каждый ход состоит из двух действий:</p>
    <ol>
      <li><b>Вопрос.</b> Нажмите букву или цифру на краю карты — соперник честно ответит, есть ли у него такая карточка. Спрашивать можно и о своей карточке, чтобы запутать соперника.</li>
      <li><b>Раскопки.</b> Нажмите клетку. Если у соперника есть её буква или цифра, он говорит «тут клада нет» (но не говорит, какая именно). Если у соперника нет ни той, ни другой, а у вас есть — вы честно признаётесь: «вообще-то, тут пусто». А если её буквы и цифры нет ни у кого — это клад, и вы победили!</li>
    </ol>
    <p>Ваши карточки на краю карты обведены вашим цветом, а клетки, где клада точно нет, заштрихованы. Золотой кружок — координата, которая точно ведёт к кладу. Вдвоём за одним экраном передавайте устройство: чужие карточки видеть нельзя.</p>`,
  'bt.h.tips': 'Хитрости',
  'bt.tips': `
    <ul>
      <li>Ответ «нет» про карточку, которой нет у вас, — это сразу координата клада. Но соперник слышит тот же ответ: если он думает, что вы спрашиваете только о чужом, — он узнает то же самое.</li>
      <li>Поэтому иногда спрашивайте о <b>своих</b> карточках. Ответ «нет» вам известен заранее, зато соперник ничего не поймёт.</li>
      <li>Раскопки — это второй вопрос. Копайте там, где одна координата ваша: если соперник не скажет «тут пусто», значит, вторая координата — клад, а он об этом не узнает.</li>
      <li>Слушайте вопросы соперника: чаще всего спрашивают о том, чего нет на руках.</li>
    </ul>
    <p class="tip"><b>Хитрый компьютер</b> рассуждает именно так: следит за вашими вопросами и иногда блефует сам.</p>
    <p class="tip"><b>Варианты.</b> Карту можно уменьшить до 7 × 7 (по три карточки) для быстрой партии или увеличить до 11 × 11 (по пять) для долгой — это есть в настройках. Там же можно выключить умные пометки и вести рассуждения самому, как на бумаге.</p>`,
  'bt.h.origin': 'Откуда игра',
  'bt.origin': `
    <p>Это старая игра на бумаге и карандаше. Её описал британский изобретатель игр Эрик Соломон в сборнике <i>«Games with Pencil and Paper»</i> («Игры с карандашом и бумагой»). Ему нравилось, что игра учит блефу, при этом никого не заставляя врать: все ответы честные, хитрость — только в вопросах.</p>
    <p>Устройство напоминает детектив «Клуэдо»: разгадка спрятана в карточках, которые не достались никому, и надо вычислить их по чужим ответам. Эрик Соломон придумал много игр с похожими загадками — например, «Чёрный ящик», где луч света выдаёт спрятанные внутри атомы.</p>`,
});

addStrings('en', {
  'bt.title': 'Buried Treasure',
  'bt.tagline': 'a bluffing game where lying is not allowed',
  'bt.mode': 'Play:',
  'bt.mode.pvp': 'two players',
  'bt.mode.easy': 'vs computer (easy)',
  'bt.mode.normal': 'vs computer (normal)',
  'bt.mode.hard': 'vs computer (sneaky)',
  'bt.size': 'Map:',
  'bt.size.7': '7 × 7, 3 cards each',
  'bt.size.9': '9 × 9, 4 cards each',
  'bt.size.11': '11 × 11, 5 each',
  'bt.notes': 'Notes:',
  'bt.notes.smart': 'smart',
  'bt.notes.simple': 'answers only',
  'bt.again': 'again!',
  'bt.p0': 'Blue',
  'bt.p1': 'Red',
  'bt.cpu': 'Computer',
  'bt.digs': ['dig', 'digs'],
  'bt.turn.ask': '{name}: what to ask?',
  'bt.turn.dig': '{name}: where to dig?',
  'bt.you.ask': 'Ask: tap a letter or a number',
  'bt.you.dig': 'Dig: tap a square of the map',
  'bt.thinking': '{name} is thinking…',
  'bt.turn.them': '{name} is moving…',
  'bt.online.wait': 'Waiting for the other player…',
  'bt.online.note': 'You’re playing online: the room creator starts new games and picks the map size.',
  'bt.online.waitnew': '{name} will start the next game',
  'bt.cover.title': 'Pass the device',
  'bt.cover.note': 'The cards on screen are secret. No peeking, opponent!',
  'bt.cover.btn': 'It’s me, {name}!',
  'bt.cover.status': '{name} to move',
  'bt.cover.last': 'Last turn:',
  'bt.win': '{name} finds the treasure!',
  'bt.where': 'It was buried at {cell}',
  'bt.log.ask': '{name}: “Got {c}?” — “{ans}”',
  'bt.log.yes': 'yes',
  'bt.log.no': 'no',
  'bt.log.dig': '{name} digs at {cell}: {res}',
  'bt.log.opp': '“nothing here”',
  'bt.log.self': '“actually, nothing here” (own card)',
  'bt.log.win': 'treasure!',
  'bt.legend': 'Your cards are outlined. Shaded squares can’t hold the treasure.',
  'bt.say.ask': ['Got {c}?', 'Do you have {c}?', 'Any {c}?'],
  'bt.say.yes': ['Yes.', 'Yep, I do.', 'Uh-huh.'],
  'bt.say.no': ['No.', 'Nope.', 'Not me.'],
  'bt.say.dig': ['Digging at {cell}!', 'Trying {cell}…', 'Shovel into {cell}!'],
  'bt.say.empty': ['No treasure there.', 'Empty!', 'Missed.'],
  'bt.say.bluff': ['Actually, nothing here.', 'Kidding, it’s empty.', 'Heh, empty.'],
  'bt.say.worried': ['Hmm…', 'They know something…', 'Suspicious'],
  'bt.say.win': ['The treasure is mine!', 'Found it!', 'Riches!'],
  'bt.say.lose': ['So close…', 'Rematch?', 'Oh well'],
  'bt.h.how': 'How to play',
  'bt.how': `
    <p><b>You need:</b> two players and a 9 × 9 map — letters A–I across, numbers 1–9 down.</p>
    <p><b>The deal.</b> Each player secretly gets 4 letters and 4 numbers. One letter and one number belong to nobody — together they mark where the treasure lies.</p>
    <p><b>Goal:</b> dig up the treasure first.</p>
    <p>Every turn has two steps:</p>
    <ol>
      <li><b>Ask.</b> Tap a letter or a number on the edge of the map; your opponent truthfully says whether they hold that card. You may even ask about one of your own cards, just to throw them off.</li>
      <li><b>Dig.</b> Tap a square. If your opponent holds its letter or its number, they say “no treasure here” (without saying which). If they hold neither but you hold one, you have to admit it: “actually, nothing here.” If nobody holds either — that’s the treasure, and you win!</li>
    </ol>
    <p>Your own cards are outlined in your colour on the edge of the map, and squares that can’t hold the treasure are shaded. A gold ring marks a coordinate that surely leads to the treasure. Sharing one screen? Pass the device between turns — no peeking at the other hand.</p>`,
  'bt.h.tips': 'Tricks',
  'bt.tips': `
    <ul>
      <li>A “no” about a card you don’t hold gives you a treasure coordinate at once. But your opponent hears that “no” too — if they assume you only ask about cards you lack, they learn exactly what you did.</li>
      <li>So sometimes ask about <b>your own</b> cards. You already know the answer is “no”, but your opponent can’t tell.</li>
      <li>A dig is a second, quieter question. Dig where one coordinate is yours: if your opponent doesn’t say “nothing here”, the other coordinate is the treasure — and they won’t know you know.</li>
      <li>Listen to your opponent’s questions: people usually ask about cards they don’t have.</li>
    </ul>
    <p class="tip"><b>The sneaky computer</b> thinks exactly like this: it reads your questions and bluffs now and then.</p>
    <p class="tip"><b>Variants.</b> Shrink the map to 7 × 7 (three cards each) for a quick game or grow it to 11 × 11 (five each) for a long one — see the settings. You can also switch the smart notes off and do the deducing yourself, as on paper.</p>`,
  'bt.h.origin': 'Where it comes from',
  'bt.origin': `
    <p>This is an old pencil-and-paper game. The British game inventor Eric Solomon wrote it up in his collection <i>Games with Pencil and Paper</i>. He liked how it teaches bluffing without making anyone lie: every answer is honest, and all the cunning is in the questions.</p>
    <p>Its engine resembles the detective game Clue (Cluedo): the solution hides in the cards nobody was dealt, and you work it out from other people’s answers. Solomon invented many games with puzzles like this — Black Box, for one, where rays of light give away atoms hidden inside a box.</p>`,
});
