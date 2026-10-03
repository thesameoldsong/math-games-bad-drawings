import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'neu.title': 'Нейтрон',
  'neu.tagline': 'ничейная шайба, которую каждый тянет к себе',
  'neu.mode': 'Играем:',
  'neu.mode.pvp': 'вдвоём',
  'neu.mode.easy': 'с компьютером (простой)',
  'neu.mode.normal': 'с компьютером (обычный)',
  'neu.mode.hard': 'с компьютером (хитрый)',
  'neu.variant': 'Нейтрон ходит:',
  'neu.variant.step': 'на одну клетку',
  'neu.variant.slide': 'до упора',
  'neu.again': 'ещё раз!',
  'neu.p0': 'Синий',
  'neu.p1': 'Красный',
  'neu.cpu': 'Компьютер',
  'neu.home.down': 'дом внизу',
  'neu.home.up': 'дом сверху',
  'neu.turn.neutron': '{name}: сдвиньте нейтрон',
  'neu.turn.piece': '{name}: теперь своя фишка',
  'neu.turn.first': '{name}: первый ход — только фишкой',
  'neu.you.neutron': 'Ваш ход: сдвиньте нейтрон',
  'neu.you.piece': 'Теперь сдвиньте свою фишку',
  'neu.you.first': 'Первый ход — только своей фишкой',
  'neu.thinking': '{name} думает…',
  'neu.turn.them': 'Ходит {name}…',
  'neu.online.wait': 'Ждём второго игрока…',
  'neu.online.note': 'Сейчас идёт игра по сети: новую партию начинает и правила выбирает создатель комнаты.',
  'neu.online.waitnew': 'Ждём, пока {name} нажмёт «ещё раз»',
  'neu.next': 'Следующую партию начинает {name}',
  'neu.win': 'Побеждает {name}!',
  'neu.why.home': 'Нейтрон дома.',
  'neu.why.own-goal': 'Нейтрон закатился в чужой дом.',
  'neu.why.trap': 'Нейтрону некуда идти.',
  'neu.why.stuck': 'Сопернику нечем сходить.',
  'neu.draw': 'Ничья!',
  'neu.why.repeat': 'Позиция повторилась трижды.',
  'neu.why.long': 'Слишком долгая партия.',
  'neu.say.good': ['Ага!', 'Отлично', 'Так-то', 'Хе-хе'],
  'neu.say.trap': ['Попался!', 'Куда теперь?', 'Деваться некуда'],
  'neu.say.oops': ['Ой…', 'Зря я так', 'Ой-ой', 'Хм…'],
  'neu.say.gift': ['Спасибо!', 'Подарок!', 'Ну раз так…'],
  'neu.say.worried': ['Эй-эй', 'Опасно…', 'Ну-ну'],
  'neu.say.win': ['Ура!', 'Гол!', 'Победа!'],
  'neu.say.lose': ['Реванш?', 'Эх…', 'В следующий раз'],
  'neu.say.owngoal': ['Ой, не туда!', 'Автогол…'],
  'neu.say.draw': ['Ничья?', 'Ходим по кругу'],
  'neu.h.how': 'Как играть',
  'neu.how': `
    <p><b>Что нужно:</b> поле 5 × 5, по пять фишек у каждого и одна общая фишка — <b>нейтрон</b>. Фишки стоят в двух крайних рядах, нейтрон — в центре.</p>
    <p><b>Цель:</b> загнать нейтрон в <b>свой</b> ряд — тот, где стояли ваши фишки (он подкрашен вашим цветом).</p>
    <ol>
      <li>Ход состоит из двух частей. Сначала <b>сдвиньте нейтрон</b> на одну клетку в любую сторону, хоть по диагонали.</li>
      <li>Потом <b>сдвиньте одну свою фишку</b> по прямой или диагонали. Остановиться по дороге нельзя: фишка едет, <b>пока не упрётся</b> в край поля или в другую фишку.</li>
      <li>В самом первом ходу партии нейтрон не трогают — только фишку.</li>
    </ol>
    <p><b>Победа:</b> нейтрон попал в ваш ряд (даже если его туда толкнул соперник!) — или соперник не может сдвинуть нейтрон, потому что вы его окружили.</p>
    <p class="tip">Наши добавки к правилам: шагать нейтроном можно только туда, откуда потом найдётся ход фишкой; кому не сделать полный ход — проигрывает. Если одна и та же позиция повторилась трижды или партия длится 200 ходов, это ничья.</p>
    <p class="hand">Нажмите на нейтрон или фишку — точки покажут, куда можно пойти.</p>`,
  'neu.h.tips': 'Хитрости',
  'neu.tips': `
    <ul>
      <li>Пока ваш ряд забит вашими же фишками, нейтрону туда не попасть. <b>Выводите фишки из дома</b> — освобождайте «ворота».</li>
      <li>И наоборот, ставьте свои фишки в <b>дыры чужого ряда</b> — так вы закрываете соперника.</li>
      <li>Прежде чем сходить фишкой, посмотрите, <b>куда сможет шагнуть нейтрон</b> у соперника. Лучшая позиция — когда у него остались только ходы в вашу сторону.</li>
      <li>Ловушку для нейтрона строят из своих фишек и края поля. Следите, сколько у соперника осталось безопасных шагов нейтроном: если один — подумайте, нельзя ли закрыть и его.</li>
    </ul>
    <p class="tip"><b>Другой вариант.</b> В исходных правилах нейтрон тоже едет до упора, как обычные фишки. Это включается в настройках — игра становится резче.</p>`,
  'neu.h.origin': 'Откуда игра',
  'neu.origin': `
    <p>«Нейтрон» придумал Роберт Краус в 1978 году и тогда же описал полтора десятка вариантов правил. Название — из физики: нейтрон не заряжен ни плюсом, ни минусом, и фишка в центре тоже ничья. Каждый ход её двигают оба игрока по очереди, а нужна она каждому у себя дома.</p>
    <p>В 2020 году игра неожиданно ожила в интернете под именем <i>Бобэйл</i> (Bobail). Там нейтрон шагает лишь на одну клетку, как шахматный король, — этот вариант здесь и включён по умолчанию.</p>`,
});

addStrings('en', {
  'neu.title': 'Neutron',
  'neu.tagline': 'a neutral puck that both sides pull home',
  'neu.mode': 'Play:',
  'neu.mode.pvp': 'two players',
  'neu.mode.easy': 'vs computer (easy)',
  'neu.mode.normal': 'vs computer (normal)',
  'neu.mode.hard': 'vs computer (sneaky)',
  'neu.variant': 'The neutron moves:',
  'neu.variant.step': 'one square',
  'neu.variant.slide': 'all the way',
  'neu.again': 'again!',
  'neu.p0': 'Blue',
  'neu.p1': 'Red',
  'neu.cpu': 'Computer',
  'neu.home.down': 'home: bottom',
  'neu.home.up': 'home: top',
  'neu.turn.neutron': '{name}: move the neutron',
  'neu.turn.piece': '{name}: now one of your pieces',
  'neu.turn.first': '{name}: first turn, piece only',
  'neu.you.neutron': 'Your turn: move the neutron',
  'neu.you.piece': 'Now slide one of your pieces',
  'neu.you.first': 'First turn: piece only',
  'neu.thinking': '{name} is thinking…',
  'neu.turn.them': '{name} is moving…',
  'neu.online.wait': 'Waiting for the other player…',
  'neu.online.note': 'You’re playing online: the room creator starts new games and picks the rules.',
  'neu.online.waitnew': 'Waiting for {name} to press “again”',
  'neu.next': '{name} moves first next game',
  'neu.win': '{name} wins!',
  'neu.why.home': 'The neutron made it home.',
  'neu.why.own-goal': 'The neutron rolled into the wrong home.',
  'neu.why.trap': 'The neutron is boxed in.',
  'neu.why.stuck': 'The opponent has no move.',
  'neu.draw': 'A draw!',
  'neu.why.repeat': 'Same position three times.',
  'neu.why.long': 'The game ran too long.',
  'neu.say.good': ['Aha!', 'Nice', 'There we go', 'Heh'],
  'neu.say.trap': ['Gotcha!', 'Where now?', 'Nowhere to go'],
  'neu.say.oops': ['Oops…', 'What did I do', 'Uh-oh', 'Hmm…'],
  'neu.say.gift': ['Thanks!', 'A gift!', 'If you insist…'],
  'neu.say.worried': ['Hey now', 'Careful…', 'Hmm'],
  'neu.say.win': ['Hooray!', 'Goal!', 'Victory!'],
  'neu.say.lose': ['Rematch?', 'Ugh…', 'Next time'],
  'neu.say.owngoal': ['Wrong way!', 'Own goal…'],
  'neu.say.draw': ['A draw?', 'Going in circles'],
  'neu.h.how': 'How to play',
  'neu.how': `
    <p><b>You need:</b> a 5 × 5 board, five pieces each and one shared piece, the <b>neutron</b>. The pieces fill the two outer rows; the neutron sits in the center.</p>
    <p><b>Goal:</b> get the neutron into <b>your own</b> row, the one your pieces started on (tinted in your color).</p>
    <ol>
      <li>A turn has two parts. First <b>move the neutron</b> one square in any direction, diagonals included.</li>
      <li>Then <b>slide one of your pieces</b> in a straight or diagonal line. No stopping halfway: it keeps going <b>until it hits</b> the edge or another piece.</li>
      <li>On the very first turn of the game, skip the neutron and just slide a piece.</li>
    </ol>
    <p><b>You win</b> when the neutron lands in your row (even if your opponent pushed it there!), or when your opponent can’t move the neutron because you’ve boxed it in.</p>
    <p class="tip">Our additions: the neutron may only step where a piece move can follow; a player who can’t make a full turn loses. If the same position comes up three times, or the game reaches 200 moves, it’s a draw.</p>
    <p class="hand">Tap the neutron or a piece and dots will show where it can go.</p>`,
  'neu.h.tips': 'Tricks',
  'neu.tips': `
    <ul>
      <li>As long as your row is full of your own pieces, the neutron can’t get in. <b>Move pieces out of your home</b> to open up a goal.</li>
      <li>The flip side: park your pieces in the <b>gaps of your opponent’s row</b> to shut them out.</li>
      <li>Before sliding a piece, check <b>where your opponent will be able to step the neutron</b>. The dream is leaving them only moves that bring it toward you.</li>
      <li>A cage for the neutron is built from your pieces and the board’s edge. Count how many safe neutron steps your opponent has left: if it’s just one, see whether you can block that one too.</li>
    </ul>
    <p class="tip"><b>A variant.</b> In the original rules the neutron slides all the way, just like the other pieces. Switch it on in settings for a sharper game.</p>`,
  'neu.h.origin': 'Where it comes from',
  'neu.origin': `
    <p>Robert A. Kraus invented Neutron in 1978 and described about fifteen rule variants at the same time. The name comes from physics: a neutron carries no charge, and the middle piece belongs to no one either. Both players take turns moving it, and each wants it back home.</p>
    <p>In 2020 the game had a sudden online revival under the name <i>Bobail</i>, where the neutron only steps one square, like a chess king. That version is the default here.</p>`,
});
