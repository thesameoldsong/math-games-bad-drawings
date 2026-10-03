import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'rt.title': 'Гонки на бумаге',
  'rt.tagline': 'физика инерции на листке в клеточку',
  'rt.track': 'Трасса:',
  'rt.track.loop': 'Кольцо',
  'rt.track.bean': 'Фасолина',
  'rt.track.pin': 'Шпилька',
  'rt.penalty': 'Авария:',
  'rt.penalty.1': 'пропуск 1 хода',
  'rt.penalty.2': 'пропуск 2 ходов',
  'rt.penalty.3': 'пропуск 3 ходов',
  'rt.penalty.out': 'сразу проигрыш',
  'rt.mode': 'Играем:',
  'rt.mode.pvp': 'вдвоём',
  'rt.mode.easy': 'с компьютером (новичок)',
  'rt.mode.normal': 'с компьютером (гонщик)',
  'rt.mode.hard': 'с компьютером (чемпион)',
  'rt.again': 'ещё заезд!',
  'rt.p0': 'Синий',
  'rt.p1': 'Красный',
  'rt.cpu': 'Компьютер',
  'rt.card': 'круг: {pct}%\nскорость: {v}',
  'rt.card.pits': 'в ремонте: {n}',
  'rt.card.done': 'финиш!',
  'rt.turn': 'Ходит {name}',
  'rt.turn.again': '{name} ходит снова — соперник в ремонте',
  'rt.turn.last': 'Последний шанс: {name} может успеть на финиш',
  'rt.thinking': '{name} думает…',
  'rt.turn.you': 'Ваш ход',
  'rt.turn.you.last': 'Последний шанс догнать!',
  'rt.turn.them': 'Ходит {name}…',
  'rt.confirm': 'Нажмите ещё раз — и вперёд',
  'rt.doomed': 'Тормозить поздно: все пути ведут в стену. Нажмите на поле',
  'rt.confirm.crash': 'Там стена! Нажмите ещё раз, если уверены',
  'rt.online.wait': 'Ждём второго игрока…',
  'rt.online.note': 'Сейчас идёт игра по сети: новый заезд начинает, а трассу и штраф выбирает создатель комнаты.',
  'rt.online.waitnew': 'Новый заезд начнёт {name}',
  'rt.win': 'Побеждает {name}!',
  'rt.tie': 'Ничья!',
  'rt.why.finish': 'Первым на финише',
  'rt.why.photo': 'Фотофиниш: оба на финише, но у победителя запас больше',
  'rt.why.tie': 'Оба на финише и ровно на одном месте',
  'rt.why.crash': 'У соперника авария — а с ней и конец гонки',
  'rt.next': 'Следующий заезд начинает {name}',
  'say.crash': ['Бабах!', 'Ой-ой-ой', 'Мои колёса!', 'Где тормоза?!', 'Ай!'],
  'say.gloat': ['Бип-бип!', 'Осторожнее!', 'Хе-хе', 'Аккуратнее!'],
  'say.fast': ['Вжух!', 'Полный газ!', 'Ветер в ушах!', 'Йи-ха!'],
  'say.pass': ['Обгоняю!', 'Пока-пока!', 'Догоняй!', 'Я впереди!'],
  'say.passed': ['Эй!', 'Ну погоди…', 'Ещё не вечер'],
  'say.pits': ['Чиню…', 'Меняю колесо', 'Ещё минутку…'],
  'say.finish': ['Финиш!', 'Есть!', 'Успеешь?'],
  'say.chase': ['Ещё не всё!', 'Догоню!', 'Последний рывок!'],
  'say.win': ['Ура!', 'Победа!', 'Я чемпион!'],
  'say.lose': ['Реванш?', 'В следующий раз…', 'Почти!'],
  'rt.h.how': 'Как играть',
  'rt.how': `
    <p><b>Что нужно:</b> двое, лист в клеточку и трасса. Машины ездят по узлам сетки — точкам, где пересекаются линии.</p>
    <p><b>Цель:</b> проехать круг и пересечь клетчатую линию финиша раньше соперника. Едем по часовой стрелке — вверх от старта, как показывают серые стрелки.</p>
    <ol>
      <li><b>Инерция.</b> Машина повторяет свой прошлый ход: сколько клеток прошла вправо-влево и вверх-вниз, столько пройдёт и сейчас. Но по каждой оси можно добавить или убавить <b>одну клетку</b>. Получается 9 вариантов — они обведены кружками вокруг точки «по инерции».</li>
      <li>В начале гонки машина стоит, поэтому первый ход — на одну клетку (или на месте).</li>
      <li><b>Авария.</b> Если путь задевает стену или машина оказывается вне трассы, она ставится на ближайшую точку трассы, останавливается и <b>пропускает два хода</b> (штраф можно изменить в настройках). Такие ходы помечены крестиком.</li>
      <li>Нельзя встать в точку, где сейчас стоит соперник. Проезжать сквозь неё и через чужие следы можно.</li>
      <li>Кто первым пересёк финиш — побеждает. Если первый игрок финиширует, второй всё равно делает свой ход в этом раунде; финишировали оба — побеждает тот, кто уехал за линию дальше, а если оба встали вровень — ничья. Линия засчитывается, даже если сразу за ней машина врезалась в стену.</li>
    </ol>
    <p>Нажмите на кружок, чтобы увидеть путь, и ещё раз — чтобы поехать. Мышкой хватит одного щелчка.</p>`,
  'rt.h.tips': 'Хитрости',
  'rt.tips': `
    <ul>
      <li><b>Тормозить дольше, чем кажется.</b> Каждый ход скорость падает только на единицу. Со скоростью 4 до полной остановки проедете 4 + 3 + 2 + 1 = 10 клеток.</li>
      <li>Входите в поворот снаружи, срезайте по внутренней стороне и выходите снова наружу — как настоящие гонщики.</li>
      <li>Разгоняйтесь по диагонали: так машина набирает скорость сразу по двум осям.</li>
      <li>При обычном штрафе авария стоит трёх ходов: сам ход и два пропуска. Иногда это всё равно быстрее, чем долго тормозить, — но лучше не проверять.</li>
    </ul>
    <p class="tip"><b>Варианты из книги.</b> Штраф за аварию можно ужесточить — вплоть до мгновенного проигрыша (переключается в настройках). Можно играть втроём-вчетвером на большом листе. Бывают «масляные пятна»: по ним машина едет без единой поправки. В «Охоте за флажками» трассы нет: на поле разбросаны флажки, и очко получает тот, кто первым остановится точно на флажке. В «Воротах» нужно по порядку проехать сквозь пронумерованные ворота. А чтобы уравнять шансы на старте, линию старта рисуют наискосок и дают второму игроку выбрать место.</p>`,
  'rt.h.origin': 'Откуда игра',
  'rt.origin': `
    <p>У «Гонок» нет известного автора: это народная игра, и, похоже, она появилась в Западной Европе в 1960-х. В 1971 году во Франции её выпустили под названием <i>Le Zip</i>, а в 1973-м Мартин Гарднер рассказал о ней в своей колонке в <i>Scientific American</i> — в США её тогда почти никто не знал.</p>
    <p>После этого игра быстро прижилась в школах. Говорят, одна из первых компьютерных версий так увлекла студентов Иллинойсского университета, что её на неделю запретили.</p>
    <p>Учителя физики любят её не меньше школьников: это первый закон Ньютона в чистом виде. Тело движется так же, как двигалось, пока на него не подействует сила, — а сила здесь ограничена одной клеткой за ход. Поэтому разворот на полной скорости так же невозможен, как и на настоящей дороге.</p>`,
});

addStrings('en', {
  'rt.title': 'Racetrack',
  'rt.tagline': 'inertia on a sheet of graph paper',
  'rt.track': 'Track:',
  'rt.track.loop': 'Ring',
  'rt.track.bean': 'Bean',
  'rt.track.pin': 'Hairpin',
  'rt.penalty': 'Crash:',
  'rt.penalty.1': 'lose 1 turn',
  'rt.penalty.2': 'lose 2 turns',
  'rt.penalty.3': 'lose 3 turns',
  'rt.penalty.out': 'lose the race',
  'rt.mode': 'Play:',
  'rt.mode.pvp': 'two players',
  'rt.mode.easy': 'vs computer (rookie)',
  'rt.mode.normal': 'vs computer (racer)',
  'rt.mode.hard': 'vs computer (champion)',
  'rt.again': 'race again!',
  'rt.p0': 'Blue',
  'rt.p1': 'Red',
  'rt.cpu': 'Computer',
  'rt.card': 'lap: {pct}%\nspeed: {v}',
  'rt.card.pits': 'in the pits: {n}',
  'rt.card.done': 'finished!',
  'rt.turn': '{name} to move',
  'rt.turn.again': '{name} again — rival is in the pits',
  'rt.turn.last': 'Last chance for {name} to finish too',
  'rt.thinking': '{name} is thinking…',
  'rt.turn.you': 'Your move',
  'rt.turn.you.last': 'Last chance to catch up!',
  'rt.turn.them': '{name} is moving…',
  'rt.confirm': 'Tap again to go',
  'rt.doomed': 'Too late to brake: every path hits a wall. Tap the board',
  'rt.confirm.crash': 'That hits the wall! Tap again if you’re sure',
  'rt.online.wait': 'Waiting for the other player…',
  'rt.online.note': 'You’re playing online: the room creator starts new races and picks the track and the crash penalty.',
  'rt.online.waitnew': '{name} will start the next race',
  'rt.win': '{name} wins!',
  'rt.tie': 'A tie!',
  'rt.why.finish': 'First across the line',
  'rt.why.photo': 'Photo finish: both crossed, the winner got farther',
  'rt.why.tie': 'Both crossed and ended exactly level',
  'rt.why.crash': 'The other car left the track',
  'rt.next': '{name} starts the next race',
  'say.crash': ['Crash!', 'Oh no no no', 'My wheels!', 'Where are the brakes?!', 'Ouch!'],
  'say.gloat': ['Beep beep!', 'Careful!', 'Heh', 'Watch it!'],
  'say.fast': ['Vroom!', 'Full throttle!', 'Wind in my hair!', 'Yee-haw!'],
  'say.pass': ['Passing!', 'Bye-bye!', 'Catch me!', 'I’m ahead!'],
  'say.passed': ['Hey!', 'Just wait…', 'Not over yet'],
  'say.pits': ['Fixing…', 'Changing a tyre', 'One more minute…'],
  'say.finish': ['Finished!', 'Yes!', 'Can you make it?'],
  'say.chase': ['Not over yet!', 'I’ll catch you!', 'Final push!'],
  'say.win': ['Hooray!', 'Victory!', 'Champion!'],
  'say.lose': ['Rematch?', 'Next time…', 'So close!'],
  'rt.h.how': 'How to play',
  'rt.how': `
    <p><b>You need:</b> two players, graph paper and a track. Cars drive on the grid points, where the lines cross.</p>
    <p><b>Goal:</b> drive one lap and cross the chequered finish line before your rival. Cars go clockwise — up from the start, as the grey arrows show.</p>
    <ol>
      <li><b>Inertia.</b> Your car repeats its previous move: as many squares left/right and up/down as last time. But on each axis you may add or remove <b>one square</b>. That gives 9 options — circled around the “coasting” point.</li>
      <li>Cars start at rest, so the first move is a single step (or staying put).</li>
      <li><b>Crash.</b> If your path touches a wall or ends off the track, the car is put on the nearest track point, stops dead and <b>misses two turns</b> (you can change the penalty in the settings). Such moves are marked with a cross.</li>
      <li>You may not stop on the point where your rival is right now. Driving through it, or over old trails, is fine.</li>
      <li>First across the finish line wins. If the first player finishes, the second still gets their move that round; if both finish, whoever ends farther past the line wins, and dead level is a tie. Crossing the line counts even if the car hits a wall right after it.</li>
    </ol>
    <p>Tap a circle to preview the path, tap it again to drive. With a mouse, one click is enough.</p>`,
  'rt.h.tips': 'Tricks',
  'rt.tips': `
    <ul>
      <li><b>Braking takes longer than you think.</b> Speed drops by only one per turn: from speed 4 you need 4 + 3 + 2 + 1 = 10 squares to stop.</li>
      <li>Enter a bend wide, clip the inside, swing wide on the way out — like real racing drivers.</li>
      <li>Accelerate diagonally: that builds speed on both axes at once.</li>
      <li>With the usual penalty a crash costs three turns: the move itself plus two missed ones. Sometimes that’s still quicker than a long braking — but don’t count on it.</li>
    </ul>
    <p class="tip"><b>Variants from the book.</b> Make crashes harsher — even an instant loss (switch it in the settings). Play with three or four cars on a bigger sheet. Add “oil slicks”: shaded patches where cars can’t change speed at all. In “flag hunt” there’s no track, just flags scattered over the page; a point goes to whoever first stops exactly on a flag. In “gates” you race through numbered gates in order. And to even out the start, draw the start line at a slant and let the second player pick a spot.</p>`,
  'rt.h.origin': 'Where it comes from',
  'rt.origin': `
    <p>Racetrack has no known inventor: it’s a folk game that probably appeared in Western Europe in the 1960s. A French edition came out in 1971 as <i>Le Zip</i>, and in 1973 Martin Gardner wrote about it in his <i>Scientific American</i> column, when hardly anyone in the US had heard of it.</p>
    <p>After that it spread through schools. One early computer version reportedly ate so many hours at the University of Illinois that it was banned for a week.</p>
    <p>Physics teachers love it as much as bored students do: it’s Newton’s first law in action. A body keeps moving as it did until a force changes that — and here the force is capped at one square per turn. That’s why a U-turn at full speed is as impossible here as on a real road.</p>`,
});
