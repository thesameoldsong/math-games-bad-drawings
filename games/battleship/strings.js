import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'bs.title': 'Морской бой',
  'bs.tagline': 'залпы вслепую: сколько попало — скажут, куда — нет',
  'bs.mode': 'Играем:',
  'bs.mode.pvp': 'вдвоём',
  'bs.mode.easy': 'с компьютером (простой)',
  'bs.mode.normal': 'с компьютером (обычный)',
  'bs.mode.hard': 'с компьютером (хитрый)',
  'bs.report': 'Доклад:',
  'bs.report.count': 'число попаданий',
  'bs.report.exact': 'каждый выстрел',
  'bs.notes': 'Пометки:',
  'bs.notes.auto': 'авто-выводы',
  'bs.notes.off': 'номера залпов',
  'bs.again': 'ещё раз!',
  'bs.p0': 'Синий',
  'bs.p1': 'Красный',
  'bs.cpu': 'Компьютер',
  'bs.score': 'потоплено {n}/5',
  'bs.salvos': ['залп', 'залпа', 'залпов'],
  'bs.hits': ['попадание', 'попадания', 'попаданий'],

  'bs.setup.hint': 'Тащите корабль, чтобы передвинуть.',
  'bs.setup.hint2': 'Коснитесь корабля — он повернётся.',
  'bs.setup.bad': 'Тут не помещается',
  'bs.shuffle': 'перемешать',
  'bs.ready': 'готово',
  'bs.setup.status': '{name}: расставьте корабли',
  'bs.setup.you': 'Расставьте корабли',
  'bs.setup.wait': 'Ждём, пока {name} расставит флот…',
  'bs.cover.status': 'Передайте устройство: {name}',
  'bs.cover.title': 'Ход за: {name}',
  'bs.cover.note': 'Соперник, не подглядывайте!',
  'bs.cover.btn': 'показать',
  'bs.turn': '{name}: выберите {k} клетки',
  'bs.turn1': '{name}: выберите клетку',
  'bs.turn.you': 'Ваш залп: выберите {k} клетки',
  'bs.turn.you1': 'Ваш залп: выберите клетку',
  'bs.turn.them': 'Залп за {name}…',
  'bs.thinking': '{name} целится…',
  'bs.pass.status': 'Передайте устройство сопернику',
  'bs.pick': 'Выбрано {a} из {b}',
  'bs.fire': 'огонь!',
  'bs.pass': 'передать ход',
  'bs.mine': 'ваш флот',
  'bs.mine.of': 'флот: {name}',
  'bs.rep.miss': 'Залп {k}: мимо',
  'bs.rep.hits': 'Залп {k}: {hits}',
  'bs.rep.sunk': 'потоплен {len}-палубный!',
  'bs.rep.sunk2': 'потоплены: {list}!',
  'bs.inc.miss': 'По вам: мимо',
  'bs.inc.hits': 'По вам: {hits}',
  'bs.inspect': 'Залп {k}: {hits} из {n}',
  'bs.first': 'Первый залп за вами',
  'bs.online.wait': 'Ждём второго игрока…',
  'bs.online.note': 'Сейчас идёт игра по сети: новую партию и правила доклада выбирает создатель комнаты.',
  'bs.online.waitnew': 'Новую партию начнёт {name}',
  'bs.win': 'Побеждает {name}!',
  'bs.win.sub': 'Весь флот на дне за {n}',

  'bs.say.ready': ['Флот готов!', 'По местам!', 'К бою!'],
  'bs.say.miss': ['Мимо…', 'Одна вода', 'Пусто', 'Хм'],
  'bs.say.phew': ['Мимо!', 'Не там ищешь', 'Хе-хе', 'Тёпленько… нет'],
  'bs.say.hit': ['Есть одно!', 'Что-то задели', 'Ага!'],
  'bs.say.hits': ['Ого, сразу {n}!', 'Накрыли!', 'Есть контакт!', 'Прямо в цель'],
  'bs.say.ouch': ['Ай!', 'Пробоина!', 'Ой-ой', 'Полундра!'],
  'bs.say.sank': ['Ко дну!', 'Буль-буль', 'Готов!', 'Потоплен!'],
  'bs.say.sunk': ['Мой {len}-палубный!', 'Тонем!', 'Эх, корабль…', 'Спасайся кто может'],
  'bs.say.win': ['Победа!', 'Адмирал тут я', 'Ура-а!'],
  'bs.say.lose': ['Реванш?', 'Все на дне…', 'В другой раз'],

  'bs.h.how': 'Как играть',
  'bs.how': `
    <p><b>Что нужно:</b> двое, у каждого — два квадрата 10 × 10 на бумаге: на одном свой флот, на другом — пометки о залпах по сопернику.</p>
    <p><b>Цель:</b> первым потопить все пять кораблей соперника.</p>
    <ol>
      <li>Тайно расставьте <b>пять кораблей</b> длиной 5, 4, 3, 3 и 2 клетки — каждый по прямой, по горизонтали или вертикали. Корабли не должны налезать друг на друга. Здесь корабль можно перетащить, а касанием — повернуть.</li>
      <li>Ходите по очереди. За ход вы даёте <b>залп из трёх выстрелов</b>: выберите три клетки на поле соперника и нажмите «огонь!».</li>
      <li>Соперник сообщает только, <b>сколько</b> из трёх выстрелов попало, — но не какие именно. Разбираться, где корабли, придётся самим.</li>
      <li>Когда подбиты все клетки корабля, он <b>тонет</b>, и хозяин обязан об этом сказать, назвав длину корабля.</li>
      <li>Кто первым пустит на дно весь флот соперника — тот и победил.</li>
    </ol>
    <p>Номер на клетке — номер залпа. Если из залпа удаётся точно понять, что попало, а что нет, игра ставит крестик (попадание) или точку (мимо) сама. Коснитесь обстрелянной клетки, чтобы вспомнить, чем закончился её залп.</p>`,
  'bs.h.tips': 'Хитрости',
  'bs.tips': `
    <ul>
      <li>Залп «в ноль» — подарок: все три клетки точно пустые. Залп из трёх попаданий — тоже.</li>
      <li>Залп с одним попаданием из трёх можно <b>«расщепить»</b>: следующим залпом бейте рядом только с одной из подозрительных клеток — по ответу станет ясно, где корабль.</li>
      <li>Ставьте выстрелы в шахматном порядке: самый короткий корабль — две клетки, и шахматка его не пропустит.</li>
      <li>Свои корабли не прижимайте друг к другу: рядом стоящие корабли путают соперника, но, найдя один, он быстро найдёт и второй.</li>
    </ul>
    <p class="tip"><b>Другие правила.</b> Привычный нам морской бой — по одному выстрелу, с точным ответом «мимо», «ранил» или «убил», а после попадания стреляют ещё раз. Классический флот там другой: один четырёхпалубный, два трёхпалубных, три двухпалубных и четыре одиночки, и вплотную корабли не ставят. Есть и вариант «залп», где число выстрелов за ход равно числу ваших уцелевших кораблей. В настройках можно включить точный доклад о каждом выстреле — игра станет быстрее и проще.</p>`,
  'bs.h.origin': 'Откуда игра',
  'bs.origin': `
    <p>Задолго до пластиковых коробок морской бой был игрой на бумаге в клеточку: две сетки, карандаш и немного терпения. Откуда именно она взялась, никто точно не знает — обычно её историю ведут примерно с Первой мировой войны, когда морские сражения были у всех на слуху.</p>
    <p>В 1930-х появились печатные блокноты с готовыми сетками — один из них так и назывался: «Залп» (<i>Salvo</i>). А в 1967-м компания Milton Bradley выпустила знаменитую версию с пластиковыми доской и колышками. В СССР игра жила в тетрадях — со своим флотом и правилами «ранил / убил».</p>
    <p>Здесь — версия, которую любит Бен Орлин: стреляют тройками, а в ответ слышат лишь число попаданий. Из простой угадайки получается настоящая головоломка на логику и вероятности.</p>`,
});

addStrings('en', {
  'bs.title': 'Battleship',
  'bs.tagline': 'blind salvos: you learn how many hit, not which',
  'bs.mode': 'Play:',
  'bs.mode.pvp': 'two players',
  'bs.mode.easy': 'vs computer (easy)',
  'bs.mode.normal': 'vs computer (normal)',
  'bs.mode.hard': 'vs computer (sneaky)',
  'bs.report': 'Reports:',
  'bs.report.count': 'hit count only',
  'bs.report.exact': 'every shot',
  'bs.notes': 'Notes:',
  'bs.notes.auto': 'auto deductions',
  'bs.notes.off': 'salvo numbers',
  'bs.again': 'again!',
  'bs.p0': 'Blue',
  'bs.p1': 'Red',
  'bs.cpu': 'Computer',
  'bs.score': 'sunk: {n}/5',
  'bs.salvos': ['salvo', 'salvos'],
  'bs.hits': ['hit', 'hits'],

  'bs.setup.hint': 'Drag a ship to move it.',
  'bs.setup.hint2': 'Tap a ship to turn it.',
  'bs.setup.bad': 'It doesn’t fit there',
  'bs.shuffle': 'shuffle',
  'bs.ready': 'ready',
  'bs.setup.status': '{name}: place your ships',
  'bs.setup.you': 'Place your ships',
  'bs.setup.wait': 'Waiting for {name} to place the fleet…',
  'bs.cover.status': 'Pass the device to {name}',
  'bs.cover.title': '{name}’s turn',
  'bs.cover.note': 'Opponent, no peeking!',
  'bs.cover.btn': 'show',
  'bs.turn': '{name}: pick {k} squares',
  'bs.turn1': '{name}: pick a square',
  'bs.turn.you': 'Your salvo: pick {k} squares',
  'bs.turn.you1': 'Your salvo: pick a square',
  'bs.turn.them': '{name} is firing…',
  'bs.thinking': '{name} is aiming…',
  'bs.pass.status': 'Pass the device to your opponent',
  'bs.pick': '{a} of {b} picked',
  'bs.fire': 'fire!',
  'bs.pass': 'pass the turn',
  'bs.mine': 'your fleet',
  'bs.mine.of': 'fleet: {name}',
  'bs.rep.miss': 'Salvo {k}: all missed',
  'bs.rep.hits': 'Salvo {k}: {hits}',
  'bs.rep.sunk': 'you sank a {len}!',
  'bs.rep.sunk2': 'you sank: {list}!',
  'bs.inc.miss': 'At you: all missed',
  'bs.inc.hits': 'At you: {hits}',
  'bs.inspect': 'Salvo {k}: {hits} of {n}',
  'bs.first': 'You fire first',
  'bs.online.wait': 'Waiting for the other player…',
  'bs.online.note': 'You’re playing online: the room creator starts new games and picks the reporting rule.',
  'bs.online.waitnew': '{name} will start the next game',
  'bs.win': '{name} wins!',
  'bs.win.sub': 'Whole fleet sunk in {n}',

  'bs.say.ready': ['Fleet ready!', 'Battle stations!', 'Let’s go'],
  'bs.say.miss': ['Missed…', 'Just water', 'Nothing', 'Hmm'],
  'bs.say.phew': ['Miss!', 'Not even close', 'Heh', 'Warm… nope'],
  'bs.say.hit': ['Got one!', 'Something’s there', 'Aha!'],
  'bs.say.hits': ['Whoa, {n} at once!', 'Bracketed!', 'Bullseye!', 'Right on target'],
  'bs.say.ouch': ['Ouch!', 'We’re hit!', 'Uh-oh', 'Mayday!'],
  'bs.say.sank': ['Down she goes!', 'Glub glub', 'Sunk it!', 'Bye-bye boat'],
  'bs.say.sunk': ['My {len}!', 'We’re sinking!', 'Not my ship…', 'Abandon ship!'],
  'bs.say.win': ['Victory!', 'I’m the admiral now', 'Hooray!'],
  'bs.say.lose': ['Rematch?', 'All at the bottom…', 'Next time'],

  'bs.h.how': 'How to play',
  'bs.how': `
    <p><b>You need:</b> two players, each with two 10 × 10 grids on paper — one for your own fleet, one for notes about your shots at the opponent.</p>
    <p><b>Goal:</b> be the first to sink all five enemy ships.</p>
    <ol>
      <li>Secretly place <b>five ships</b> of lengths 5, 4, 3, 3 and 2 — each in a straight horizontal or vertical line, with no overlaps. Here you can drag a ship to move it and tap it to turn it.</li>
      <li>Take turns. On your turn you fire a <b>salvo of three shots</b>: pick three squares on the enemy grid and press “fire!”.</li>
      <li>Your opponent tells you only <b>how many</b> of the three hit — not which ones. Working out where the ships are is up to you.</li>
      <li>When every square of a ship has been hit, it <b>sinks</b>, and its owner must announce it, saying the ship’s length.</li>
      <li>The first to send the whole enemy fleet to the bottom wins.</li>
    </ol>
    <p>The number in a square is its salvo number. Whenever a salvo pins down exactly what hit and what missed, the game draws a cross (hit) or a dot (miss) for you. Tap a fired square to recall how its salvo went.</p>`,
  'bs.h.tips': 'Tricks',
  'bs.tips': `
    <ul>
      <li>A salvo with zero hits is a gift: all three squares are empty. So is a salvo with three hits.</li>
      <li>Got one hit out of three? <b>Split</b> it: next time fire near just one of the suspects — the answer tells you where the ship is.</li>
      <li>Shoot in a checkerboard pattern: the smallest ship is two squares long, so a checkerboard can’t miss it.</li>
      <li>Don’t pack your own ships together: neighbours can confuse the shooter, but once one is found the other goes down fast.</li>
    </ul>
    <p class="tip"><b>Other rules.</b> The everyday version fires one shot at a time with an exact answer — “miss”, “hit” or “sunk” — and often a hit earns another shot. Fleets vary too: the Russian notebook game uses one ship of four, two of three, three of two and four single squares, and ships may not touch. In the “salvo” variant you get one shot per ship you still have afloat. In the settings you can switch on exact reports for every shot — a faster, simpler game.</p>`,
  'bs.h.origin': 'Where it comes from',
  'bs.origin': `
    <p>Long before plastic boxes, Battleship was a game for squared paper: two grids, a pencil and a bit of patience. Nobody knows exactly who invented it; its story is usually traced back to around the First World War, when naval battles were on everyone’s mind.</p>
    <p>In the 1930s printed pads with ready-made grids appeared — one of them was simply called <i>Salvo</i>. Then in 1967 Milton Bradley released the famous version with plastic boards and pegs. Elsewhere it lived on in school notebooks, each country with its own fleet and its own rules.</p>
    <p>This is Ben Orlin’s favourite version: shots come in threes and all you hear back is the number of hits. A simple guessing game turns into a real puzzle of logic and probability.</p>`,
});
