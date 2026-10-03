import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'dan.title': 'Одуванчики',
  'dan.tagline': 'одни сеют, другой дует — и оба помогают друг другу',
  'dan.size': 'Луг:',
  'dan.variant': 'Правила:',
  'dan.variant.classic': 'обычные',
  'dan.variant.double': 'фора одуванчикам',
  'dan.mode': 'Играем:',
  'dan.mode.pvp': 'вдвоём',
  'dan.mode.easy': 'с компьютером (простой)',
  'dan.mode.normal': 'с компьютером (обычный)',
  'dan.mode.hard': 'с компьютером (сильный)',
  'dan.hint': 'Отмечать клетки, которые зарастут наверняка',
  'dan.swap': 'поменяться ролями',
  'dan.again': 'ещё раз!',
  'dan.p0': 'Синий',
  'dan.p1': 'Красный',
  'dan.cpu': 'Компьютер',
  'dan.role0': 'одуванчики',
  'dan.role1': 'ветер',
  'dan.cells': ['клетка', 'клетки', 'клеток'],
  'dan.empty': 'пусто: {k}',
  'dan.count.p': 'цветы: {k}/{n}',
  'dan.count.w': 'порывы: {k}/{n}',
  'dan.turn.p': '{name}: посадите одуванчик',
  'dan.turn.w': '{name}: куда подует ветер?',
  'dan.you.p': 'Ваш ход: посадите одуванчик',
  'dan.you.w': 'Ваш ход: куда подует ветер?',
  'dan.confirm': 'Нажмите стрелку ещё раз — и дуем!',
  'dan.thinking': '{name} думает…',
  'dan.them': 'Ходит {name}…',
  'dan.online.wait': 'Ждём второго игрока…',
  'dan.online.note': 'Сейчас идёт игра по сети: размер луга, правила и роли выбирает создатель комнаты.',
  'dan.online.waitnew': 'Новую партию начнёт {name}',
  'dan.win.d': 'Побеждает {name}!',
  'dan.win.d.sub': 'Весь луг в одуванчиках.',
  'dan.win.w': 'Побеждает {name}!',
  'dan.win.w.sub': 'Без одуванчиков осталось: {cells}.',
  'dan.ai.side': 'Вы играете за:',
  'dan.say.plant': ['Расти!', 'Вот сюда', 'Пушистик!', 'Ещё один', 'Цвети!'],
  'dan.say.bigGust': ['Спасибо за ветерок!', 'Летите, семена!', 'Ура, засеяно!', 'Ого сколько!'],
  'dan.say.ouch': ['Ой-ой', 'Ну уж нет', 'Хм…', 'Перебор'],
  'dan.say.calm': ['Мимо!', 'Фью-у…', 'Почти ничего', 'Хе-хе', 'Пусто!'],
  'dan.say.meh': ['Эх…', 'Маловато', 'Ну вот'],
  'dan.say.sure': ['Луг наш!', 'Уже не остановить', 'Всё зарастёт!'],
  'dan.say.gloom': ['Ой…', 'Кажется, всё', 'Не успею'],
  'dan.say.win': ['Ура!', 'Победа!', 'Я гений'],
  'dan.say.lose': ['Реванш?', 'В следующий раз…', 'Ну и ладно'],
  'dan.h.how': 'Как играть',
  'dan.how': `
    <p><b>Что нужно:</b> двое, клетчатый «луг» 5 × 5 и роза ветров с восемью направлениями. Один играет за <b>одуванчики</b>, другой — за <b>ветер</b>.</p>
    <p><b>Цель:</b> одуванчики хотят засеять весь луг, ветру достаточно, чтобы к концу осталась хотя бы одна пустая клетка.</p>
    <ol>
      <li>Начинают одуванчики: нажмите на любую клетку, чтобы посадить цветок. Можно сажать на пустую клетку или поверх семечка, но не на другой цветок.</li>
      <li>Потом ветер выбирает направление на розе ветров (по горизонтали, вертикали или диагонали). Каждый цветок на лугу отправляет семена в эту сторону — в <b>каждую клетку</b> по прямой до края луга. Семена сами не размножаются.</li>
      <li>Каждое направление ветер может использовать <b>только один раз</b>.</li>
      <li>После семи посадок и семи порывов игра кончается (одно направление так и остаётся неиспользованным). Луг заполнен целиком — победили одуванчики, есть пустая клетка — победил ветер.</li>
    </ol>`,
  'dan.h.tips': 'Хитрости',
  'dan.tips': `
    <ul>
      <li><b>Неизбежные клетки.</b> Ветер пропустит только одно направление. Значит, клетка, до которой цветы дотянутся по <i>двум</i> ещё не использованным направлениям, обязательно зарастёт. Считайте её уже засеянной и думайте о сомнительных клетках. В настройках можно включить подсказку, которая отмечает такие клетки.</li>
      <li><b>Одуванчикам:</b> первый цветок переживёт все семь порывов, последний — только один. Ранние посадки решают больше всего, а последние удобно тратить на то, чтобы закрыть оставшиеся дыры собой.</li>
      <li><b>Ветру:</b> поздние порывы опаснее ранних — к концу цветов на лугу больше. Тратьте самые «полезные» для одуванчиков направления, пока цветов мало, а безобидные приберегите на потом.</li>
    </ul>
    <p class="tip"><b>Варианты.</b> Если одна сторона всё время выигрывает, попробуйте луг 6 × 6 (легче ветру) или «фору одуванчикам»: в начале сажаются сразу два цветка, а в конце ветер дует дважды подряд. На лугу 7 × 7 засеять всё почти невозможно — играйте две партии, меняясь ролями, и считайте пустые клетки: у кого их, будучи ветром, оказалось больше, тот и выиграл. Ещё есть кооперативный вариант (ветер и одуванчики вместе пытаются засеять как можно больший луг, лучше молча), соло-вариант со случайными посадками по броску кубиков и «соперничающие одуванчики» двух цветов со случайным ветром.</p>`,
  'dan.h.origin': 'Откуда игра',
  'dan.origin': `
    <p>Эту игру придумал сам Бен Орлин. Он работал над совсем другой игрой — с «бомбами» из краски, — и друг подтолкнул его уйти от военной темы. Новое название «Одуванчики» к старой игре не подошло, зато из него выросла целая новая игра про ветер и семена.</p>
    <p>Она относится к большому семейству <b>асимметричных</b> игр, где у соперников разные силы и разные цели — как в «Лисе и гусях» или скандинавском тафле. Особенность «Одуванчиков» в том, что ветер не может не помогать сопернику: каждый порыв разносит семена. Можно лишь помогать как можно меньше. Новички обычно считают, что проще играть за ветер, а опытные игроки — что за одуванчики.</p>`,
});

addStrings('en', {
  'dan.title': 'Dandelions',
  'dan.tagline': 'one side sows, the other blows — and each can’t help helping',
  'dan.size': 'Meadow:',
  'dan.variant': 'Rules:',
  'dan.variant.classic': 'standard',
  'dan.variant.double': 'dandelion handicap',
  'dan.mode': 'Play:',
  'dan.mode.pvp': 'two players',
  'dan.mode.easy': 'vs computer (easy)',
  'dan.mode.normal': 'vs computer (normal)',
  'dan.mode.hard': 'vs computer (strong)',
  'dan.hint': 'Mark squares that are sure to be filled',
  'dan.swap': 'swap roles',
  'dan.again': 'again!',
  'dan.p0': 'Blue',
  'dan.p1': 'Red',
  'dan.cpu': 'Computer',
  'dan.role0': 'dandelions',
  'dan.role1': 'wind',
  'dan.cells': ['square', 'squares'],
  'dan.empty': 'empty: {k}',
  'dan.count.p': 'flowers: {k}/{n}',
  'dan.count.w': 'gusts: {k}/{n}',
  'dan.turn.p': '{name}: plant a dandelion',
  'dan.turn.w': '{name}: which way will the wind blow?',
  'dan.you.p': 'Your move: plant a dandelion',
  'dan.you.w': 'Your move: pick a wind direction',
  'dan.confirm': 'Tap the arrow again to blow!',
  'dan.thinking': '{name} is thinking…',
  'dan.them': '{name} is moving…',
  'dan.online.wait': 'Waiting for the other player…',
  'dan.online.note': 'You’re playing online: the room creator picks the meadow, the rules and the roles.',
  'dan.online.waitnew': '{name} will start the next game',
  'dan.win.d': '{name} wins!',
  'dan.win.d.sub': 'The whole meadow is in bloom.',
  'dan.win.w': '{name} wins!',
  'dan.win.w.sub': 'The wind left {cells} bare.',
  'dan.ai.side': 'You play:',
  'dan.say.plant': ['Grow!', 'Right here', 'Fluffy!', 'One more', 'Bloom!'],
  'dan.say.bigGust': ['Thanks for the breeze!', 'Fly, seeds!', 'So many!', 'Wheee!'],
  'dan.say.ouch': ['Uh-oh', 'Oh no', 'Hmm…', 'Overdid it'],
  'dan.say.calm': ['Missed!', 'Whoosh…', 'Barely a thing', 'Heh', 'Nothing!'],
  'dan.say.meh': ['Ugh…', 'Not much', 'Oh well'],
  'dan.say.sure': ['The meadow is ours!', 'Unstoppable', 'It’ll all bloom!'],
  'dan.say.gloom': ['Oops…', 'That’s it, I think', 'Not enough time'],
  'dan.say.win': ['Hooray!', 'Victory!', 'I’m a genius'],
  'dan.say.lose': ['Rematch?', 'Next time…', 'Whatever'],
  'dan.h.how': 'How to play',
  'dan.how': `
    <p><b>You need:</b> two players, a 5 × 5 “meadow” of squares and a compass rose with eight directions. One player is the <b>dandelions</b>, the other is the <b>wind</b>.</p>
    <p><b>Goal:</b> the dandelions want to cover the entire meadow; the wind just needs one square to stay empty at the end.</p>
    <ol>
      <li>The dandelions go first: tap any square to plant a flower there — on an empty square or on top of a seed, but not on another flower.</li>
      <li>Then the wind picks a direction on the compass (straight or diagonal). Every flower on the meadow sends seeds that way, into <b>every square</b> in a straight line up to the edge. Seeds don’t spread any further.</li>
      <li>The wind may use each direction <b>only once</b>.</li>
      <li>After seven plantings and seven gusts the game ends (one direction is never used). If the meadow is completely covered, the dandelions win; if any square is empty, the wind wins.</li>
    </ol>`,
  'dan.h.tips': 'Tricks',
  'dan.tips': `
    <ul>
      <li><b>Inevitable squares.</b> The wind skips just one direction. So a square that flowers can reach along <i>two</i> unused directions is bound to fill up. Count it as done and focus on the squares still in doubt. A setting can mark those squares for you.</li>
      <li><b>Dandelions:</b> your first flower enjoys all seven gusts, your last only one. Early plantings matter most; late ones are best spent plugging the remaining holes directly.</li>
      <li><b>Wind:</b> late gusts hurt more than early ones — by then there are more flowers. Use up the directions that would help the dandelions most while the meadow is still sparse, and save the harmless ones for later.</li>
    </ul>
    <p class="tip"><b>Variations.</b> If one side keeps winning, try a 6 × 6 meadow (easier for the wind) or the “dandelion handicap”: two flowers are planted at the start and the wind blows twice in a row at the end. On a 7 × 7 meadow filling everything is nearly impossible — play two games, swapping roles, and count the empty squares you leave as the wind. There’s also a cooperative version (wind and dandelions try to fill as large a meadow as they can, ideally without talking), a solo version with flowers placed by dice rolls, and “rival dandelions” in two colors with a random wind.</p>`,
  'dan.h.origin': 'Where it comes from',
  'dan.origin': `
    <p>Ben Orlin invented this one himself. He was working on a different game about paint “bombs” when a friend nudged him away from the warlike theme. The new name, “Dandelions,” didn’t fit the old game — but it grew into a whole new game about wind and seeds.</p>
    <p>It belongs to the big family of <b>asymmetric</b> games, where the two sides have different powers and different goals — like Fox and Geese or the Viking game tafl. The twist here is that the wind can’t avoid helping its opponent: every gust spreads seeds. It can only try to help as little as possible. Beginners tend to think the wind has the easier job; experienced players tend to think the opposite.</p>`,
});
