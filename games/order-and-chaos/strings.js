import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'oac.title': 'Порядок и хаос',
  'oac.tagline': 'один строит пятёрку в ряд, другой ему мешает — а крестики и нолики общие',
  'oac.mode': 'Играем:',
  'oac.mode.pvp': 'вдвоём',
  'oac.mode.easy': 'с компьютером (простой)',
  'oac.mode.normal': 'с компьютером (обычный)',
  'oac.mode.hard': 'с компьютером (сильный)',
  'oac.first': 'Порядок в 1-й партии:',
  'oac.jewels': 'Самоцветы:',
  'oac.jewels.off': 'без них',
  'oac.jewels.on': 'по одному на сторону',
  'oac.settings.note': 'Стороны меняются каждую партию, очки копятся. Смена настроек начинает новый матч.',
  'oac.again': 'следующая партия',
  'oac.p0': 'Синий',
  'oac.p1': 'Красный',
  'oac.cpu': 'Компьютер',
  'oac.role0': 'Порядок',
  'oac.role1': 'Хаос',
  'oac.pts': ['очко', 'очка', 'очков'],
  'oac.turn': 'Ходит {name} — {role}',
  'oac.thinking': '{name} думает…',
  'oac.turn.you': 'Ваш ход — {role}',
  'oac.turn.them': 'Ходит {name}…',
  'oac.online.wait': 'Ждём второго игрока…',
  'oac.online.note': 'Сейчас идёт игра по сети: новую партию начинает и настройки выбирает создатель комнаты.',
  'oac.online.waitnew': 'Новую партию запустит {name}',
  'oac.win': 'Побеждает {name}!',
  'oac.why.order': 'Пятёрка в ряд — Порядок берёт +{pts}',
  'oac.why.chaos': 'Пятёрке уже не сложиться — Хаос берёт +{pts}',
  'oac.next': 'Дальше за Порядок играет {name}',
  'oac.sym.W': 'двойной',
  'oac.sym.B': 'пустышка',
  'oac.say.threat': ['Почти!', 'Ещё одна…', 'Чувствуешь?', 'Строим!'],
  'oac.say.fork': ['Две дыры не закроешь!', 'Вилка!', 'Попался!'],
  'oac.say.block': ['Не выйдет!', 'Стоп!', 'А вот и нет', 'Хе-хе'],
  'oac.say.worried': ['Ой-ой', 'Хм…', 'Опасно…'],
  'oac.say.sad': ['Эх…', 'Ну вот', 'Моя линия…'],
  'oac.say.jewelW': ['Самоцвет!', 'И то и другое!'],
  'oac.say.jewelB': ['Ни то ни сё!', 'Самоцвет!'],
  'oac.say.oops': ['Спасибо за помощь!', 'Твой же значок!'],
  'oac.say.win': ['Порядок!', 'Ура!', 'Пятёрка!'],
  'oac.say.winChaos': ['Хаос!', 'Ура!', 'Всё перемешано!'],
  'oac.say.lose': ['Реванш?', 'Меняемся!', 'Ну и ладно'],
  'oac.h.how': 'Как играть',
  'oac.how': `
    <p><b>Что нужно:</b> двое и поле 6 × 6.</p>
    <p>Один играет за <b>Порядок</b>, другой — за <b>Хаос</b>. Порядок ходит первым.</p>
    <ol>
      <li>За ход ставьте в любую пустую клетку <b>крестик или нолик</b> — какой захотите. Значки общие: оба игрока могут ставить и то, и другое. Выберите значок кнопкой под полем и нажмите на клетку.</li>
      <li><b>Порядок побеждает</b>, как только где-нибудь появятся <b>пять одинаковых значков подряд</b> — по горизонтали, вертикали или диагонали. Неважно, кто их поставил.</li>
      <li><b>Хаос побеждает</b>, если пятёрке больше негде сложиться (или поле заполнилось). Игра заканчивается сразу, как только это стало ясно.</li>
    </ol>
    <p><b>Очки:</b> победитель получает 5 очков плюс по очку за каждую пустую клетку. После каждой партии стороны меняются — играйте матч и считайте очки.</p>
    <p><b>Самоцветы</b> (включаются в настройках): у каждой стороны есть один особый значок на партию. Двойной ⊗ Порядка считается и крестиком, и ноликом. Пустышка ■ Хаоса не считается ничем: линия через неё уже не сложится.</p>`,
  'oac.h.tips': 'Хитрости',
  'oac.tips': `
    <ul>
      <li><b>Хаосу:</b> лучшая защита — поставить в линию <i>другой</i> значок. Четыре крестика и нолик — линия мертва навсегда.</li>
      <li><b>Хаосу:</b> берегитесь клеток, которые нужны Порядку сразу и для крестиков, и для ноликов: туда не поставить ничего безопасного.</li>
      <li><b>Порядку:</b> стройте сразу <b>две угрозы</b>. Хаос закрывает одну клетку за ход — вторая достанется вам.</li>
      <li><b>Порядку:</b> в ряду из шести клеток пятёрок помещается две. Центральные четыре клетки работают на обе — цельтесь в середину.</li>
      <li>Свои же значки работают против вас: старый крестик Порядка может перекрыть его новую линию из ноликов.</li>
    </ul>
    <p class="tip"><b>Самоцветы</b> выравнивают силы: если один игрок заметно сильнее, договоритесь, что свой самоцвет использует только слабый. Двойной сильнее всего там, где пересекаются линия крестиков и линия ноликов.</p>
    <p class="tip">Новички обычно считают, что у Хаоса преимущество. Опытные игроки чаще ставят на Порядок. Проверьте сами — сыграйте за обе стороны.</p>`,
  'oac.h.origin': 'Откуда игра',
  'oac.origin': `
    <p>Игру придумал Стивен Снидерман и опубликовал в журнале <i>Games</i> в 1981 году. Это родственник крестиков-ноликов и гомоку, только с перекосом: у игроков разные цели, но общий набор значков.</p>
    <p>Бен Орлин советует играть серией партий, меняясь сторонами, и считать очки: чем раньше решилась партия, тем больше пустых клеток — и тем ценнее победа. Вариант с «самоцветами» предложил Энди Джуэлл.</p>`,
});

addStrings('en', {
  'oac.title': 'Order and Chaos',
  'oac.tagline': 'one builds a five-in-a-row, the other wrecks it — and both share the X’s and O’s',
  'oac.mode': 'Play:',
  'oac.mode.pvp': 'two players',
  'oac.mode.easy': 'vs computer (easy)',
  'oac.mode.normal': 'vs computer (normal)',
  'oac.mode.hard': 'vs computer (strong)',
  'oac.first': 'Order in game 1:',
  'oac.jewels': 'Jewels:',
  'oac.jewels.off': 'off',
  'oac.jewels.on': 'one per side',
  'oac.settings.note': 'Sides swap every game and points add up. Changing settings starts a new match.',
  'oac.again': 'next game',
  'oac.p0': 'Blue',
  'oac.p1': 'Red',
  'oac.cpu': 'Computer',
  'oac.role0': 'Order',
  'oac.role1': 'Chaos',
  'oac.pts': ['point', 'points'],
  'oac.turn': '{name} to move — {role}',
  'oac.thinking': '{name} is thinking…',
  'oac.turn.you': 'Your move — {role}',
  'oac.turn.them': '{name} is moving…',
  'oac.online.wait': 'Waiting for the other player…',
  'oac.online.note': 'You’re playing online: the room creator starts new games and picks the settings.',
  'oac.online.waitnew': '{name} will set up the next game',
  'oac.win': '{name} wins!',
  'oac.why.order': 'Five in a row — Order scores +{pts}',
  'oac.why.chaos': 'No five can form now — Chaos scores +{pts}',
  'oac.next': 'Next: {name} plays Order',
  'oac.sym.W': 'double',
  'oac.sym.B': 'blank',
  'oac.say.threat': ['Almost!', 'One more…', 'Feel it?', 'Building!'],
  'oac.say.fork': ['Can’t block both!', 'A fork!', 'Gotcha!'],
  'oac.say.block': ['Nope!', 'Stop right there!', 'Not today', 'Heh'],
  'oac.say.worried': ['Uh-oh', 'Hmm…', 'Risky…'],
  'oac.say.sad': ['Ugh…', 'Oh no', 'My line…'],
  'oac.say.jewelW': ['A jewel!', 'Both at once!'],
  'oac.say.jewelB': ['Neither one!', 'A jewel!'],
  'oac.say.oops': ['Thanks for the help!', 'Your own mark!'],
  'oac.say.win': ['Order!', 'Hooray!', 'Five!'],
  'oac.say.winChaos': ['Chaos!', 'Hooray!', 'All scrambled!'],
  'oac.say.lose': ['Rematch?', 'Let’s swap!', 'Whatever'],
  'oac.h.how': 'How to play',
  'oac.how': `
    <p><b>You need:</b> two players and a 6 × 6 grid.</p>
    <p>One player is <b>Order</b>, the other is <b>Chaos</b>. Order moves first.</p>
    <ol>
      <li>On your turn, put an <b>X or an O</b> — your choice — in any empty square. The symbols belong to nobody: both players may use both. Pick a symbol with the buttons under the board, then tap a square.</li>
      <li><b>Order wins</b> the moment there are <b>five identical symbols in a row</b> anywhere — across, down or diagonally. It doesn’t matter who placed them.</li>
      <li><b>Chaos wins</b> once no five-in-a-row can possibly form (or the grid fills up). The game ends as soon as that’s certain.</li>
    </ol>
    <p><b>Scoring:</b> the winner gets 5 points plus 1 per empty square. Sides swap after every game — play a match and keep score.</p>
    <p><b>Jewels</b> (turn them on in settings): each side gets one special mark per game. Order’s double ⊗ counts as both an X and an O. Chaos’s blank ■ counts as neither, so no five can ever run through it.</p>`,
  'oac.h.tips': 'Tricks',
  'oac.tips': `
    <ul>
      <li><b>Chaos:</b> the best defence is the <i>other</i> symbol. Four X’s and an O — that line is dead forever.</li>
      <li><b>Chaos:</b> beware squares that Order needs for both an X-line and an O-line: nothing you put there is safe.</li>
      <li><b>Order:</b> make <b>two threats at once</b>. Chaos can only plug one square per turn.</li>
      <li><b>Order:</b> a row of six holds two fives. The middle four squares serve both — aim for the centre.</li>
      <li>Your own marks can turn on you: an old X of Order’s may block its new line of O’s.</li>
    </ul>
    <p class="tip"><b>Jewels</b> can even out a lopsided match: if one player is clearly stronger, agree that only the weaker one uses their jewel. The double is strongest where a line of X’s crosses a line of O’s.</p>
    <p class="tip">Beginners usually think Chaos has the edge. Experienced players tend to favour Order. See for yourself — play both sides.</p>`,
  'oac.h.origin': 'Where it comes from',
  'oac.origin': `
    <p>Stephen Sniderman invented the game and published it in <i>Games</i> magazine in 1981. It’s a cousin of tic-tac-toe and gomoku with a twist: the players want opposite things but share one set of symbols.</p>
    <p>Ben Orlin suggests playing a series of games, swapping sides, and keeping score: the earlier a game is decided, the more empty squares remain — and the bigger the win. The “jewels” variant comes from Andy Juell.</p>`,
});
