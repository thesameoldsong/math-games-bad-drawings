import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'rps.title': 'Камень, ножницы, бумага, ящерица, Спок',
  'rps.tagline': 'старая считалка, в которой ничьих стало меньше',
  'rps.mode': 'Играем:',
  'rps.mode.pvp': 'вдвоём',
  'rps.mode.easy': 'с компьютером (простой)',
  'rps.mode.normal': 'с компьютером (обычный)',
  'rps.mode.hard': 'с компьютером (сыщик)',
  'rps.set': 'Жесты:',
  'rps.set.5': 'все пять',
  'rps.set.3': 'три, как в классике',
  'rps.target': 'Матч до:',
  'rps.wins.gen': ['победы', 'побед', 'побед'],
  'rps.again': 'ещё матч!',
  'rps.p0': 'Синий',
  'rps.p1': 'Красный',
  'rps.cpu': 'Компьютер',
  'rps.wins': ['победа', 'победы', 'побед'],
  'rps.round': 'Раунд {n}',
  'rps.upto': 'до {n}',
  'rps.ready': 'жест выбран!',
  'rps.vs': 'vs',
  'rps.count.0': 'Раз…',
  'rps.count.1': 'Два…',
  'rps.count.2': 'Три!',
  'rps.pick': '{name}, ваш жест',
  'rps.pick.you': 'Выберите жест',
  'rps.pick.wait': 'Ждём жест соперника…',
  'rps.pick.cpu': 'Выберите жест — компьютер уже загадал свой',
  'rps.cover.title': 'Очередь: {name}',
  'rps.cover.note': 'Соперник, не подглядывай!',
  'rps.cover.btn': 'Это я — показать',
  'rps.cover.status': 'Передайте устройство: {name}',
  'rps.tie': 'Ничья — переигрываем',
  'rps.online.wait': 'Ждём второго игрока…',
  'rps.online.note': 'Сейчас идёт игра по сети: новый матч начинает и правила выбирает создатель комнаты.',
  'rps.online.waitnew': 'Новый матч начнёт {name}',
  'rps.win': 'Побеждает {name}! {a} : {b}',
  'g.scissors': 'ножницы',
  'g.paper': 'бумага',
  'g.rock': 'камень',
  'g.lizard': 'ящерица',
  'g.spock': 'Спок',
  // verb phrases: winner + verb + loser
  'v.cut': 'Ножницы режут бумагу',
  'v.cover': 'Бумага заворачивает камень',
  'v.crush': 'Камень давит ящерицу',
  'v.poison': 'Ящерица кусает Спока',
  'v.smash': 'Спок ломает ножницы',
  'v.behead': 'Ножницы стригут ящерицу',
  'v.eat': 'Ящерица жуёт бумагу',
  'v.disprove': 'Бумага опровергает Спока',
  'v.vaporize': 'Спок испаряет камень',
  'v.blunt': 'Камень тупит ножницы',
  'rps.say.win': ['Ха!', 'Есть!', 'В точку!', 'Как по нотам', 'Очко!'],
  'rps.say.lose': ['Ой', 'Эх…', 'Как?!', 'Хм', 'Ну вот'],
  'rps.say.tie': ['Опять одинаково!', 'Читаешь мысли?', 'Снова!', 'Ещё раз!'],
  'rps.say.streak': ['Я тебя вижу насквозь', 'Тебя легко прочитать', 'Третий раз подряд!'],
  'rps.say.matchpoint': ['Ещё одна — и всё', 'Почти моя!'],
  'rps.say.worried': ['Надо собраться…', 'Только не сейчас', 'Думай, думай…'],
  'rps.say.spock': ['Логично.', 'Живи долго и процветай'],
  'rps.say.lizard': ['Ням!', 'Шшш…'],
  'rps.say.rock': ['Твёрдо!', 'Бум!'],
  'rps.say.paper': ['Шурх!', 'Бумажная победа'],
  'rps.say.scissors': ['Чик!', 'Вжик!'],
  'rps.say.champ': ['Ура!', 'Победа!', 'Я гений'],
  'rps.say.loser': ['Реванш?', 'В следующий раз…', 'Ну и ладно'],
  'rps.h.how': 'Как играть',
  'rps.how': `
    <p><b>Что нужно:</b> двое и по одной руке у каждого.</p>
    <p><b>Цель:</b> первым выиграть нужное число раундов (обычно три).</p>
    <ol>
      <li>Каждый тайком выбирает жест: <b>камень, бумагу, ножницы, ящерицу или Спока</b>. На счёт «три» жесты показывают одновременно.</li>
      <li>Каждый жест побеждает <b>два</b> других и проигрывает двум оставшимся. Стрелки на схеме идут от победителя к побеждённому. После раунда решающая стрелка подсвечивается, а на компьютере можно навести мышь на жест — проявятся все его жертвы.</li>
      <li>Одинаковые жесты — ничья, раунд просто переигрывают.</li>
    </ol>
    <p><b>Все десять правил:</b> ножницы режут бумагу, бумага заворачивает камень, камень давит ящерицу, ящерица кусает Спока, Спок ломает ножницы, ножницы стригут ящерицу, ящерица жуёт бумагу, бумага опровергает Спока, Спок испаряет камень, камень тупит ножницы.</p>
    <p>Вдвоём на одном устройстве игроки выбирают по очереди, а экран закрывается, пока устройство передают сопернику.</p>`,
  'rps.h.tips': 'Хитрости',
  'rps.tips': `
    <ul>
      <li>Против идеального соперника лучше всего выбирать жест <b>совершенно случайно</b>: тогда никакая хитрость не даст ему преимущества. Но люди плохо изображают случайность.</li>
      <li>Люди часто <b>повторяют</b> жест, который только что выиграл, и <b>меняют</b> тот, что проиграл. Ещё многие избегают показывать одно и то же три раза подряд.</li>
      <li>Следите за полоской истории сверху: в ней видны привычки соперника.</li>
    </ul>
    <p class="tip"><b>Компьютер.</b> Простой компьютер — существо привычки: он любит повторять свой прошлый жест. Обычный следит, какой жест вы показываете чаще всего. «Сыщик» держит в голове с десяток гипотез о вашем поведении и верит тем, что недавно сбывались. Если вы играете действительно случайно — он ничего не найдёт.</p>
    <p class="tip"><b>Варианты.</b> В настройках можно вернуться к классике из трёх жестов. А можно пойти дальше: подойдёт любое нечётное число жестов — 7, 9, 11… Нужно лишь, чтобы каждый жест бил ровно половину остальных. Правил становится всё больше: при <i>n</i> жестах их <i>n</i>(<i>n</i> − 1)/2, так что у версии из 101 жеста их больше пяти тысяч.</p>`,
  'rps.h.origin': 'Откуда игра',
  'rps.origin': `
    <p>«Камень, ножницы, бумага» известна много веков: похожие игры на пальцах пришли из Китая и Японии. Беда классики в том, что одинаковые жесты выпадают часто — в среднем в каждом третьем раунде.</p>
    <p>Карен Брайла и Сэм Касс решили это исправить и добавили два жеста — ящерицу и Спока (поднятая ладонь с пальцами, разведёнными «вилкой» между средним и безымянным). Теперь ничья случается лишь в каждом пятом раунде, а игра осталась такой же честной: у каждого жеста по две жертвы и по два обидчика.</p>
    <p>У схемы есть красивое свойство: любая стрелка входит в какой-нибудь треугольник-круговорот. Возьмите любую пару «победитель → побеждённый» — среди оставшихся жестов обязательно есть тот, кто проигрывает побеждённому, но сам бьёт победителя. Всемирную известность игре принёс сериал «Теория большого взрыва», где её с восторгом объясняет Шелдон.</p>`,
});

addStrings('en', {
  'rps.title': 'Rock, Paper, Scissors, Lizard, Spock',
  'rps.tagline': 'the old hand game, now with fewer ties',
  'rps.mode': 'Play:',
  'rps.mode.pvp': 'two players',
  'rps.mode.easy': 'vs computer (easy)',
  'rps.mode.normal': 'vs computer (normal)',
  'rps.mode.hard': 'vs computer (detective)',
  'rps.set': 'Gestures:',
  'rps.set.5': 'all five',
  'rps.set.3': 'classic three',
  'rps.target': 'Match to:',
  'rps.wins.gen': ['win', 'wins'],
  'rps.again': 'another match!',
  'rps.p0': 'Blue',
  'rps.p1': 'Red',
  'rps.cpu': 'Computer',
  'rps.wins': ['win', 'wins'],
  'rps.round': 'Round {n}',
  'rps.upto': 'to {n}',
  'rps.ready': 'ready!',
  'rps.vs': 'vs',
  'rps.count.0': 'One…',
  'rps.count.1': 'Two…',
  'rps.count.2': 'Three!',
  'rps.pick': '{name}, your gesture',
  'rps.pick.you': 'Pick a gesture',
  'rps.pick.wait': 'Waiting for the opponent…',
  'rps.pick.cpu': 'Pick a gesture — the computer has chosen',
  'rps.cover.title': '{name}’s turn',
  'rps.cover.note': 'Opponent, no peeking!',
  'rps.cover.btn': 'It’s me — show',
  'rps.cover.status': 'Pass the device to {name}',
  'rps.tie': 'A tie — play again',
  'rps.online.wait': 'Waiting for the other player…',
  'rps.online.note': 'You’re playing online: the room creator starts new matches and picks the rules.',
  'rps.online.waitnew': '{name} will start the next match',
  'rps.win': '{name} wins! {a} : {b}',
  'g.scissors': 'scissors',
  'g.paper': 'paper',
  'g.rock': 'rock',
  'g.lizard': 'lizard',
  'g.spock': 'Spock',
  'v.cut': 'Scissors cut paper',
  'v.cover': 'Paper covers rock',
  'v.crush': 'Rock crushes lizard',
  'v.poison': 'Lizard poisons Spock',
  'v.smash': 'Spock smashes scissors',
  'v.behead': 'Scissors decapitate lizard',
  'v.eat': 'Lizard eats paper',
  'v.disprove': 'Paper disproves Spock',
  'v.vaporize': 'Spock vaporizes rock',
  'v.blunt': 'Rock crushes scissors',
  'rps.say.win': ['Ha!', 'Yes!', 'Called it!', 'Knew it', 'Point!'],
  'rps.say.lose': ['Oops', 'Ugh…', 'What?!', 'Hmm', 'Oh no'],
  'rps.say.tie': ['Same again!', 'Reading my mind?', 'Again!', 'Jinx!'],
  'rps.say.streak': ['I can read you', 'So predictable', 'Three in a row!'],
  'rps.say.matchpoint': ['One more and it’s over', 'Almost mine!'],
  'rps.say.worried': ['Focus…', 'Not now…', 'Think, think…'],
  'rps.say.spock': ['Logical.', 'Live long and prosper'],
  'rps.say.lizard': ['Yum!', 'Hsss…'],
  'rps.say.rock': ['Rock solid!', 'Boom!'],
  'rps.say.paper': ['Rustle!', 'Paper wins'],
  'rps.say.scissors': ['Snip!', 'Snip snip!'],
  'rps.say.champ': ['Hooray!', 'Victory!', 'I’m a genius'],
  'rps.say.loser': ['Rematch?', 'Next time…', 'Whatever'],
  'rps.h.how': 'How to play',
  'rps.how': `
    <p><b>You need:</b> two players with one hand each.</p>
    <p><b>Goal:</b> be the first to win the agreed number of rounds (three, usually).</p>
    <ol>
      <li>Each player secretly picks a gesture: <b>rock, paper, scissors, lizard or Spock</b>. On the count of three, both are revealed at once.</li>
      <li>Each gesture beats <b>two</b> others and loses to the remaining two. Arrows in the diagram run from winner to loser. After each round the deciding arrow lights up, and on a computer you can hover over a gesture to see everything it beats.</li>
      <li>Matching gestures are a tie; just play the round again.</li>
    </ol>
    <p><b>All ten rules:</b> scissors cut paper, paper covers rock, rock crushes lizard, lizard poisons Spock, Spock smashes scissors, scissors decapitate lizard, lizard eats paper, paper disproves Spock, Spock vaporizes rock, and rock crushes scissors.</p>
    <p>Two players on one device pick in turn; the screen covers up while the device changes hands.</p>`,
  'rps.h.tips': 'Tricks',
  'rps.tips': `
    <ul>
      <li>Against a perfect opponent the best plan is to pick <b>completely at random</b>: then no trick can give them an edge. But people are bad at being random.</li>
      <li>People tend to <b>repeat</b> a gesture that just won and <b>switch</b> away from one that lost. Many also avoid showing the same thing three times running.</li>
      <li>Watch the history strip at the top: it shows your opponent’s habits.</li>
    </ul>
    <p class="tip"><b>The computer.</b> The easy computer is a creature of habit: it likes to repeat its last gesture. The normal one tracks which gesture you show most. The detective juggles a handful of theories about your behaviour and trusts whichever ones have been coming true. If you are truly random, it finds nothing.</p>
    <p class="tip"><b>Variants.</b> In the settings you can go back to the classic three gestures. Or go further: any odd number of gestures works — 7, 9, 11… — as long as each one beats exactly half of the others. The rulebook grows fast: <i>n</i> gestures need <i>n</i>(<i>n</i> − 1)/2 rules, so a 101-gesture version has more than five thousand.</p>`,
  'rps.h.origin': 'Where it comes from',
  'rps.origin': `
    <p>Rock-paper-scissors is centuries old; similar finger games came from China and Japan. The trouble with the classic is how often both players show the same thing — one round in three, on average.</p>
    <p>Karen Bryla and Sam Kass fixed that by adding two gestures: lizard and Spock (a raised palm with the fingers split between middle and ring). Now only one round in five is a tie, and the game is just as fair: every gesture has two victims and two enemies.</p>
    <p>The diagram has a neat property: every arrow is part of some three-way loop. Take any winner → loser pair, and among the remaining gestures there is always one that falls to the loser yet beats the winner. The game became world-famous thanks to the sitcom <i>The Big Bang Theory</i>, where Sheldon explains it with great enthusiasm.</p>`,
});
