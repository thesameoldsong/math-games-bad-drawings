import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'sim.title': 'Сим',
  'sim.tagline': 'шесть точек и одна головная боль: не нарисуйте свой треугольник',
  'sim.layout': 'Точки:',
  'sim.layout.hex': 'шестиугольник',
  'sim.layout.jim': 'треугольник в треугольнике',
  'sim.rule': 'Треугольники:',
  'sim.rule.auto': 'замечает игра',
  'sim.rule.manual': 'ищете сами («СИМ!»)',
  'sim.mode': 'Играем:',
  'sim.mode.pvp': 'вдвоём',
  'sim.mode.easy': 'с компьютером (простой)',
  'sim.mode.normal': 'с компьютером (обычный)',
  'sim.mode.hard': 'с компьютером (безупречный)',
  'sim.again': 'ещё раз!',
  'sim.p0': 'Синий',
  'sim.p1': 'Красный',
  'sim.cpu': 'Компьютер',
  'sim.wins': ['победа', 'победы', 'побед'],
  'sim.turn': 'Ходит {name}',
  'sim.turn.pick': '{name}: выберите вторую точку',
  'sim.thinking': '{name} думает…',
  'sim.turn.you': 'Ваш ход',
  'sim.turn.them': 'Ходит {name}…',
  'sim.call.btn': 'СИМ!',
  'sim.call.cancel': 'отмена',
  'sim.call.pick': 'Отметьте три точки треугольника',
  'sim.call.full': 'Линий больше нет — найдите треугольник!',
  'sim.online.wait': 'Ждём второго игрока…',
  'sim.online.note': 'Сейчас идёт игра по сети: новую партию начинает и правила выбирает создатель комнаты.',
  'sim.online.waitnew': 'Ждём, когда {name} запустит новую партию',
  'sim.win': 'Побеждает {name}!',
  'sim.next': 'Следующую партию начинает {name}',
  'sim.why.triangle': '{loser} замыкает треугольник своего цвета',
  'sim.why.called': '{winner} ловит соперника на треугольнике',
  'sim.why.stolen': '{loser} пропускает треугольник соперника — {winner} показывает его и забирает победу',
  'sim.why.false': '{loser} кричит «СИМ!», а треугольника-то нет',
  'say.start': ['Легко!', 'Шесть точек…', 'Ну-ка, ну-ка'],
  'say.trap': ['Твой ход!', 'Куда теперь?', 'Хе-хе', 'Выбирай…'],
  'say.stuck': ['Ой-ой', 'Хм…', 'Некуда!'],
  'say.tight': ['Тесновато…', 'Осторожно…', 'Спокойно'],
  'say.hmm': ['Интересно…', 'Ага!', 'Ого'],
  'say.oops': ['Ой!', 'Эх!', 'Нееет'],
  'say.sim': ['С-И-М!', 'СИМ!', 'Есть!'],
  'say.steal': ['Хе-хе, мой!', 'СИМ! Ха!', 'Не заметили?'],
  'say.false': ['Ой…', 'Где он?', 'Упс'],
  'say.win': ['Ура!', 'Победа!', 'Так-то!'],
  'say.lose': ['Реванш?', 'Ещё раз?', 'Ох…'],
  'say.lucky': ['Повезло!', 'Ну наконец', 'Спасибо!'],
  'sim.h.how': 'Как играть',
  'sim.how': `
    <p><b>Что нужно:</b> двое, две ручки разных цветов и шесть точек.</p>
    <p><b>Цель:</b> не собрать треугольник своего цвета. Проигрывает тот, кто первым замкнёт три точки линиями одного (своего) цвета.</p>
    <ol>
      <li>Ходите по очереди: соедините любые две точки, которые ещё не соединены. Нажмите на одну точку, потом на другую (или прямо на линию-подсказку).</li>
      <li>Линии могут пересекаться — это нормально. Считаются только треугольники с вершинами в шести исходных точках; фигурки, которые получаются на пересечениях, не в счёт.</li>
      <li>Замкнули треугольник своего цвета — проиграли. Чужие и разноцветные треугольники не опасны.</li>
    </ol>
    <p class="tip">Ничьей не бывает: когда все 15 линий проведены, треугольник одного цвета обязательно найдётся.</p>
    <p><b>Режим «ищете сами».</b> Так играют на бумаге: игра не подсказывает. Заметили треугольник соперника — жмите <b>СИМ!</b> и отметьте три его точки: вы победили. Соперник не заметил ваш треугольник и сходил дальше? Покажите его сами — победа ваша. Но если «треугольника» не окажется, проигрываете вы.</p>`,
  'sim.h.tips': 'Хитрости',
  'sim.tips': `
    <ul>
      <li>Опасна каждая пара ваших линий из одной точки: третья сторона такого «уголка» становится для вас запретной. Чем больше запретных линий, тем быстрее закончатся ходы.</li>
      <li>Выгодно рисовать там, где у треугольника уже есть линия соперника: такой треугольник «мёртв» и ни для кого не опасен.</li>
      <li>Линии, запретные для соперника, но безопасные для вас, — ваш запас. Не тратьте его раньше времени: соперник их всё равно не возьмёт.</li>
      <li>У второго игрока есть беспроигрышная стратегия, но она так запутана, что выучить её нельзя. «Безупречный» компьютер её знает — попробуйте обыграть его, когда он ходит первым.</li>
    </ul>
    <p class="tip"><b>Сим «по прихоти»</b> — для троих: цветов по-прежнему два, но каждый в свой ход сам решает, какой ручкой рисовать.</p>
    <p class="tip"><b>Другая раскладка.</b> Расставить шесть точек можно как угодно — связи от этого не меняются, а вот путаница меняется. В «шестиугольнике» линии пересекаются в куче мест, а «треугольник в треугольнике» даёт всего три пересечения и гораздо меньше ложных треугольников. Попробуйте в настройках.</p>
    <p class="tip"><b>Сим для толпы.</b> Команды по очереди соединяют точки на большой доске (15–20 точек) с ограничением по времени, а потом считают треугольники: побеждает тот, у кого их меньше (или больше — договоритесь заранее).</p>`,
  'sim.h.origin': 'Откуда игра',
  'sim.origin': `
    <p>Игру назвали в честь математика Густавуса Симмонса, который её исследовал в конце 1960-х. В 1974 году появилась статья с выигрышной стратегией для второго игрока — длинный список правил, который не запомнит ни один человек.</p>
    <p>Корни Сима — в <b>теории Рамсея</b>, названной по имени английского математика Фрэнка Рамсея (1903–1930). Её главный вопрос: сколько нужно точек, чтобы при любой раскраске связей в два цвета обязательно появилась одноцветная фигура? Для треугольника хватает шести точек, а пяти — нет: на пятиугольнике Сим мог бы закончиться вничью.</p>
    <p>Почему шести хватает? Возьмите любую точку: из неё выходят пять линий, значит, минимум три — одного цвета, скажем красного. Если два их конца соединены красной линией — вот красный треугольник. Если нет — эти три точки соединены между собой синими линиями.</p>
    <p>Если вместо треугольника избегать четырёх попарно связанных точек, нужно уже 18 точек. Для пяти точный ответ до сих пор неизвестен — известно лишь, что где-то в середине пятого десятка. А в жизни это про людей: в любой компании из шести человек найдутся трое знакомых друг с другом или трое незнакомых.</p>`,
});

addStrings('en', {
  'sim.title': 'Sim',
  'sim.tagline': 'six dots, one headache: don’t draw your own triangle',
  'sim.layout': 'Dots:',
  'sim.layout.hex': 'hexagon',
  'sim.layout.jim': 'triangle in a triangle',
  'sim.rule': 'Triangles:',
  'sim.rule.auto': 'the game spots them',
  'sim.rule.manual': 'spot them yourself (“SIM!”)',
  'sim.mode': 'Play:',
  'sim.mode.pvp': 'two players',
  'sim.mode.easy': 'vs computer (easy)',
  'sim.mode.normal': 'vs computer (normal)',
  'sim.mode.hard': 'vs computer (flawless)',
  'sim.again': 'again!',
  'sim.p0': 'Blue',
  'sim.p1': 'Red',
  'sim.cpu': 'Computer',
  'sim.wins': ['win', 'wins'],
  'sim.turn': '{name} to move',
  'sim.turn.pick': '{name}: pick the second dot',
  'sim.thinking': '{name} is thinking…',
  'sim.turn.you': 'Your move',
  'sim.turn.them': '{name} is moving…',
  'sim.call.btn': 'SIM!',
  'sim.call.cancel': 'cancel',
  'sim.call.pick': 'Tap the three dots of the triangle',
  'sim.call.full': 'No lines left — find the triangle!',
  'sim.online.wait': 'Waiting for the other player…',
  'sim.online.note': 'You’re playing online: the room creator starts new games and picks the rules.',
  'sim.online.waitnew': 'Waiting for {name} to start a new game',
  'sim.win': '{name} wins!',
  'sim.next': '{name} opens the next game',
  'sim.why.triangle': '{loser} closed a triangle in their own colour',
  'sim.why.called': '{winner} caught the opponent’s triangle',
  'sim.why.stolen': '{loser} missed {winner}’s triangle, so {winner} pointed it out',
  'sim.why.false': '{loser} shouted “SIM!” but there was no triangle',
  'say.start': ['Looks simple', 'Just six dots…', 'Let’s see'],
  'say.trap': ['Your move!', 'Where now?', 'Heh', 'Choose…'],
  'say.stuck': ['Uh-oh', 'Hmm…', 'Nowhere to go!'],
  'say.tight': ['Tight…', 'Careful…', 'Stay calm'],
  'say.hmm': ['Interesting…', 'Aha!', 'Oho'],
  'say.oops': ['Oops!', 'Argh!', 'Nooo'],
  'say.sim': ['S-I-M!', 'SIM!', 'Gotcha!'],
  'say.steal': ['Mine, heh!', 'SIM! Ha!', 'Nobody noticed?'],
  'say.false': ['Oops', 'Hmm?', 'Whoops'],
  'say.win': ['Hooray!', 'Victory!', 'Told you!'],
  'say.lose': ['Rematch?', 'Next time…', 'Ouch…'],
  'say.lucky': ['Lucky!', 'Finally', 'Thanks!'],
  'sim.h.how': 'How to play',
  'sim.how': `
    <p><b>You need:</b> two players, two pens of different colours and six dots.</p>
    <p><b>Goal:</b> don’t make a triangle in your own colour. The first player to join three dots with lines all of their colour loses.</p>
    <ol>
      <li>Take turns joining any two dots that aren’t joined yet. Tap one dot, then another (or tap a faint guide line directly).</li>
      <li>Lines may cross — that’s fine. Only triangles whose corners are three of the six dots count; shapes formed at crossings don’t.</li>
      <li>Close a triangle in your colour and you lose. Your opponent’s triangles and mixed ones are harmless.</li>
    </ol>
    <p class="tip">There are no ties: once all 15 lines are drawn, a one-colour triangle is guaranteed.</p>
    <p><b>“Spot them yourself” mode.</b> This is how it goes on paper: the game won’t tell you. Spot your opponent’s triangle, press <b>SIM!</b> and tap its three dots — you win. Your opponent missed your own triangle and moved on? Point it out yourself and the win is yours. But call a “triangle” that isn’t there and you lose.</p>`,
  'sim.h.tips': 'Tricks',
  'sim.tips': `
    <ul>
      <li>Every pair of your lines sharing a dot is a danger: the third side of that “corner” becomes forbidden for you. More forbidden lines means you run out of moves sooner.</li>
      <li>Draw where a triangle already holds an opponent’s line: that triangle is “dead” and threatens nobody.</li>
      <li>Lines that are forbidden for your opponent but safe for you are your reserve. Don’t spend them early — your opponent can’t take them anyway.</li>
      <li>The second player has a winning strategy, but it’s far too tangled to memorize. The flawless computer knows it — try beating it when it moves first.</li>
    </ul>
    <p class="tip"><b>Whim Sim</b> for three: still two colours, but on your turn you choose which pen to use.</p>
    <p class="tip"><b>Another arrangement.</b> You can place the six dots however you like — the connections stay the same, but the confusion doesn’t. The hexagon has lines crossing all over the place, while a triangle inside a triangle has just three crossings and far fewer fake triangles. Try it in the settings.</p>
    <p class="tip"><b>Sim for a crowd.</b> Teams take turns joining dots on a big board (15–20 dots) against a timer, then count triangles: fewest wins (or most — agree beforehand).</p>`,
  'sim.h.origin': 'Where it comes from',
  'sim.origin': `
    <p>The game is named after the mathematician Gustavus Simmons, who studied it in the late 1960s. In 1974 a paper described a winning strategy for the second player — a long list of rules no human could memorize.</p>
    <p>Sim grows out of <b>Ramsey theory</b>, named after the English mathematician Frank Ramsey (1903–1930). Its central question: how many dots do you need so that any two-colouring of the connections must contain a one-colour shape? For a triangle six dots are enough, but five are not: Sim on a pentagon could end in a tie.</p>
    <p>Why are six enough? Pick any dot: five lines leave it, so at least three share a colour, say red. If any two of their far ends are joined in red, there’s a red triangle. If not, those three dots are joined to each other in blue.</p>
    <p>Avoid four mutually joined dots instead of three and you need 18 dots. For five, the exact number is still unknown; it lies somewhere in the mid-forties. And in real life it’s about people: any group of six contains three mutual acquaintances or three mutual strangers.</p>`,
});
