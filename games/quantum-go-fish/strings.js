import { addStrings } from '../../shared/i18n.js';

// Indexed names (t() would pick a random entry from an array): qgf.p0, qgf.p1, …
const list = (key, arr) => Object.fromEntries(arr.map((v, i) => [key + i, v]));

addStrings('ru', {
  'qgf.title': 'Квантовая рыбалка',
  'qgf.tagline': 'карты, у которых нет масти, пока кто-нибудь о ней не спросит',
  'qgf.np': 'Игроков:',
  'qgf.humans': 'Из них людей:',
  'qgf.humans.1': '1 — я и компьютеры',
  'qgf.humans.k': '{k}',
  'qgf.humans.all': '{k} — все люди',
  'qgf.level': 'Компьютер:',
  'qgf.level.easy': 'простой',
  'qgf.level.normal': 'обычный',
  'qgf.hints': 'Подсказки:',
  'qgf.hints.on': 'показывать выводы',
  'qgf.hints.off': 'только факты',
  'qgf.names': 'Имена:',
  'qgf.again': 'ещё раз!',
  ...list('qgf.p', ['Синий', 'Красный', 'Зелёный', 'Оранжевый', 'Сиреневый', 'Розовый', 'Бурый', 'Оливковый']),
  ...list('qgf.cpu', ['Бип', 'Буп', 'Зип', 'Пик', 'Тук', 'Дзинь', 'Вжух', 'Хрум']),
  ...list('qgf.suit', ['Караси', 'Носки', 'Кактусы', 'Мухоморы', 'Луны', 'Улитки', 'Зонтики', 'Короны']),
  'qgf.suit.new': 'новая масть',
  'qgf.cards': ['карта', 'карты', 'карт'],
  'qgf.not': 'нет:',
  'qgf.st.you': 'Ваш ход: кого и о чём спросить?',
  'qgf.st.ask': '{name}: кого и о чём спросить?',
  'qgf.st.suit': 'Теперь выберите масть',
  'qgf.st.who': 'Теперь нажмите на того, кого спросить',
  'qgf.st.answer': '{name}, ваш ответ?',
  'qgf.st.answer.you': 'Ваш ответ?',
  'qgf.st.thinking': '{name} думает…',
  'qgf.st.remote': 'Ходит {name}…',
  'qgf.st.wait': 'Нет связи с создателем комнаты — ждём…',
  'qgf.st.join': 'Подключаемся к комнате…',
  'qgf.st.paused': '{name} собирает игроков — скоро начнём',
  'qgf.st.paused.host': 'Когда все соберутся, нажмите «играем!»',
  'qgf.st.away': '{name}: нет связи. Ждём, а потом за этого игрока сыграет компьютер',
  'qgf.st.watch': 'Свободных мест нет — вы смотрите. Место найдётся, как только освободится или в следующей партии',
  'qgf.off': 'нет связи',
  'qgf.q': '«{target}, есть {suit}?»',
  'qgf.asks': '{name} спрашивает:',
  'qgf.yes': 'да, отдать',
  'qgf.no': 'нет',
  'qgf.forced': 'нельзя — парадокс',
  'qgf.log.yes': 'да',
  'qgf.log.no': 'нет',
  'qgf.newsuit': 'Новая масть: {suit}!',
  'qgf.win': 'Побеждает {name}!',
  'qgf.win.four': 'Все четыре карты масти «{suit}» — точно у победителя',
  'qgf.win.all': 'Все руки вычислены до последней карты',
  'qgf.draw': 'Ничья',
  'qgf.draw.why': 'Три круга подряд без единого нового факта',
  'qgf.online.note': 'По сети каждый играет со своего устройства. За свободные места играет компьютер; кто подключится посреди партии, сразу садится на место компьютера. Если у игрока пропадёт связь, его место ждёт {s} с, потом за него играет компьютер; вернувшись по той же ссылке, игрок снова садится на своё место. Число игроков и новую партию выбирает создатель комнаты.',
  'qgf.online.waitnew': 'Новую партию начнёт {name}',
  'qgf.say.ask': ['{name}, есть {suit}?', '{name}, а {suit} есть?', 'Эй, {name}, {suit} есть?'],
  'qgf.say.yes': ['Да, держи', 'Есть, бери', 'Ладно, держи'],
  'qgf.say.forced': ['Пришлось отдать…', 'Эх, держи', 'Деваться некуда'],
  'qgf.say.no': ['Нет!', 'Ни одной', 'Не-а', 'Пусто!'],
  'qgf.say.got': ['Спасибо!', 'Ага!', 'Моё!'],
  'qgf.say.hmm': ['Хм…', 'Так-так', 'Запомню'],
  'qgf.say.win4': ['Все четыре — {suit}!', 'Четвёрка!', 'Собрано!'],
  'qgf.say.winAll': ['Я знаю все карты!', 'Всё ясно!', 'Сошлось!'],
  'qgf.say.lose': ['Эх…', 'Реванш?', 'Как так?', 'Ну и ладно'],
  'qgf.say.draw': ['Ну и ну', 'Кружимся…'],
  'qgf.say.hi': ['Привет! Я с вами', 'Я в игре!', 'Всем привет!'],
  'qgf.say.cpu': ['Подменяю!', 'Бип-буп, играю здесь', 'Пока посижу тут'],
  'qgf.h.how': 'Как играть',
  'qgf.how': `
    <p><b>Что нужно:</b> от трёх до восьми игроков. У каждого 4 карты, а мастей столько же, сколько игроков, — по 4 карты в каждой. Только вот <i>никто не знает</i>, какой масти его карты. Даже он сам. Масть появляется, когда о ней заходит речь.</p>
    <p><b>Цель:</b> в конце своего хода (а) доказать, что у вас четыре карты одной масти, или (б) суметь назвать все карты у всех игроков.</p>
    <ol>
      <li><b>Ход:</b> нажмите на другого игрока и выберите масть — так вы спрашиваете: «А у тебя есть носки?» (порядок нажатий любой).</li>
      <li><b>Спросить можно только о масти, которая есть у вас.</b> Поэтому вопрос сам по себе превращает одну вашу «?»-карту в карту этой масти. Кто первым заговорил о новой масти, тот её и «придумал» — здесь у неё появится смешное имя.</li>
      <li><b>Ответ:</b> «да» — отдать спросившему ровно одну карту этой масти; «нет» — значит, ни одна из ваших «?»-карт не этой масти.</li>
      <li><b>Парадоксы запрещены.</b> В каждой масти ровно 4 карты, и игра не даст ответить или спросить так, чтобы это стало невозможным. Поэтому иногда ответ вынужден: если у вас уже точно есть носок, а вас спрашивают о носках, — придётся отдать.</li>
      <li>После каждого ответа игра проверяет, не выиграл ли спрашивающий. Если три круга подряд никто ничего нового не узнал — ничья.</li>
    </ol>
    <p class="tip"><b>Как читать стол.</b> Карта с картинкой — масть уже известна. «?» — пока загадка. Пунктирная карта — масть не названа, но её можно вывести (видно с подсказками). Зачёркнутые значки — масти, которых среди «?»-карт игрока быть не может.</p>`,
  'qgf.h.tips': 'Хитрости',
  'qgf.tips': `
    <ul>
      <li>Считайте до четырёх. В каждой масти ровно 4 карты: если три уже нашлись у других, а остальные игроки сказали «нет», последняя обязана быть у вас.</li>
      <li>Перед ответом «нет» проверьте, не отдаёт ли он спрашивающему победу: ваше «нет» может загнать все карты масти в его руку.</li>
      <li>«Да» тоже опасно: каждая отданная карта приближает соперника к четвёрке.</li>
      <li>Задавайте вопросы, на которые любой ответ вам выгоден: «да» — получаете карту, «нет» — сужаете круг подозреваемых.</li>
      <li>Попробуйте сыграть с выключенными подсказками: так вся бухгалтерия у вас в голове — это и есть настоящая игра.</li>
    </ul>
    <p class="tip"><b>Варианты.</b> <i>Строгий:</i> парадоксальный ответ не запрещён, но кто его дал — проигрывает. <i>Игра до пустых рук:</i> собранную четвёрку откладывают («опускают четыре пальца»), а побеждает тот, у кого карт не осталось. <i>Без стартовой четвёрки:</i> договоритесь, что ни у кого в начале не было четырёх карт одной масти. <i>Слепой квартет</i> (голландская вариация): спрашивают не масть, а конкретную карту внутри масти — «Из птиц: есть пингвин?».</p>
    <p class="tip"><b>Без телефона.</b> Карты не нужны: каждый поднимает четыре пальца. Удобно вести учёт скрепками и бумажками с номерами мастей: известную карту «прикрепляйте» к листку её масти, а масть, которой у вас быть не может, переворачивайте.</p>`,
  'qgf.h.origin': 'Откуда игра',
  'qgf.origin': `
    <p>Это фольклор математиков. Игра годами передавалась из рук в руки среди аспирантов: Бен Орлин пересказывает версию Антона Геращенко, который научился ей на матфаке в Беркли. Самая ранняя известная запись — письмо 2002 года Дилана Тёрстона и Чжун-цзе Шаня, где игра называлась «Квантовые пальцы»: собранную четвёрку там откладывали, а побеждал тот, кто избавился от всех карт.</p>
    <p>«Квантовая» она потому, что масть карты, как свойство частицы в квантовой механике, не определена, пока её не «измерят» вопросом. Здесь нет спрятанной информации: все видят одно и то же — и всё равно это одна из самых головоломных игр в книге. Обычная «рыбалка» (Go Fish) — детская карточная игра, где тоже выпрашивают карты нужной масти.</p>`,
});

addStrings('en', {
  'qgf.title': 'Quantum Go Fish',
  'qgf.tagline': 'cards that have no suit until somebody asks about it',
  'qgf.np': 'Players:',
  'qgf.humans': 'Humans:',
  'qgf.humans.1': '1 — me vs computers',
  'qgf.humans.k': '{k}',
  'qgf.humans.all': '{k} — everyone',
  'qgf.level': 'Computer:',
  'qgf.level.easy': 'easy',
  'qgf.level.normal': 'normal',
  'qgf.hints': 'Hints:',
  'qgf.hints.on': 'show deductions',
  'qgf.hints.off': 'facts only',
  'qgf.names': 'Names:',
  'qgf.again': 'again!',
  ...list('qgf.p', ['Blue', 'Red', 'Green', 'Orange', 'Lilac', 'Pink', 'Brown', 'Olive']),
  ...list('qgf.cpu', ['Beep', 'Boop', 'Zip', 'Pip', 'Tock', 'Ding', 'Whizz', 'Crunch']),
  ...list('qgf.suit', ['Goldfish', 'Socks', 'Cacti', 'Toadstools', 'Moons', 'Snails', 'Umbrellas', 'Crowns']),
  'qgf.suit.new': 'new suit',
  'qgf.cards': ['card', 'cards'],
  'qgf.not': 'no:',
  'qgf.st.you': 'Your turn: ask whom, and for what?',
  'qgf.st.ask': '{name}: ask whom, and for what?',
  'qgf.st.suit': 'Now pick a suit',
  'qgf.st.who': 'Now tap the player to ask',
  'qgf.st.answer': '{name}, your answer?',
  'qgf.st.answer.you': 'Your answer?',
  'qgf.st.thinking': '{name} is thinking…',
  'qgf.st.remote': '{name} is moving…',
  'qgf.st.wait': 'Lost the connection to the host — waiting…',
  'qgf.st.join': 'Joining the room…',
  'qgf.st.paused': '{name} is gathering players — starting soon',
  'qgf.st.paused.host': 'When everyone is in, tap “let’s play!”',
  'qgf.st.away': '{name} is offline. Waiting — then the computer takes this seat',
  'qgf.st.watch': 'No free seat — you’re watching. You’ll get one as soon as a seat frees up, or in the next game',
  'qgf.off': 'offline',
  'qgf.q': '“{target}, any {suit}?”',
  'qgf.asks': '{name} asks:',
  'qgf.yes': 'yes, hand one over',
  'qgf.no': 'no',
  'qgf.forced': 'not allowed — paradox',
  'qgf.log.yes': 'yes',
  'qgf.log.no': 'no',
  'qgf.newsuit': 'New suit: {suit}!',
  'qgf.win': '{name} wins!',
  'qgf.win.four': 'All four {suit} are provably in the winner’s hand',
  'qgf.win.all': 'Every hand is pinned down to the last card',
  'qgf.draw': 'A draw',
  'qgf.draw.why': 'Three rounds in a row without a single new fact',
  'qgf.online.note': 'Online, everyone plays on their own device. Free seats are played by the computer; whoever joins mid-game takes over a computer seat right away. If a player drops out, their seat waits {s} s, then the computer plays it; coming back through the same link puts them in their seat again. The room creator picks the number of players and starts new games.',
  'qgf.online.waitnew': '{name} will start the next game',
  'qgf.say.ask': ['{name}, any {suit}?', '{name}, got {suit}?', 'Hey {name}, any {suit}?'],
  'qgf.say.yes': ['Yes, here', 'Sure, take one', 'Fine, here'],
  'qgf.say.forced': ['Had to…', 'Ugh, take it', 'No way out'],
  'qgf.say.no': ['Nope!', 'None at all', 'Not one', 'Go fish!'],
  'qgf.say.got': ['Thanks!', 'Aha!', 'Mine!'],
  'qgf.say.hmm': ['Hmm…', 'I see', 'Noted'],
  'qgf.say.win4': ['All four {suit}!', 'Four of a kind!', 'Complete!'],
  'qgf.say.winAll': ['I know every card!', 'It all adds up!', 'Solved!'],
  'qgf.say.lose': ['Ugh…', 'Rematch?', 'How?!', 'Whatever'],
  'qgf.say.draw': ['Well, well', 'Round and round…'],
  'qgf.say.hi': ['Hi! I’m in', 'Count me in!', 'Hello, all!'],
  'qgf.say.cpu': ['Taking over!', 'Beep-boop, I’ll play here', 'Keeping this seat warm'],
  'qgf.h.how': 'How to play',
  'qgf.how': `
    <p><b>You need:</b> three to eight players. Everyone holds 4 cards, and there are as many suits as players — 4 cards in each. The catch: <i>nobody knows</i> what suit any card is. Not even its owner. A suit comes into being when someone mentions it.</p>
    <p><b>Goal:</b> at the end of your turn, either (a) prove you hold four cards of one suit, or (b) be able to name every card in every hand.</p>
    <ol>
      <li><b>Your turn:</b> tap another player and pick a suit — that’s you asking “Got any socks?” (tap in either order).</li>
      <li><b>You may only ask for a suit you have.</b> So the question itself turns one of your “?” cards into that suit. Whoever mentions a new suit first gets to “invent” it — here it receives a silly name.</li>
      <li><b>The answer:</b> “yes” — hand the asker exactly one card of that suit; “no” — none of your “?” cards is of that suit.</li>
      <li><b>No paradoxes.</b> Every suit has exactly 4 cards, and the game won’t let anyone ask or answer in a way that makes that impossible. So sometimes the answer is forced: if you surely hold a sock and someone asks for socks, you hand it over.</li>
      <li>After each answer the game checks whether the asker has won. If three rounds pass with nobody learning anything new, it’s a draw.</li>
    </ol>
    <p class="tip"><b>Reading the table.</b> A card with a picture has a known suit. “?” is still a mystery. A dashed card hasn’t been named but can be deduced (shown with hints on). Crossed-out icons are suits that none of the player’s “?” cards can be.</p>`,
  'qgf.h.tips': 'Tricks',
  'qgf.tips': `
    <ul>
      <li>Count to four. Each suit has exactly 4 cards: if three are already elsewhere and everyone else has said “no”, the last one has to be yours.</li>
      <li>Before saying “no”, check it doesn’t hand the asker the game — your “no” might force the whole suit into their hand.</li>
      <li>“Yes” is risky too: every card you give brings a rival closer to four of a kind.</li>
      <li>Ask questions where either answer helps you: “yes” gets you a card, “no” narrows down where the suit can hide.</li>
      <li>Try it with hints off: then all the bookkeeping lives in your head — which is the real game.</li>
    </ul>
    <p class="tip"><b>Variants.</b> <i>Cutthroat:</i> paradoxical answers aren’t blocked — whoever gives one loses. <i>Play to empty hands:</i> a completed four is laid down (“lower four fingers”), and you win by running out of cards. <i>No starting four:</i> agree that nobody began with four cards of one suit. <i>Blind Kwartet</i> (a Dutch twist): ask for a specific card within a suit — “From the Birds, got the Penguin?”</p>
    <p class="tip"><b>No phone needed.</b> No cards either: everyone raises four fingers. Paper clips and slips of paper numbered by suit make good bookkeeping — clip a known card to its suit’s slip, and flip over a suit you can’t have.</p>`,
  'qgf.h.origin': 'Where it comes from',
  'qgf.origin': `
    <p>It’s mathematicians’ folklore, passed around among grad students for years. Ben Orlin adapts the version Anton Geraschenko learned in the Berkeley math PhD program. The earliest known record is a 2002 email by Dylan Thurston and Chung-chieh Shan, where it was called “Quantum Fingers”: a completed four was laid down, and you won by getting rid of all your cards.</p>
    <p>It’s “quantum” because a card’s suit, like a property of a particle in quantum mechanics, isn’t settled until a question “measures” it. Nothing is hidden — everyone sees the same table — and still it’s one of the most mind-bending games in the book. Ordinary Go Fish is the children’s card game where you also beg for cards of a wanted kind.</p>`,
});
