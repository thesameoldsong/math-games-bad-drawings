import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'cor.title': 'Уголки',
  'cor.tagline': 'найди квадрат, который прячется у всех на виду',
  'cor.size': 'Поле:',
  'cor.fill': 'Захват:',
  'cor.fill.area': 'вся площадь',
  'cor.fill.edge': 'только по краю',
  'cor.hints': 'Подсказки:',
  'cor.hints.on': 'показывать',
  'cor.hints.off': 'не показывать',
  'cor.mode': 'Играем:',
  'cor.mode.pvp': 'вдвоём',
  'cor.mode.easy': 'с компьютером (простой)',
  'cor.mode.normal': 'с компьютером (обычный)',
  'cor.mode.hard': 'с компьютером (сильный)',
  'cor.again': 'ещё раз!',
  'cor.p0': 'Синий',
  'cor.p1': 'Красный',
  'cor.cpu': 'Компьютер',
  'cor.pts': ['очко', 'очка', 'очков'],
  'cor.turn': 'Ходит {name}',
  'cor.turn.ready': '{name}: квадрат готов — нажмите на его угол',
  'cor.turn.final': 'Последний шанс: {name} забирает квадрат',
  'cor.thinking': '{name} думает…',
  'cor.turn.you': 'Ваш ход',
  'cor.turn.you.ready': 'Ваш ход — есть готовый квадрат',
  'cor.turn.you.final': 'Последний шанс: заберите квадрат',
  'cor.turn.them': 'Ходит {name}…',
  'cor.noclaim': 'У этой точки нет готового квадрата',
  'cor.claim': 'забрать +{n}',
  'cor.claim0': 'забрать',
  'cor.other': 'другой {i}/{k}',
  'cor.cancel': 'отмена',
  'cor.online.wait': 'Ждём второго игрока…',
  'cor.online.note': 'Сейчас идёт игра по сети: новую партию начинает и поле выбирает создатель комнаты.',
  'cor.online.waitnew': 'Новую партию начнёт {name}',
  'cor.next': 'Следующую партию начинает {name}',
  'cor.win': 'Побеждает {name}! {a}\u00a0:\u00a0{b}',
  'cor.tie': 'Ничья! {a}\u00a0:\u00a0{b}',
  'cor.say.square': ['Ага, квадрат!', 'Есть!', 'Хе-хе', 'Видишь его?'],
  'cor.say.fork': ['Сразу два!', 'Вилка!', 'Попробуй закрой оба'],
  'cor.say.block': ['Не выйдет!', 'Закрыто!', 'Я всё вижу', 'Стоп!'],
  'cor.say.blocked': ['Эх…', 'Заметили…', 'Ну вот'],
  'cor.say.claim': ['Моё!', 'Забираю', 'В копилку'],
  'cor.say.big': ['Вот это улов!', 'Целое поле!', 'Ого сколько!'],
  'cor.say.ouch': ['Ой-ой', 'Как это можно было не заметить?', 'Ну вот…', 'Где были мои глаза?'],
  'cor.say.pass': ['Нечего забрать', 'Пусто…', 'Пас'],
  'cor.say.win': ['Ура!', 'Победа!', 'Вижу всё!'],
  'cor.say.lose': ['Реванш?', 'В следующий раз…', 'Где же квадраты?'],
  'cor.say.tie': ['Поровну!', 'Ничья…'],
  'cor.h.how': 'Как играть',
  'cor.how': `
    <p><b>Что нужно:</b> двое и квадратное поле из клеток. Автор советует 7 × 7, но подойдёт и 6 × 6, 8 × 8 или 9 × 9.</p>
    <p><b>Цель:</b> собрать больше <b>закрашенных точек</b> — каждая стоит одно очко.</p>
    <ol>
      <li>Ходите по очереди. Обычный ход — поставить в любую свободную клетку <b>пустой кружок</b> своего цвета. Пустые кружки очков не приносят — пока.</li>
      <li>Если четыре ваших кружка стоят в <b>углах квадрата</b>, квадрат готов. Подходят и ровные квадраты вдоль сетки, и «ромбы», повёрнутые на 45°. Квадраты под другими углами не считаются.</li>
      <li>Готовый квадрат можно <b>забрать</b> одним из следующих ходов — вместо нового кружка. Тогда его четыре угла закрашиваются (+1 очко за каждый ещё не закрашенный), а во все свободные клетки внутри квадрата и на его сторонах встают ваши пустые кружки.</li>
      <li>Забрать можно и квадрат, где часть углов уже закрашена, и квадрат без свободных клеток внутри — главное, чтобы что-то изменилось.</li>
      <li>Когда свободных клеток не осталось, каждый получает <b>ещё по одному ходу</b>, чтобы забрать квадрат. Остальные квадраты так и остаются незабранными. У кого больше закрашенных точек, тот и выигрывает; поровну — ничья.</li>
    </ol>
    <p class="tip"><b>Как забрать квадрат:</b> нажмите на любой его угол. Появится рамка и кнопка «забрать». Если через эту точку проходит несколько готовых квадратов, кнопка «другой» переключает их.</p>`,
  'cor.h.tips': 'Хитрости',
  'cor.tips': `
    <ul>
      <li><b>Большой квадрат в начале</b> — почти победа: он заливает поле вашими кружками, а из них тут же складываются новые квадраты. Следите, не стоят ли у соперника три далёких угла.</li>
      <li><b>Маленькие квадраты</b> хороши тем, что одним кружком можно грозить сразу двум. Соперник успеет закрыть только одну дыру.</li>
      <li>Готовый квадрат никто не отнимет: соперник может лишь занять пустые клетки внутри. Поэтому иногда разумнее сначала перекрыть его угрозу, а свой квадрат забрать потом.</li>
      <li>Не забывайте про <b>ромбы</b> — их легче всего проглядеть.</li>
      <li>Хотите тренировать глаз — выключите подсказки в настройках и ищите квадраты сами.</li>
    </ul>
    <h4>Варианты</h4>
    <ul>
      <li><b>Только по краю</b> (есть в настройках). Если кажется, что большой квадрат решает слишком много, пусть он даёт кружки только на своих сторонах, а не во всей площади.</li>
      <li><b>Втроём или вчетвером.</b> Берите поле побольше, например 9 × 9, а очередь ходов пускайте «змейкой»: А, Б, В, В, Б, А, А, Б… (здесь пока только для двоих).</li>
      <li><b>Quads and Quasars</b> — дальний родственник: кто первым поставит четыре фишки в углы квадрата под любым углом, тот и выиграл, а нейтральные «квазары» служат для защиты.</li>
    </ul>`,
  'cor.h.origin': 'Откуда игра',
  'cor.origin': `
    <p>«Уголки» придумал сам Бен Орлин. Отправной точкой стала игра <i>Territoria</i> Вальтера Йориса, где готовый квадрат сразу заполняется точками. Партии там часто заканчивались либо разгромом, либо запутанной ничьей, поэтому Орлин разделил точки на пустые и закрашенные и добавил отдельный ход «забрать квадрат».</p>
    <p>У игры есть и головоломные предки. Японский автор головоломок Наоки Инаба придумал <i>Дзукэй</i> — задачи, где среди россыпи точек надо найти заданную фигуру. А математики долго искали раскраску сетки 17 × 17 в четыре цвета, где никакие четыре точки одного цвета не образуют прямоугольник, — и нашли её только в 2012 году.</p>
    <p>Квадраты под «странными» углами автор из игры сознательно убрал: и без них глазу хватает работы.</p>`,
});

addStrings('en', {
  'cor.title': 'Corners',
  'cor.tagline': 'spot the square hiding in plain sight',
  'cor.size': 'Board:',
  'cor.fill': 'Claim fills:',
  'cor.fill.area': 'whole area',
  'cor.fill.edge': 'border only',
  'cor.hints': 'Hints:',
  'cor.hints.on': 'show',
  'cor.hints.off': 'don’t show',
  'cor.mode': 'Play:',
  'cor.mode.pvp': 'two players',
  'cor.mode.easy': 'vs computer (easy)',
  'cor.mode.normal': 'vs computer (normal)',
  'cor.mode.hard': 'vs computer (strong)',
  'cor.again': 'again!',
  'cor.p0': 'Blue',
  'cor.p1': 'Red',
  'cor.cpu': 'Computer',
  'cor.pts': ['point', 'points'],
  'cor.turn': '{name} to move',
  'cor.turn.ready': '{name}: a square is ready — tap one of its corners',
  'cor.turn.final': 'Last chance: {name} may claim a square',
  'cor.thinking': '{name} is thinking…',
  'cor.turn.you': 'Your move',
  'cor.turn.you.ready': 'Your move — a square is ready',
  'cor.turn.you.final': 'Last chance: claim a square',
  'cor.turn.them': '{name} is moving…',
  'cor.noclaim': 'No finished square at this dot',
  'cor.claim': 'claim +{n}',
  'cor.claim0': 'claim',
  'cor.other': 'other {i}/{k}',
  'cor.cancel': 'cancel',
  'cor.online.wait': 'Waiting for the other player…',
  'cor.online.note': 'You’re playing online: the room creator starts new games and picks the board.',
  'cor.online.waitnew': '{name} will start the next game',
  'cor.next': '{name} starts the next game',
  'cor.win': '{name} wins! {a}\u00a0:\u00a0{b}',
  'cor.tie': 'A tie! {a}\u00a0:\u00a0{b}',
  'cor.say.square': ['Aha, a square!', 'Got one!', 'Heh', 'See it?'],
  'cor.say.fork': ['Two at once!', 'A fork!', 'Block them both, then'],
  'cor.say.block': ['Not so fast!', 'Blocked!', 'I see everything', 'Nope!'],
  'cor.say.blocked': ['Ugh…', 'Spotted…', 'Oh well'],
  'cor.say.claim': ['Mine!', 'I’ll take it', 'In the bank'],
  'cor.say.big': ['What a haul!', 'A whole field!', 'So many!'],
  'cor.say.ouch': ['Ouch', 'How did I miss that?', 'Oh no…', 'Where were my eyes?'],
  'cor.say.pass': ['Nothing to claim', 'Empty-handed…', 'Pass'],
  'cor.say.win': ['Hooray!', 'Victory!', 'Sharp eyes!'],
  'cor.say.lose': ['Rematch?', 'Next time…', 'Where were they?'],
  'cor.say.tie': ['Even!', 'A tie…'],
  'cor.h.how': 'How to play',
  'cor.how': `
    <p><b>You need:</b> two players and a square grid of cells. 7 × 7 is the recommended size, but 6 × 6, 8 × 8 or 9 × 9 work too.</p>
    <p><b>Goal:</b> end with more <b>shaded dots</b> — each one is a point.</p>
    <ol>
      <li>Take turns. A normal move puts a <b>hollow dot</b> of your colour in any free cell. Hollow dots score nothing — yet.</li>
      <li>When four of your dots sit at the <b>corners of a square</b>, that square is ready. Squares can follow the grid or be “diamonds” tilted by 45°. Squares at other angles don’t count.</li>
      <li>On any later turn you may <b>claim</b> a ready square instead of placing a dot. Its four corners get shaded (+1 point for each one not shaded yet), and every free cell inside the square and on its sides gets a hollow dot of your colour.</li>
      <li>You may claim a square even if some of its corners are already shaded, or if it has no free cells inside — as long as something changes.</li>
      <li>Once no free cells remain, each player gets <b>one more turn</b> to claim a square. Any other squares stay unclaimed. Whoever has more shaded dots wins; equal counts mean a tie.</li>
    </ol>
    <p class="tip"><b>To claim a square</b> tap any of its corners. A frame appears with a “claim” button. If several ready squares share that dot, “other” flips between them.</p>`,
  'cor.h.tips': 'Tricks',
  'cor.tips': `
    <ul>
      <li><b>A big square early on</b> is close to a win: it floods the board with your dots, and they quickly form new squares. Watch out for three far-apart corners of your opponent’s.</li>
      <li><b>Small squares</b> are handy because a single dot can threaten two of them at once. Your opponent can plug only one hole.</li>
      <li>Nobody can take away a ready square — your opponent can only occupy free cells inside it. So it’s sometimes wiser to block their threat first and cash in later.</li>
      <li>Don’t forget the <b>diamonds</b> — they’re the easiest to overlook.</li>
      <li>Want to train your eye? Turn the hints off in the settings and hunt for squares yourself.</li>
    </ul>
    <h4>Variants</h4>
    <ul>
      <li><b>Border only</b> (in the settings). If big squares feel too decisive, let a claim put dots only along the square’s sides instead of across its whole area.</li>
      <li><b>Three or four players.</b> Use a bigger board such as 9 × 9 and “snake” the turn order: A, B, C, C, B, A, A, B… (this page is two-player only for now).</li>
      <li><b>Quads and Quasars</b> is a distant cousin: the first to place four pieces on the corners of a square at any angle wins, while neutral “quasars” are used for blocking.</li>
    </ul>`,
  'cor.h.origin': 'Where it comes from',
  'cor.origin': `
    <p>Corners is Ben Orlin’s own invention. It grew out of Walter Joris’s game <i>Territoria</i>, where a finished square instantly fills up with dots. Those games tended to end in blowouts or tangled draws, so Orlin split the dots into hollow and shaded ones and added a separate “claim” move.</p>
    <p>It also has puzzle ancestors. Japanese puzzle maker Naoki Inaba created <i>Zukei</i>, where you hunt for a given shape among scattered dots. And mathematicians spent years looking for a four-colouring of a 17 × 17 grid with no single-colour rectangle anywhere — it was finally found in 2012.</p>
    <p>Squares at “odd” angles were left out on purpose: your eyes have plenty to do without them.</p>`,
});
