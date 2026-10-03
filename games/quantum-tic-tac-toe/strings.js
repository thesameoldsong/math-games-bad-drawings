import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'qtt.title': 'Квантовые крестики-нолики',
  'qtt.tagline': 'каждый ход — сразу в две клетки, пока мир не схлопнется',
  'qtt.mode': 'Играем:',
  'qtt.mode.pvp': 'вдвоём',
  'qtt.mode.easy': 'с компьютером (простой)',
  'qtt.mode.normal': 'с компьютером (обычный)',
  'qtt.mode.hard': 'с компьютером (сильный)',
  'qtt.rule': 'Петлю решает:',
  'qtt.rule.choose': 'соперник',
  'qtt.rule.coin': 'монетка',
  'qtt.again': 'ещё раз!',
  'qtt.p0': 'Синий',
  'qtt.p1': 'Красный',
  'qtt.cpu': 'Компьютер',
  'qtt.pts': ['очко', 'очка', 'очков'],
  'qtt.turn': 'Ходит {name} ({sym})',
  'qtt.turn.you': 'Ваш ход ({sym})',
  'qtt.turn.them': 'Ходит {name}…',
  'qtt.thinking': '{name} думает…',
  'qtt.hint.first': 'выберите первую клетку',
  'qtt.hint.second': 'теперь вторую клетку',
  'qtt.loop': 'Петля! Решает {name}',
  'qtt.loop.you': 'Петля! Решаете вы',
  'qtt.loop.hint': 'куда упадёт {mark}?',
  'qtt.loop.confirm': 'нажмите ещё раз, чтобы подтвердить',
  'qtt.loop.coin': 'Петля! Бросаем монетку…',
  'qtt.online.wait': 'Ждём второго игрока…',
  'qtt.online.note': 'Сейчас идёт игра по сети: новую партию начинает и правила выбирает создатель комнаты.',
  'qtt.online.waitnew': 'Новую партию начнёт {name}',
  'qtt.next': 'Следующую партию за X играет {name}',
  'qtt.win': 'Побеждает {name}!',
  'qtt.win.double': 'Побеждает {name} — сразу две линии!',
  'qtt.shared': 'Победа на двоих!',
  'qtt.shared.sub': 'Обе линии сложились в одном схлопывании',
  'qtt.draw': 'Ничья!',
  'say.loop': ['Петля!', 'Замкнулось!', 'Ой, круг'],
  'say.choose': ['Мой выбор!', 'Так-так…', 'Решаю я'],
  'say.good': ['То, что надо', 'Отлично!', 'Хе-хе', 'Моё!'],
  'say.bad': ['Эх…', 'Хм', 'Ну вот', 'Ой'],
  'say.allmine': ['Все мои!', 'Петля моя!', 'Без чужих!'],
  'say.coin': ['Монетка!', 'Орёл?', 'Как повезёт'],
  'say.win': ['Ура!', 'Победа!', 'Я гений'],
  'say.lose': ['Реванш?', 'Эх…', 'Не повезло'],
  'say.shared': ['Оба молодцы!', 'Вместе!', 'Делим!'],
  'say.draw': ['Мир!', 'Ничья', 'Ну и ладно'],
  'qtt.h.how': 'Как играть',
  'qtt.how': `
    <p><b>Что нужно:</b> двое, поле 3 × 3 и немного терпения. Синий и Красный по очереди играют за X — кто начинает, тот X.</p>
    <p><b>Цель:</b> как в обычных крестиках-ноликах — три <i>настоящих</i> своих знака в ряд.</p>
    <ol>
      <li><b>Ход — это пара клеток.</b> Нажмите одну свободную клетку, потом другую (не обязательно соседнюю). В обе встанет маленький «квантовый» знак с номером хода, и они окажутся связаны тонкой линией. Знак находится сразу в двух местах — куда он попадёт, решится потом.</li>
      <li><b>Петля.</b> Когда связи замыкаются в кольцо (клетка → клетка → … → снова первая; хватит и двух знаков в одной паре клеток), мир «схлопывается». Последний поставленный знак займёт одну из двух своих клеток, выгонит из неё остальные квантовые знаки в их вторые клетки, те выгонят следующих — и вся петля вместе со всем, что к ней прицеплено, превратится в обычные большие X и O.</li>
      <li><b>Кто выбирает.</b> Из двух вариантов схлопывания выбирает тот, кто петлю <i>не</i> замыкал. Подсказка покажет, куда что упадёт. Потом этот же игрок делает свой обычный ход.</li>
      <li>В клетку с большим знаком больше ничего ставить нельзя. Три больших своих знака в ряд — победа.</li>
      <li>Если после одного схлопывания линии появились у обоих — <b>победили оба</b>. Если заняты восемь клеток, а линии нет — <b>ничья</b>.</li>
    </ol>
    <p class="hand">Счёт ведётся по партиям: победа — очко, две линии сразу — два. Роли X и O меняются каждую партию.</p>`,
  'qtt.h.tips': 'Хитрости',
  'qtt.tips': `
    <ul>
      <li>Замыкать петлю обычно рискованно: выбор схлопывания достаётся сопернику, и он выберет то, что выгодно ему.</li>
      <li>Но петля <b>только из своих знаков</b> безопасна: как ни схлопывай, все её клетки станут вашими. Угроза такой короткой петли часто вынуждает соперника замкнуть её самому — и тогда выбор у вас.</li>
      <li>Перед ходом посмотрите, какие пары клеток уже связаны: ход в две связанные клетки сразу запускает схлопывание.</li>
      <li>У X, как и в обычной игре, заметное преимущество — поэтому роли меняются каждую партию.</li>
    </ul>
    <p class="tip"><b>Варианты.</b> <i>Монетка:</i> схлопывание решает не соперник, а случай — включается в настройках. <i>Много миров:</i> при каждой петле игра раздваивается и продолжается на обеих досках сразу; побеждает тот, кто выиграл в большем числе «вселенных» (ранние победы ценнее). <i>Турнир:</i> поле 4 × 4, играют до заполнения, каждая тройка в ряд — очко.</p>`,
  'qtt.h.origin': 'Откуда игра',
  'qtt.origin': `
    <p>Игру придумал программист Аллан Гофф и описал её в 2002 году в статье вместе с соавторами. По его словам, на сами правила ушло около получаса — и ощущалось это скорее как открытие, чем как изобретение.</p>
    <p>Задумывалась она как наглядное пособие по квантовой механике. Знак в двух клетках сразу — это <i>суперпозиция</i>; связанные клетки — <i>запутанность</i>: узнав, что в одной клетке X, вы мгновенно знаете, что во второй его нет. А схлопывание петли напоминает <i>измерение</i>, после которого остаётся одна определённая реальность. К концу партии квантовость исчезает и на поле обычные X и O — так и большие предметы вокруг нас выглядят вполне «классическими».</p>`,
});

addStrings('en', {
  'qtt.title': 'Quantum Tic-Tac-Toe',
  'qtt.tagline': 'every move lands in two squares — until the world collapses',
  'qtt.mode': 'Play:',
  'qtt.mode.pvp': 'two players',
  'qtt.mode.easy': 'vs computer (easy)',
  'qtt.mode.normal': 'vs computer (normal)',
  'qtt.mode.hard': 'vs computer (strong)',
  'qtt.rule': 'Loops decided by:',
  'qtt.rule.choose': 'opponent',
  'qtt.rule.coin': 'coin flip',
  'qtt.again': 'again!',
  'qtt.p0': 'Blue',
  'qtt.p1': 'Red',
  'qtt.cpu': 'Computer',
  'qtt.pts': ['point', 'points'],
  'qtt.turn': '{name} to move ({sym})',
  'qtt.turn.you': 'Your move ({sym})',
  'qtt.turn.them': '{name} is moving…',
  'qtt.thinking': '{name} is thinking…',
  'qtt.hint.first': 'pick the first square',
  'qtt.hint.second': 'now the second square',
  'qtt.loop': 'A loop! {name} decides',
  'qtt.loop.you': 'A loop! You decide',
  'qtt.loop.hint': 'where does {mark} land?',
  'qtt.loop.confirm': 'tap again to confirm',
  'qtt.loop.coin': 'A loop! Flipping a coin…',
  'qtt.online.wait': 'Waiting for the other player…',
  'qtt.online.note': 'You’re playing online: the room creator starts new games and picks the rules.',
  'qtt.online.waitnew': '{name} will start the next game',
  'qtt.next': 'Next game {name} plays X',
  'qtt.win': '{name} wins!',
  'qtt.win.double': '{name} wins — two lines at once!',
  'qtt.shared': 'A shared victory!',
  'qtt.shared.sub': 'Both lines appeared in the same collapse',
  'qtt.draw': 'A draw!',
  'say.loop': ['A loop!', 'Closed it!', 'Uh-oh'],
  'say.choose': ['My call!', 'Let me see…', 'I decide'],
  'say.good': ['Just right', 'Nice!', 'Heh', 'Mine!'],
  'say.bad': ['Ugh…', 'Hmm', 'Oh no', 'Oops'],
  'say.allmine': ['All mine!', 'My loop!', 'No strangers'],
  'say.coin': ['Coin flip!', 'Heads?', 'Lucky me?'],
  'say.win': ['Hooray!', 'Victory!', 'Quantum genius'],
  'say.lose': ['Rematch?', 'Next time…', 'Unlucky'],
  'say.shared': ['We both win!', 'Together!', 'Let’s share'],
  'say.draw': ['Peace!', 'A draw', 'Fair enough'],
  'qtt.h.how': 'How to play',
  'qtt.how': `
    <p><b>You need:</b> two players, a 3 × 3 grid and some patience. Blue and Red take turns being X — whoever starts plays X.</p>
    <p><b>Goal:</b> just like ordinary tic-tac-toe — three <i>real</i> marks of yours in a row.</p>
    <ol>
      <li><b>A move is a pair of squares.</b> Tap one free square, then another (they don’t have to touch). Both get a small “quantum” mark numbered by the move, joined by a thin line. The mark is in two places at once — where it really ends up is decided later.</li>
      <li><b>Loops.</b> When the links close into a ring (square → square → … → back to the first; two marks on the same pair of squares count), the world “collapses”. The newest mark settles into one of its two squares and pushes the other quantum marks there into their other squares, which push the next ones — the whole loop, plus anything hanging off it, turns into ordinary big X’s and O’s.</li>
      <li><b>Who chooses.</b> Of the two ways the collapse can go, the player who did <i>not</i> close the loop picks one. A preview shows where everything lands. Then that same player makes their normal move.</li>
      <li>Squares with a big mark are final — nothing more goes there. Three big marks of yours in a row wins.</li>
      <li>If one collapse gives <b>both</b> players a line, you both win. If eight squares are filled and nobody has a line, it’s a <b>draw</b>.</li>
    </ol>
    <p class="hand">The score is kept across games: a win is one point, two lines at once is two. X and O swap every game.</p>`,
  'qtt.h.tips': 'Tricks',
  'qtt.tips': `
    <ul>
      <li>Closing a loop is usually risky: your opponent gets to choose how it collapses, and they’ll pick what suits them.</li>
      <li>But a loop made <b>only of your own marks</b> is safe: however it collapses, every square in it becomes yours. The threat of such a short loop often makes your opponent close it first — handing the choice to you.</li>
      <li>Before moving, check which squares are already linked: playing into two linked squares sets off a collapse at once.</li>
      <li>X has a real edge, as in the classic game — that’s why the roles swap every game.</li>
    </ul>
    <p class="tip"><b>Variants.</b> <i>Coin flip:</i> chance, not your opponent, decides each collapse — switch it on in settings. <i>Many worlds:</i> every loop splits the game and you keep playing on both boards; whoever wins in more “universes” wins (early wins count for more). <i>Tournament:</i> a 4 × 4 grid played until full, every three-in-a-row scores a point.</p>`,
  'qtt.h.origin': 'Where it comes from',
  'qtt.origin': `
    <p>The game was invented by software engineer Allan Goff, who described it in a 2002 paper with co-authors. He said the rules took only about half an hour to work out — and it felt more like a discovery than an invention.</p>
    <p>It was meant as a hands-on model of quantum mechanics. A mark in two squares at once is <i>superposition</i>; linked squares are <i>entanglement</i>: learn that one holds the X and you instantly know the other doesn’t. Collapsing a loop is like a <i>measurement</i> that leaves a single definite reality. By the end of a game the quantum weirdness is gone and only ordinary X’s and O’s remain — much like the big everyday objects around us look perfectly “classical”.</p>`,
});
