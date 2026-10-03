import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'fpl.title': 'Франко-прусский лабиринт',
  'fpl.tagline': 'бредём на ощупь по чужому лабиринту',
  'fpl.variant': 'Правила:',
  'fpl.variant.classic': 'классика: 9 × 9, шаги',
  'fpl.variant.french': 'французские: 10 × 10, рывки',
  'fpl.mode': 'Играем:',
  'fpl.mode.pvp': 'вдвоём',
  'fpl.mode.easy': 'с компьютером (простой)',
  'fpl.mode.normal': 'с компьютером (обычный)',
  'fpl.mode.hard': 'с компьютером (коварный)',
  'fpl.p0': 'Синий',
  'fpl.p1': 'Красный',
  'fpl.cpu': 'Компьютер',
  'fpl.again': 'ещё раз!',
  'fpl.peek': 'лабиринты',
  'fpl.b.random': 'случайно',
  'fpl.b.clear': 'очистить',
  'fpl.b.ready': 'готово',
  'fpl.walls': 'стен {n} из {w}',
  'fpl.build': '{name}: {walls}',
  'fpl.build.you': 'Ваш лабиринт: {walls}',
  'fpl.build.hint': 'нажимайте между клетками',
  'fpl.build.blocked': 'Нельзя: выход будет замурован!',
  'fpl.build.full': 'Все стены уже стоят',
  'fpl.cover.build': 'Лабиринт строит {name}',
  'fpl.cover.build.sub': '{other}, не подглядывайте!',
  'fpl.cover.build.go': 'строить',
  'fpl.cover.pass': 'Передайте устройство: {name}',
  'fpl.cover.pass.sub': '{other}, теперь ваша очередь отвернуться.',
  'fpl.cover.play': 'Лабиринты готовы!',
  'fpl.cover.play.sub': 'Первым идёт {name}. Дальше прятать нечего: на поле видно только то, что ходящий уже нащупал.',
  'fpl.cover.play.go': 'вперёд!',
  'fpl.cover.wait': 'Ждём, пока {name} достроит лабиринт…',
  'fpl.cover.wait.sub': 'Ваш лабиринт принят.',
  'fpl.card.building': 'строит…',
  'fpl.card.ready': 'готово ✓',
  'fpl.steps': ['шаг', 'шага', 'шагов'],
  'fpl.slides': ['рывок', 'рывка', 'рывков'],
  'fpl.turn': 'Ходит {name}',
  'fpl.turn.you': 'Ваш ход',
  'fpl.turn.them': 'Ходит {name}…',
  'fpl.thinking': '{name} думает…',
  'fpl.left': 'шагов: {n}',
  'fpl.pick': 'откуда и куда?',
  'fpl.end.bump': '{name} упирается в стену',
  'fpl.end.done': '{name}: ход окончен',
  'fpl.online.wait': 'Ждём второго игрока…',
  'fpl.online.note': 'Сейчас идёт игра по сети: новую партию начинает и правила выбирает создатель комнаты.',
  'fpl.online.waitnew': 'Новую партию начнёт {name}',
  'fpl.win': 'Побеждает {name}!',
  'fpl.win.sub': 'выход найден за {n}',
  'fpl.over.view': 'Лабиринт: {name} (нажмите — другой)',
  'fpl.say.bump': ['Ой!', 'Стена!', 'Бум!', 'Ай, лоб!', 'Тупик?'],
  'fpl.say.glee': ['Хе-хе', 'Попался!', 'Не туда!', 'Там стена', 'Ага!'],
  'fpl.say.run': ['Иду-иду', 'Пока везёт', 'Свободно!', 'Вперёд!'],
  'fpl.say.close': ['Выход близко!', 'Чую сквозняк', 'Почти!'],
  'fpl.say.worry': ['Ой-ой', 'Только не туда…', 'Неужели найдёт?'],
  'fpl.say.ready': ['Готово!', 'Удачи там…', 'Заходи, не бойся'],
  'fpl.say.win': ['Выход!', 'Ура!', 'Я на свободе!'],
  'fpl.say.lose': ['Реванш?', 'Эх…', 'Ещё бы шажок…'],
  'fpl.h.how': 'Как играть',
  'fpl.how': `
    <p><b>Что нужно:</b> двое, у каждого — клетчатое поле 9 × 9. Строки — цифры 1–9, столбцы — буквы A–I.</p>
    <p><b>Цель:</b> первым пройти от левого верхнего угла A1 до правого нижнего I9 — по лабиринту, который тайно построил соперник.</p>
    <ol>
      <li><b>Стройка.</b> Каждый ставит на своём поле <b>30 стенок</b>. Стенка — это одна сторона клетки: нажмите на линию между двумя клетками. Путь от A1 до I9 обязан остаться — замуровать выход игра не даст.</li>
      <li><b>Ходьба.</b> В свой ход делайте до <b>5 шагов</b> на соседнюю клетку — вверх, вниз, влево или вправо. Нажмите на соседнюю клетку (или стрелку на клавиатуре).</li>
      <li>Стен соперника вы не видите. Упёрлись в стену — <b>ход сразу кончается</b>, вы остаётесь на месте, а стена появляется на вашей карте.</li>
      <li>Следующий ход продолжается оттуда, где вы остановились. Побеждает тот, кто первым доберётся до I9.</li>
    </ol>
    <p class="tip"><b>Французские правила</b> (в настройках): поле 10 × 10 и 40 стенок. Ход — один рывок: выберите направление и катитесь, пока не упрётесь в стену или край. Следующий рывок можно начать с <b>любой</b> клетки, по которой вы проехали в прошлый раз. Сначала нажмите клетку-старт, потом — клетку в нужном направлении.</p>`,
  'fpl.h.tips': 'Хитрости',
  'fpl.tips': `
    <ul>
      <li><b>Рискуйте в конце хода.</b> Удар о стену первым шагом сжигает все пять, а пятым — только один. Сначала пройдите по разведанному, а неизвестное пробуйте напоследок.</li>
      <li><b>Тупики ставьте поближе к выходу.</b> Ошибка у самой цели стоит сопернику дороже: возвращаться придётся далеко.</li>
      <li>Не тратьте стенки на углы, куда никто не пойдёт. Самая заманчивая дорога — по диагонали вниз-вправо; именно там она и должна обрываться.</li>
      <li>Длинная стена, оставляющая один узкий проход, обходится дешевле десятка разрозненных кусочков.</li>
      <li>Первый игрок чуть сильнее — поэтому в следующей партии начинает другой.</li>
    </ul>
    <p class="tip"><b>Играйте с сюжетом.</b> Можно представить себя Тесеем, который ищет Минотавра, — тогда пунктир на карте — ваша нить Ариадны. А можно — покупателем, заблудившимся в огромном мебельном магазине: выход где-то есть, но где?</p>
    <p class="tip"><b>Коварный компьютер</b> перебирает много случайных лабиринтов и оставляет тот, в котором сам дольше всех плутал бы.</p>`,
  'fpl.h.origin': 'Откуда игра',
  'fpl.origin': `
    <p>Это игра «на ощупь», дальняя родственница «Морского боя»: у каждого своя тайная карта, и сведения о ней добываются по крупице. Только вместо выстрелов — шаги, а вместо кораблей — стены.</p>
    <p>Кто придумал игру, неизвестно; она живёт в сборниках игр на бумаге. Итальянский автор игр Андреа Анджолино, много лет собиравший такие развлечения, советовал вообразить себя Тесеем в критском лабиринте. У игры есть и «французский вариант» — с рывками до упора вместо шагов.</p>
    <p>А Хорхе Луис Борхес, большой любитель лабиринтов, замечал, что строить их, в сущности, незачем: весь мир и так один большой лабиринт.</p>`,
});

addStrings('en', {
  'fpl.title': 'Franco-Prussian Labyrinth',
  'fpl.tagline': 'stumbling blind through someone else’s maze',
  'fpl.variant': 'Rules:',
  'fpl.variant.classic': 'classic: 9 × 9, steps',
  'fpl.variant.french': 'French: 10 × 10, slides',
  'fpl.mode': 'Play:',
  'fpl.mode.pvp': 'two players',
  'fpl.mode.easy': 'vs computer (easy)',
  'fpl.mode.normal': 'vs computer (normal)',
  'fpl.mode.hard': 'vs computer (devious)',
  'fpl.p0': 'Blue',
  'fpl.p1': 'Red',
  'fpl.cpu': 'Computer',
  'fpl.again': 'again!',
  'fpl.peek': 'mazes',
  'fpl.b.random': 'random',
  'fpl.b.clear': 'clear',
  'fpl.b.ready': 'done',
  'fpl.walls': '{n} of {w} walls',
  'fpl.build': '{name}: {walls}',
  'fpl.build.you': 'Your maze: {walls}',
  'fpl.build.hint': 'tap between squares',
  'fpl.build.blocked': 'No: that would seal the exit!',
  'fpl.build.full': 'All the walls are placed',
  'fpl.cover.build': '{name} builds a maze',
  'fpl.cover.build.sub': '{other}, no peeking!',
  'fpl.cover.build.go': 'build',
  'fpl.cover.pass': 'Hand the device to {name}',
  'fpl.cover.pass.sub': '{other}, your turn to look away.',
  'fpl.cover.play': 'Both mazes are ready!',
  'fpl.cover.play.sub': '{name} goes first. Nothing to hide from now on: the board only shows what the walker has already felt out.',
  'fpl.cover.play.go': 'go!',
  'fpl.cover.wait': 'Waiting for {name} to finish the maze…',
  'fpl.cover.wait.sub': 'Your maze is in.',
  'fpl.card.building': 'building…',
  'fpl.card.ready': 'ready ✓',
  'fpl.steps': ['step', 'steps'],
  'fpl.slides': ['slide', 'slides'],
  'fpl.turn': '{name} to move',
  'fpl.turn.you': 'Your move',
  'fpl.turn.them': '{name} is moving…',
  'fpl.thinking': '{name} is thinking…',
  'fpl.left': 'steps: {n}',
  'fpl.pick': 'from where, which way?',
  'fpl.end.bump': '{name} hits a wall',
  'fpl.end.done': '{name}: turn over',
  'fpl.online.wait': 'Waiting for the other player…',
  'fpl.online.note': 'You’re playing online: the room creator starts new games and picks the rules.',
  'fpl.online.waitnew': '{name} will start the next game',
  'fpl.win': '{name} wins!',
  'fpl.win.sub': 'out in {n}',
  'fpl.over.view': '{name}’s maze (tap to switch)',
  'fpl.say.bump': ['Ouch!', 'A wall!', 'Bonk!', 'My nose!', 'Dead end?'],
  'fpl.say.glee': ['Heh heh', 'Gotcha!', 'Wrong way!', 'Wall there', 'Aha!'],
  'fpl.say.run': ['Off I go', 'So far so good', 'All clear!', 'Onward!'],
  'fpl.say.close': ['Nearly out!', 'I smell fresh air', 'Almost!'],
  'fpl.say.worry': ['Uh-oh', 'Not that way…', 'Surely not…'],
  'fpl.say.ready': ['Done!', 'Good luck in there…', 'Come on in'],
  'fpl.say.win': ['Out!', 'Hooray!', 'Free at last!'],
  'fpl.say.lose': ['Rematch?', 'Ugh…', 'Just one more step…'],
  'fpl.h.how': 'How to play',
  'fpl.how': `
    <p><b>You need:</b> two players, each with a 9 × 9 grid. Rows are numbered 1–9, columns lettered A–I.</p>
    <p><b>Goal:</b> be the first to get from the top-left square A1 to the bottom-right square I9 — through a maze your opponent built in secret.</p>
    <ol>
      <li><b>Build.</b> Each player places <b>30 walls</b> on their own grid. A wall is one side of a square: tap the line between two squares. A route from A1 to I9 must remain — the game won’t let you seal the exit.</li>
      <li><b>Walk.</b> On your turn take up to <b>5 steps</b> to a neighbouring square — up, down, left or right. Tap the neighbouring square (or use the arrow keys).</li>
      <li>You can’t see your opponent’s walls. Bump into one and <b>your turn ends at once</b>: you stay where you are, and the wall appears on your map.</li>
      <li>Your next turn starts where you stopped. First to reach I9 wins.</li>
    </ol>
    <p class="tip"><b>French rules</b> (in settings): a 10 × 10 grid with 40 walls. A turn is one slide: pick a direction and keep going until a wall or the edge stops you. Your next slide may start from <b>any</b> square you passed through on the previous one. Tap the starting square first, then a square in the direction you want.</p>`,
  'fpl.h.tips': 'Tricks',
  'fpl.tips': `
    <ul>
      <li><b>Take risks late in the turn.</b> Bumping on your first step wastes all five; on your fifth, just one. Walk the known path first and try the unknown last.</li>
      <li><b>Put dead ends near the exit.</b> A wrong turn close to the goal costs your opponent the most: they have a long way back.</li>
      <li>Don’t waste walls on corners nobody visits. The tempting road runs diagonally down and right — that’s exactly where it should break off.</li>
      <li>One long wall with a single narrow gap is cheaper than a dozen scattered pieces.</li>
      <li>The first player has a slight edge, so the other one starts the next game.</li>
    </ul>
    <p class="tip"><b>Play it as a story.</b> Imagine you are Theseus hunting the Minotaur — the dotted line on your map is Ariadne’s thread. Or imagine you’re lost in a giant flat-pack furniture store: there is an exit somewhere, but where?</p>
    <p class="tip"><b>The devious computer</b> tries lots of random mazes and keeps the one it would itself get most lost in.</p>`,
  'fpl.h.origin': 'Where it comes from',
  'fpl.origin': `
    <p>This is a game of groping in the dark, a distant cousin of Battleship: each player has a secret map, and information about it is gathered one crumb at a time. Only here you take steps instead of shots, and hunt for walls instead of ships.</p>
    <p>Nobody knows who invented it; it lives on in collections of pencil-and-paper games. Italian game author Andrea Angiolino, who has gathered many such pastimes, suggests imagining yourself as Theseus in the Cretan labyrinth. There is also a “French variation”, with slides to a full stop instead of steps.</p>
    <p>And Jorge Luis Borges, a great lover of labyrinths, remarked that there’s really no need to build one: the whole world already is a labyrinth.</p>`,
});
