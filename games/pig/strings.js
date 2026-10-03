import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'pig.title': 'Свинья',
  'pig.tagline': 'кости, азарт и вовремя сказанное «хватит»',
  'pig.players': 'Игроков:',
  'pig.dice': 'Кости:',
  'pig.dice.2': 'две (как в книге)',
  'pig.dice.1': 'одна (попроще)',
  'pig.mode': 'Играем:',
  'pig.mode.pvp': 'друг с другом',
  'pig.mode.easy': 'с компьютером (простой)',
  'pig.mode.normal': 'с компьютером (обычный)',
  'pig.mode.hard': 'с компьютером (точный расчёт)',
  'pig.mode.note': 'Если игроков больше двух, за всех, кроме первого, играет компьютер.',
  'pig.again': 'ещё раз!',
  'pig.roll': 'бросить',
  'pig.hold': 'в копилку',
  'pig.hold.n': 'в копилку +{k}',
  'pig.name0': 'Синий',
  'pig.name1': 'Красный',
  'pig.name2': 'Зелёный',
  'pig.name3': 'Оранжевый',
  'pig.name4': 'Фиолетовый',
  'pig.name5': 'Розовый',
  'pig.name6': 'Коричневый',
  'pig.name7': 'Серый',
  'pig.cpu': 'Компьютер',
  'pig.cpu.n': 'Компьютер {n}',
  'pig.pts': ['очко', 'очка', 'очков'],
  'pig.turnpts': 'за ход: {k}',
  'pig.turnzero': 'за ход: 0',
  'pig.r.plain': '+{g}',
  'pig.r.double': 'дубль! +{g}',
  'pig.r.snake': 'две единицы! +25',
  'pig.r.bust': 'единица — сгорело {k}',
  'pig.r.bust0': 'единица — ход окончен',
  'pig.r.hold': '{name}: +{k} в копилку',
  'pig.turn': '{name}: бросай или копи',
  'pig.turn.start': 'Бросает {name}',
  'pig.thinking': '{name} бросает…',
  'pig.turn.you': 'Ваш ход: бросайте или копите',
  'pig.turn.youstart': 'Ваш ход — бросайте!',
  'pig.turn.them': 'Ходит {name}…',
  'pig.online.wait': 'Ждём второго игрока…',
  'pig.online.note': 'Сейчас идёт игра по сети (вдвоём): новую партию начинает и правила выбирает создатель комнаты.',
  'pig.online.waitnew': 'Ждём, пока {name} её запустит',
  'pig.win': 'Побеждает {name}!',
  'pig.next': 'Следующую партию начинает {name}',
  'pig.say.double': ['Дубль!', 'Вдвойне!', 'Ого!'],
  'pig.say.snake': ['Змеиные глаза!', '25!', 'Джекпот!'],
  'pig.say.bust': ['Хрю…', 'Эх!', 'Ну вот…', 'Всё сгорело', 'Жадность…'],
  'pig.say.bustbig': ['Не-е-ет!', 'Столько очков…', 'Надо было остановиться'],
  'pig.say.gloat': ['Ха!', 'Бывает', 'Хрю-хрю!', 'Не повезло'],
  'pig.say.greedy': ['Ещё разок…', 'Я в ударе', 'Рискну!'],
  'pig.say.stop': ['Остановись!', 'Хватит уже', 'Сгоришь!'],
  'pig.say.bank': ['В копилку!', 'Хватит с меня', 'Надёжно'],
  'pig.say.bankbig': ['Отличный ход!', 'Вот это улов', 'Ну как вам?'],
  'pig.say.worry': ['Ой-ой', 'Догоняй…', 'Хм…'],
  'pig.say.win': ['Сотня!', 'Победа!', 'Ура!'],
  'pig.say.lose': ['Реванш?', 'Повезло же…', 'Ну и ладно'],
  'pig.h.how': 'Как играть',
  'pig.how': `
    <p><b>Что нужно:</b> две кости и от двух до восьми игроков. <b>Цель:</b> первым набрать <b>100 очков</b>.</p>
    <ol>
      <li>В свой ход бросайте кости <b>сколько угодно раз</b>. Каждый бросок прибавляется к очкам этого хода:
        <ul>
          <li>обычный бросок — сумма костей (3 и 5 → 8);</li>
          <li><b>дубль</b> — сумма вдвойне (4 и 4 → 16);</li>
          <li><b>две единицы</b> — сразу 25;</li>
          <li><b>одна единица</b> (1 и что-то другое) — всё набранное за ход <b>сгорает</b>, ход переходит дальше.</li>
        </ul>
      </li>
      <li>В любой момент после броска можно сказать «хватит» — кнопка <b>«в копилку»</b>: очки хода навсегда добавляются к вашему счёту, и ход переходит.</li>
      <li>Очки из копилки не сгорают никогда. Как только копилка вместе с очками хода доходит до 100 — вы победили.</li>
    </ol>
    <p>Можно нажимать на сами кости — это тоже бросок.</p>`,
  'pig.h.tips': 'Хитрости',
  'pig.tips': `
    <ul>
      <li>Из 36 вариантов, как могут лечь две кости, ровно в 10 есть одна единица. Значит, каждый бросок сгорает примерно с шансом <b>28%</b>.</li>
      <li>Удачный бросок приносит в среднем около 10 очков, а с учётом неудачных — около 7,4 за бросок. Риск же — потерять всё, что набрано за ход. Пока на кону <b>26 очков или меньше</b>, бросать выгодно; с 27 и выше выгоднее копить. Это правило даёт <i>самый большой средний счёт за ход</i>.</li>
      <li>Но цель — не средний счёт, а победа. Отстаёте — рискуйте сильнее. Соперник подбирается к сотне — бросайте до упора: один его ход может всё решить.</li>
      <li>Ходить первым выгодно: при идеальной игре первый игрок побеждает примерно в 54% партий. Поэтому первый ход в новых партиях переходит по кругу.</li>
    </ul>
    <p class="tip"><b>Компьютер.</b> «Обычный» всегда копит с 27 очков. «Точный расчёт» знает вероятность победы в каждой позиции (мы заранее посчитали её для всех счетов) и выбирает ход, который её максимизирует.</p>
    <p class="tip"><b>Варианты.</b> С <b>одной костью</b> правила проще: единица сжигает ход, остальные грани идут в зачёт как есть; здесь копить выгодно примерно с 20 очков. Есть и школьный вариант: учитель бросает кости для всего класса, а каждый ученик после броска решает, остаться ли стоять (и рисковать дальше) или сесть и сохранить набранное. Побеждает тот, кто больше всех наберёт за пять раундов.</p>`,
  'pig.h.origin': 'Откуда игра',
  'pig.origin': `
    <p>«Свинья» — народная игра из большого семейства игр «рискни или остановись». В печати её одной из первых описал знаток азартных игр Джон Скарни в 1945 году, а вариантов с тех пор придумано множество: с одной костью, с двумя, с бонусами за дубли. Есть даже версия, где вместо костей бросают пластиковых поросят.</p>
    <p>Математики Тодд Неллер и Клифтон Прессер в 2004 году вычислили для классической «Свиньи» идеальную стратегию: оказалось, что она зависит не только от очков хода, но и от счёта обоих игроков — и временами выглядит очень неожиданно. Тот же приём мы применили к версии из книги для «точного» компьютера.</p>`,
});

addStrings('en', {
  'pig.title': 'Pig',
  'pig.tagline': 'dice, greed, and knowing when to say “enough”',
  'pig.players': 'Players:',
  'pig.dice': 'Dice:',
  'pig.dice.2': 'two (as in the book)',
  'pig.dice.1': 'one (simpler)',
  'pig.mode': 'Play:',
  'pig.mode.pvp': 'with friends',
  'pig.mode.easy': 'vs computer (easy)',
  'pig.mode.normal': 'vs computer (normal)',
  'pig.mode.hard': 'vs computer (exact math)',
  'pig.mode.note': 'With more than two players, the computer plays everyone except the first.',
  'pig.again': 'again!',
  'pig.roll': 'roll',
  'pig.hold': 'bank it',
  'pig.hold.n': 'bank +{k}',
  'pig.name0': 'Blue',
  'pig.name1': 'Red',
  'pig.name2': 'Green',
  'pig.name3': 'Orange',
  'pig.name4': 'Purple',
  'pig.name5': 'Pink',
  'pig.name6': 'Brown',
  'pig.name7': 'Grey',
  'pig.cpu': 'Computer',
  'pig.cpu.n': 'Computer {n}',
  'pig.pts': ['point', 'points'],
  'pig.turnpts': 'this turn: {k}',
  'pig.turnzero': 'this turn: 0',
  'pig.r.plain': '+{g}',
  'pig.r.double': 'doubles! +{g}',
  'pig.r.snake': 'snake eyes! +25',
  'pig.r.bust': 'a one — {k} lost',
  'pig.r.bust0': 'a one — turn over',
  'pig.r.hold': '{name} banks +{k}',
  'pig.turn': '{name}: roll or bank',
  'pig.turn.start': '{name} to roll',
  'pig.thinking': '{name} is rolling…',
  'pig.turn.you': 'Your turn: roll or bank',
  'pig.turn.youstart': 'Your turn — roll!',
  'pig.turn.them': '{name} is playing…',
  'pig.online.wait': 'Waiting for the other player…',
  'pig.online.note': 'You’re playing online (two players): the room creator starts new games and picks the rules.',
  'pig.online.waitnew': 'Waiting for {name} to start it',
  'pig.win': '{name} wins!',
  'pig.next': '{name} rolls first next game',
  'pig.say.double': ['Doubles!', 'Twice as nice!', 'Whoa!'],
  'pig.say.snake': ['Snake eyes!', '25!', 'Jackpot!'],
  'pig.say.bust': ['Oink…', 'Argh!', 'Oh well…', 'All gone', 'Greed…'],
  'pig.say.bustbig': ['Nooo!', 'All those points…', 'Should have stopped'],
  'pig.say.gloat': ['Ha!', 'Happens', 'Oink oink!', 'Tough luck'],
  'pig.say.greedy': ['One more…', 'I’m on a roll', 'Feeling lucky!'],
  'pig.say.stop': ['Stop!', 'That’s enough', 'You’ll bust!'],
  'pig.say.bank': ['Banked!', 'That’ll do', 'Safe and sound'],
  'pig.say.bankbig': ['Great turn!', 'What a haul', 'How about that?'],
  'pig.say.worry': ['Uh-oh', 'Catch up…', 'Hmm…'],
  'pig.say.win': ['A hundred!', 'Victory!', 'Hooray!'],
  'pig.say.lose': ['Rematch?', 'Lucky dice…', 'Whatever'],
  'pig.h.how': 'How to play',
  'pig.how': `
    <p><b>You need:</b> two dice and two to eight players. <b>Goal:</b> be the first to reach <b>100 points</b>.</p>
    <ol>
      <li>On your turn, roll the dice <b>as many times as you like</b>. Every roll adds to your turn total:
        <ul>
          <li>a plain roll scores the sum (3 and 5 → 8);</li>
          <li><b>doubles</b> score twice the sum (4 and 4 → 16);</li>
          <li><b>two ones</b> score 25 at once;</li>
          <li><b>a single one</b> (1 plus anything else) wipes out the turn total and the dice pass on.</li>
        </ul>
      </li>
      <li>After any roll you may stop — press <b>“bank it”</b>: the turn total is added to your score for good and the turn passes.</li>
      <li>Banked points are never lost. As soon as your bank plus this turn’s points reach 100, you win.</li>
    </ol>
    <p>You can also tap the dice themselves to roll.</p>`,
  'pig.h.tips': 'Tricks',
  'pig.tips': `
    <ul>
      <li>Of the 36 ways two dice can land, exactly 10 contain a single one. So every roll busts about <b>28%</b> of the time.</li>
      <li>A successful roll is worth about 10 points; counting the busts, a roll averages about 7.4. The risk is everything you’ve built up this turn. While <b>26 or fewer</b> points are at stake, rolling pays off; from 27 up, banking does. That rule gives the <i>highest average score per turn</i>.</li>
      <li>But the goal is winning, not averages. Behind? Take more risk. Opponent close to 100? Keep rolling — their next turn might end it.</li>
      <li>Going first is an edge: with perfect play the first player wins about 54% of games. That’s why the first roll rotates between games.</li>
    </ul>
    <p class="tip"><b>The computer.</b> “Normal” always banks at 27. “Exact math” knows the winning chances in every position (we precomputed them for every score) and picks whatever maximises them.</p>
    <p class="tip"><b>Variants.</b> With <b>one die</b> things are simpler: a one wipes the turn, any other face scores its value; here banking pays from about 20 points. There’s also a classroom version: the teacher rolls for the whole class, and after each roll every student decides whether to stay standing (and keep risking) or sit down and keep their points. Highest total after five rounds wins.</p>`,
  'pig.h.origin': 'Where it comes from',
  'pig.origin': `
    <p>Pig is a folk game from a big family of “push your luck” dice games. Gambling expert John Scarne was among the first to describe it in print, in 1945, and countless variants have appeared since: one die, two dice, bonuses for doubles. There’s even a commercial version where you toss little plastic pigs instead of dice.</p>
    <p>In 2004 mathematicians Todd Neller and Clifton Presser computed the perfect strategy for classic Pig. It depends not just on your turn total but on both players’ scores — and it sometimes looks surprisingly bold. We used the same method on the book’s version to build the “exact math” computer.</p>`,
});
