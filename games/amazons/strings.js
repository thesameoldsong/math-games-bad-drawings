import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'amz.title': 'Амазонки',
  'amz.tagline': 'королевы с огненными стрелами на тающем поле',
  'amz.size': 'Поле:',
  'amz.size.6': '6 × 6, по 2 амазонки',
  'amz.size.8': '8 × 8, по 3 амазонки',
  'amz.size.10': '10 × 10, по 4 амазонки',
  'amz.mode': 'Играем:',
  'amz.mode.pvp': 'вдвоём',
  'amz.mode.easy': 'с компьютером (простой)',
  'amz.mode.normal': 'с компьютером (обычный)',
  'amz.mode.hard': 'с компьютером (сильный)',
  'amz.again': 'ещё раз!',
  'amz.p0': 'Синий',
  'amz.p1': 'Красный',
  'amz.cpu': 'Компьютер',
  'amz.free': 'свободны: {n}/{k}',
  'amz.room': 'клеток: {n}',
  'amz.turn.pick': '{name}: выберите амазонку',
  'amz.turn.step': '{name}: куда идёт амазонка?',
  'amz.turn.shoot': '{name}: теперь выстрел!',
  'amz.you.pick': 'Ваш ход: выберите амазонку',
  'amz.you.step': 'Куда идёт амазонка?',
  'amz.you.shoot': 'Теперь выстрел!',
  'amz.thinking': '{name} думает…',
  'amz.turn.them': 'Ходит {name}…',
  'amz.online.wait': 'Ждём второго игрока…',
  'amz.online.note': 'Сейчас идёт игра по сети: новую партию начинает и размер поля выбирает создатель комнаты.',
  'amz.online.waitnew': 'Новую партию начнёт {name}',
  'amz.next': 'Следующую партию начинает {name}',
  'amz.win': 'Побеждает {name}!',
  'amz.why': 'У соперника не осталось ни одного хода.',
  'amz.say.good': ['Ага!', 'Вот так', 'Моя земля!', 'Хе-хе', 'Неплохо'],
  'amz.say.trap': ['Попалась!', 'Сиди там', 'Клетка закрыта', 'Ни шагу!'],
  'amz.say.trapped': ['Эй, выпустите!', 'Ой…', 'Меня заперли!'],
  'amz.say.oops': ['Ой…', 'Зря я так', 'Хм…', 'Ох'],
  'amz.say.worried': ['Тесновато…', 'Эй-эй', 'Опасно…'],
  'amz.say.sealed': ['Каждый в своей комнате', 'Границы закрыты', 'Теперь считаем клетки'],
  'amz.say.win': ['Ура!', 'Победа!', 'Последняя стоит!'],
  'amz.say.lose': ['Реванш?', 'Эх…', 'В следующий раз'],
  'amz.h.how': 'Как играть',
  'amz.how': `
    <p><b>Что нужно:</b> двое, шахматная доска и по три фигуры-<b>амазонки</b> у каждого. На бумаге хватит сетки 8 × 8 и карандаша — сожжённые клетки просто закрашиваются.</p>
    <p><b>Цель:</b> сделать последний ход. Кому нечем ходить — проигрывает.</p>
    <ol>
      <li><b>Шаг.</b> Возьмите любую свою амазонку и сдвиньте её как шахматного ферзя: по прямой или диагонали на сколько угодно клеток.</li>
      <li><b>Выстрел.</b> С нового места амазонка тут же пускает горящую стрелу — тоже как ферзь, в любую сторону. Клетка, куда упала стрела, <b>сгорает</b> навсегда. Клетки по дороге не страдают; стрелять можно и туда, откуда амазонка только что ушла.</li>
      <li>Ни амазонки, ни стрелы не проходят сквозь сгоревшие клетки и чужие или свои фигуры — и не прыгают через них.</li>
      <li>С каждым ходом поле выгорает. Кто первым не может сделать ход (все его амазонки заперты), проигрывает.</li>
    </ol>
    <p class="hand">Нажмите на свою амазонку, затем на клетку, куда идти, а потом — куда стрелять. Передумали? Нажмите на амазонку ещё раз.</p>`,
  'amz.h.tips': 'Хитрости',
  'amz.tips': `
    <ul>
      <li>Партия — это борьба за <b>территорию</b>. Ближе к концу поле распадается на закрытые «комнаты», и в каждой хозяйничает одна сторона. Чья суммарная площадь больше — тот, как правило, и сделает последний ход.</li>
      <li>Оказавшись в своей комнате, обходите её <b>по клетке</b> и сжигайте ту, с которой ушли. Не отрезайте стрелой кусок собственной комнаты.</li>
      <li>Держите амазонок <b>подвижными</b> и в центре. Фигура, прижатая к краю, легко оказывается в тесной клетке.</li>
      <li>Стрела — оружие: ставьте её прямо перед носом чужой амазонки, чтобы перекрыть ей выход.</li>
      <li>Не пытайтесь просчитать всё далеко вперёд: в начале партии у каждого хода больше тысячи вариантов, и неожиданные повороты здесь обычное дело.</li>
    </ul>
    <p class="tip"><b>Варианты.</b> Поле 6 × 6 с двумя амазонками — быстрая партия, 10 × 10 с четырьмя — классическая версия автора игры. Оба можно выбрать в настройках.</p>
    <p class="tip"><b>Родственники.</b> В «Квадрафаге» одна фигура пытается сбежать с доски, а соперник загораживает ей путь фишками; потом роли меняются. В «Конских яблоках» два коня скачут по доске и оставляют за собой непроходимые метки. А в «Коллекционере» на поле 6 × 6 каждый ход отмечают любую клетку и вычёркивают пустую соседнюю — побеждает самая большая связная группа отметок.</p>`,
  'amz.h.origin': 'Откуда игра',
  'amz.origin': `
    <p>Идея «поедания клеток» старше самой игры. В 1940-е Дэвид Сильверман придумал головоломку <i>Quadraphage</i> («пожиратель квадратов»): фигура пытается удрать с доски, а противник ставит на её пути фишки. В 1981 году Алекс Рэндольф выпустил игру <i>Pferdeäpfel</i>, где кони оставляют за собой клетки, на которые больше нельзя вставать.</p>
    <p>Сами «Амазонки» придумал аргентинец Вальтер Замкаускас в 1988 году, а напечатал в 1992-м в журнале головоломок <i>El Acertijo</i>. Его находка — стрела: сжечь можно не любую клетку и не обязательно ту, с которой ушёл, а только видимую с нового места амазонки.</p>
    <p>Игра прославилась огромным числом вариантов: на первом ходу их больше тысячи — гораздо больше, чем в шахматах. Поэтому «Амазонки» стали любимым полигоном для программистов и теоретиков комбинаторных игр.</p>`,
});

addStrings('en', {
  'amz.title': 'Amazons',
  'amz.tagline': 'queens with flaming arrows on a shrinking board',
  'amz.size': 'Board:',
  'amz.size.6': '6 × 6, 2 amazons each',
  'amz.size.8': '8 × 8, 3 amazons each',
  'amz.size.10': '10 × 10, 4 amazons each',
  'amz.mode': 'Play:',
  'amz.mode.pvp': 'two players',
  'amz.mode.easy': 'vs computer (easy)',
  'amz.mode.normal': 'vs computer (normal)',
  'amz.mode.hard': 'vs computer (strong)',
  'amz.again': 'again!',
  'amz.p0': 'Blue',
  'amz.p1': 'Red',
  'amz.cpu': 'Computer',
  'amz.free': 'free: {n}/{k}',
  'amz.room': 'squares: {n}',
  'amz.turn.pick': '{name}: pick an amazon',
  'amz.turn.step': '{name}: where does she go?',
  'amz.turn.shoot': '{name}: now shoot!',
  'amz.you.pick': 'Your move: pick an amazon',
  'amz.you.step': 'Where does she go?',
  'amz.you.shoot': 'Now shoot!',
  'amz.thinking': '{name} is thinking…',
  'amz.turn.them': '{name} is moving…',
  'amz.online.wait': 'Waiting for the other player…',
  'amz.online.note': 'You’re playing online: the room creator starts new games and picks the board size.',
  'amz.online.waitnew': '{name} will start the next game',
  'amz.next': '{name} starts the next game',
  'amz.win': '{name} wins!',
  'amz.why': 'The other side has no moves left.',
  'amz.say.good': ['Aha!', 'That’s it', 'My land!', 'Heh', 'Not bad'],
  'amz.say.trap': ['Gotcha!', 'Stay there', 'Locked in', 'Not a step!'],
  'amz.say.trapped': ['Hey, let me out!', 'Oops…', 'I’m locked in!'],
  'amz.say.oops': ['Oops…', 'Shouldn’t have', 'Hmm…', 'Uh-oh'],
  'amz.say.worried': ['Getting tight…', 'Hey now', 'Careful…'],
  'amz.say.sealed': ['Everyone to their rooms', 'Borders closed', 'Now we count squares'],
  'amz.say.win': ['Hooray!', 'Victory!', 'Last one standing!'],
  'amz.say.lose': ['Rematch?', 'Oh well…', 'Next time'],
  'amz.h.how': 'How to play',
  'amz.how': `
    <p><b>You need:</b> two players, a chessboard and three pieces each — the <b>amazons</b>. On paper an 8 × 8 grid and a pencil will do: just shade the burnt squares.</p>
    <p><b>Goal:</b> make the last move. Whoever can’t move loses.</p>
    <ol>
      <li><b>Step.</b> Pick one of your amazons and move it like a chess queen: any distance in a straight line or diagonal.</li>
      <li><b>Shoot.</b> From its new square the amazon fires a burning arrow — also like a queen, in any direction. The square where the arrow lands <b>burns</b> for good. Squares it flies over are unharmed, and it may even land on the square the amazon just left.</li>
      <li>Neither amazons nor arrows can pass through burnt squares or any piece — no jumping.</li>
      <li>The board burns away turn by turn. The first player who can’t make a move (all their amazons are boxed in) loses.</li>
    </ol>
    <p class="hand">Tap your amazon, then where it goes, then where it shoots. Changed your mind? Tap the amazon again.</p>`,
  'amz.h.tips': 'Tricks',
  'amz.tips': `
    <ul>
      <li>It’s a fight for <b>territory</b>. Late in the game the board breaks into closed “rooms”, each owned by one side. Whoever owns more squares in total will usually make the last move.</li>
      <li>Once you’re alone in a room, walk it <b>one square at a time</b>, burning each square as you leave it. Don’t let your own arrow cut off part of your room.</li>
      <li>Keep your amazons <b>mobile</b> and central. A piece pushed against the edge is easy to wall in.</li>
      <li>The arrow is a weapon: drop it right in front of an enemy amazon to shut its door.</li>
      <li>Don’t try to calculate too far: the first move alone has over a thousand options, and sudden reversals are part of the fun.</li>
    </ul>
    <p class="tip"><b>Variants.</b> A 6 × 6 board with two amazons each is a quick game; 10 × 10 with four each is the inventor’s classic version. Both are in the settings.</p>
    <p class="tip"><b>Relatives.</b> In Quadraphage one piece tries to escape the board while the other player blocks it with counters, then you swap roles. In Pferdeäpfel two knights hop around leaving squares no one may land on. And in Collector, on a 6 × 6 grid you mark any square and cross out an empty neighbour each turn — the biggest connected group of marks wins.</p>`,
  'amz.h.origin': 'Where it comes from',
  'amz.origin': `
    <p>The idea of eating squares is older than the game. In the 1940s David Silverman devised the puzzle <i>Quadraphage</i> (“square eater”): a piece tries to run off the board while the opponent drops counters in its way. In 1981 Alex Randolph published <i>Pferdeäpfel</i>, in which knights leave behind squares nobody may land on again.</p>
    <p>Amazons itself was invented by the Argentinian Walter Zamkauskas in 1988 and printed in 1992 in the puzzle magazine <i>El Acertijo</i>. His key idea was the arrow: you can’t burn just any square, nor only the one you left — only a square the amazon can see from where it now stands.</p>
    <p>The game is famous for its enormous number of options: more than a thousand on the very first move, far more than in chess. That made Amazons a favourite testing ground for game programmers and combinatorial game theorists.</p>`,
});
