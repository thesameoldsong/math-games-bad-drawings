import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'med.title': 'Посредственность',
  'med.tagline': 'игра, где выигрывает золотая середина',
  'med.rounds': 'Раундов:',
  'med.humans': 'Играют:',
  'med.humans.1': 'я и два компьютера',
  'med.humans.2': 'двое и компьютер',
  'med.humans.3': 'трое за одним экраном',
  'med.level': 'Компьютер:',
  'med.level.easy': 'простой',
  'med.level.normal': 'толковый',
  'med.again': 'ещё раз!',
  'med.p0': 'Синий',
  'med.p1': 'Красный',
  'med.p2': 'Зелёный',
  'med.cpu1': 'Бип',
  'med.cpu2': 'Буп',
  'med.pts': ['очко', 'очка', 'очков'],
  'med.round': 'раунд {r} из {n}',
  'med.pick.you': '{name}: загадайте число',
  'med.pick.you.online': 'Загадайте число',
  'med.pick.wait': 'Ждём: {names}',
  'med.thinking': '{name} думает…',
  'med.mine': 'Ваше число — {x}',
  'med.confirm': 'Загадать {x}',
  'med.choose': 'выберите число',
  'med.cover.title': 'Передайте устройство',
  'med.cover.note': 'остальные — не подглядывать!',
  'med.cover.btn': 'Это я — показать',
  'med.cover.status': 'Число загадывает {name}',
  'med.rev.single': '{name} посередине: +{v}',
  'med.rev.zero': '{name} посередине — но с нулём',
  'med.rev.triple': 'Все трое загадали {v}! Очков никто не получает',
  'med.rev.gave': '{chooser} отдаёт {v} → {name}',
  'med.next': 'дальше',
  'med.next.final': 'итоги',
  'med.tie.line': 'Совпало: {a} и {b} — по {v}',
  'med.assign.you': '{name}, кому отдать {v}?',
  'med.assign.wait': '{name} решает, кому отдать {v}',
  'med.crown.line': 'Посередине двое: {a} и {b} — по {v}',
  'med.crown.you': '{name}, кто победит?',
  'med.crown.wait': '{name} выбирает победителя',
  'med.win': 'Побеждает {name}!',
  'med.win.sub': 'золотая середина: {s}',
  'med.draw': 'Ничья!',
  'med.draw.sub': 'у всех поровну: {s}',
  'med.online.wait': 'Ждём связи с создателем комнаты…',
  'med.online.note': 'По сети играют до трёх человек, каждый со своего устройства. Свободные места занимает компьютер. Кто подключится посреди партии, сразу садится на место отключившегося игрока или компьютера (число, уже загаданное за это место в этом раунде, отменяется). Если связь пропала, через 10 секунд за игрока доиграет компьютер, а после перезагрузки страницы игрок вернётся на своё место. Число раундов, уровень компьютера и новую партию выбирает создатель комнаты.',
  'med.away': 'нет связи',
  'med.away.wait': '{name}: нет связи — скоро подменит компьютер',
  'med.online.waitnew': 'Новую партию начнёт {name}',
  'med.say.gain': ['+{v}!', 'Моё!', 'В самый раз', 'Середнячок!', 'Ни больше ни меньше'],
  'med.say.zero': ['Ноль — тоже число', 'Хм, пусто', 'Ну хоть посередине'],
  'med.say.miss': ['Мимо', 'Эх', 'Хм', 'Почти'],
  'med.say.choose': ['Решаю я!', 'Та-а-ак…', 'Кому бы отдать…', 'Власть!'],
  'med.say.thanks': ['Спасибо!', 'Мерси!', 'Как мило'],
  'med.say.snub': ['Обидно!', 'Ну и ладно', 'Я запомню'],
  'med.say.triple': ['Ого!', 'Великие умы…', 'Синхронно!'],
  'med.say.picked': ['Готово', 'Загадано', 'Тсс…', 'Есть!'],
  'med.say.win': ['Я идеально средний!', 'Золотая середина!', 'Ни рыба ни мясо — и победа!'],
  'med.say.top': ['Перестарался…', 'Слишком хорошо', 'Много — тоже плохо'],
  'med.say.bottom': ['Скромность не помогла', 'Маловато…', 'Эх'],
  'med.say.draw': ['Все одинаковые!', 'Ну и ну', 'Поровну'],
  'med.h.how': 'Как играть',
  'med.how': `
    <p><b>Что нужно:</b> трое игроков, бумага и ручка — изначально хватало салфеток в кафе.</p>
    <p><b>Цель:</b> оказаться <b>посередине</b> — не первым и не последним.</p>
    <ol>
      <li>Каждый раунд все <b>тайно</b> загадывают целое число от 0 до 30. Здесь: нажмите число, потом «Загадать».</li>
      <li>Числа открывают. Чьё число <b>среднее</b> (меньше одного и больше другого) — тот получает столько очков, сколько загадал.</li>
      <li>Если у двоих числа <b>совпали</b>, третий игрок решает, кому из этих двоих отдать очки. Если совпали все три — раунд пустой.</li>
      <li>После последнего раунда (обычно пятого) побеждает не лидер, а тот, у кого <b>средний</b> счёт. Если середину делят двое, победителя выбирает третий.</li>
    </ol>
    <p>За одним устройством передавайте его по кругу: каждый открывает сетку чисел, только когда очередь дошла до него.</p>`,
  'med.h.tips': 'Хитрости',
  'med.tips': `
    <ul>
      <li>Счёт всё время на виду — смотрите на него. <b>Лидеру</b> очки не нужны, <b>отстающему</b> нужны, а тому, кто посередине, важно не перепрыгнуть соседей.</li>
      <li><b>0</b> — надёжный способ ничего не получить: даже оказавшись посередине, вы заработаете ноль. А чтобы получить <b>30</b>, нужен кто-то ещё с 30 — и тогда судьбу очков решает третий.</li>
      <li>Большие числа соблазнительны, но чтобы оказаться посередине с 25, кто-то должен загадать больше.</li>
      <li>Когда решаете, кому отдать очки, думайте о себе: кого выгоднее поднять — того, кто под вами, или того, кто над вами?</li>
      <li>Объединиться против лидера тут не выйдет — да и незачем: побеждает вовсе не лидер.</li>
    </ul>
    <p class="tip"><b>Варианты из книги.</b> Играть можно любым нечётным числом игроков. Если вас чётное число, добавьте воображаемого игрока, который всегда говорит 15. Можно снять верхнюю границу — загадывайте любое число. А для настоящих ценителей: турнир из пяти партий, где чемпион — тот, у кого <i>среднее</i> число побед.</p>`,
  'med.h.origin': 'Откуда игра',
  'med.origin': `
    <p>Игру придумали на ресторанных салфетках брат с сестрой и их друг; одним из авторов был Дуглас Хофштадтер, автор «Гёдель, Эшер, Бах». Он объяснял, почему и итог партии решает середина: дух целого должен совпадать с духом каждой его части.</p>
    <p>У игры есть второе имя — «Хруска». Так звали американского сенатора Романа Хруску, который в 1970 году защищал спорного кандидата в Верховный суд: мол, посредственностей много, и они тоже заслуживают представительства.</p>`,
});

addStrings('en', {
  'med.title': 'Mediocrity',
  'med.tagline': 'the game where the middle wins',
  'med.rounds': 'Rounds:',
  'med.humans': 'Players:',
  'med.humans.1': 'me vs two computers',
  'med.humans.2': 'two of us + computer',
  'med.humans.3': 'three on one screen',
  'med.level': 'Computer:',
  'med.level.easy': 'easy',
  'med.level.normal': 'savvy',
  'med.again': 'again!',
  'med.p0': 'Blue',
  'med.p1': 'Red',
  'med.p2': 'Green',
  'med.cpu1': 'Beep',
  'med.cpu2': 'Boop',
  'med.pts': ['point', 'points'],
  'med.round': 'round {r} of {n}',
  'med.pick.you': '{name}: pick a number',
  'med.pick.you.online': 'Pick a number',
  'med.pick.wait': 'Waiting for {names}',
  'med.thinking': '{name} is thinking…',
  'med.mine': 'Your number is {x}',
  'med.confirm': 'Lock in {x}',
  'med.choose': 'pick a number',
  'med.cover.title': 'Pass the device',
  'med.cover.note': 'everyone else, no peeking!',
  'med.cover.btn': 'It’s me — show',
  'med.cover.status': '{name} is choosing',
  'med.rev.single': '{name} is in the middle: +{v}',
  'med.rev.zero': '{name} is in the middle — with a zero',
  'med.rev.triple': 'All three said {v}! Nobody scores',
  'med.rev.gave': '{chooser} gives {v} → {name}',
  'med.next': 'next',
  'med.next.final': 'results',
  'med.tie.line': 'Same number: {a} and {b} — {v}',
  'med.assign.you': '{name}, who gets the {v}?',
  'med.assign.wait': '{name} decides who gets {v}',
  'med.crown.line': 'Two share the middle: {a} and {b} — {v}',
  'med.crown.you': '{name}, who wins?',
  'med.crown.wait': '{name} picks the winner',
  'med.win': '{name} wins!',
  'med.win.sub': 'perfectly average: {s}',
  'med.draw': 'A draw!',
  'med.draw.sub': 'all equal: {s}',
  'med.online.wait': 'Waiting for the room creator…',
  'med.online.note': 'Online, up to three people play, each on their own device. Free seats are played by the computer. Someone who joins mid-game takes over a disconnected player’s or a computer’s seat right away (a number already picked for that seat this round is dropped). If a player loses connection, the computer stands in after 10 seconds; reloading the page brings them back to their own seat. The room creator picks the rounds, the computer level and starts new games.',
  'med.away': 'no connection',
  'med.away.wait': '{name}: no connection — the computer will step in',
  'med.online.waitnew': '{name} will start the next game',
  'med.say.gain': ['+{v}!', 'Mine!', 'Just right', 'So average!', 'Not too much, not too little'],
  'med.say.zero': ['Zero counts too', 'Hm, nothing', 'At least I’m central'],
  'med.say.miss': ['Missed', 'Ugh', 'Hmm', 'Close'],
  'med.say.choose': ['My call!', 'Well, well…', 'Who deserves it…', 'Power!'],
  'med.say.thanks': ['Thanks!', 'Merci!', 'How kind'],
  'med.say.snub': ['Rude!', 'Fine then', 'I’ll remember this'],
  'med.say.triple': ['Whoa!', 'Great minds…', 'Jinx!'],
  'med.say.picked': ['Done', 'Locked in', 'Shh…', 'Got one!'],
  'med.say.win': ['Perfectly mediocre!', 'The golden mean!', 'Neither here nor there — and I win!'],
  'med.say.top': ['Overdid it…', 'Too good for my own good', 'Too much is bad too'],
  'med.say.bottom': ['Modesty didn’t pay', 'Not enough…', 'Ugh'],
  'med.say.draw': ['We’re all the same!', 'Well, well', 'Even-steven'],
  'med.h.how': 'How to play',
  'med.how': `
    <p><b>You need:</b> three players, pen and paper — restaurant napkins worked for the inventors.</p>
    <p><b>Goal:</b> end up in the <b>middle</b> — neither first nor last.</p>
    <ol>
      <li>Each round everyone <b>secretly</b> picks a whole number from 0 to 30. Here: tap a number, then “Lock in”.</li>
      <li>Reveal the numbers. Whoever picked the <b>middle</b> one (above one pick, below the other) scores that many points.</li>
      <li>If two players picked the <b>same</b> number, the third player decides which of those two gets the points. If all three match, the round is a wash.</li>
      <li>After the last round (usually the fifth) the winner is not the leader but whoever has the <b>middle</b> score. If two share the middle, the third player picks the winner.</li>
    </ol>
    <p>On one device, pass it around: each player opens the number grid only on their own turn.</p>`,
  'med.h.tips': 'Tricks',
  'med.tips': `
    <ul>
      <li>The scores are always on display — use them. The <b>leader</b> doesn’t want points, the <b>last</b> player does, and whoever is in the middle must not leapfrog the neighbours.</li>
      <li><b>0</b> is a safe way to score nothing: even in the middle you earn zero. And to score <b>30</b> you need someone else on 30 too — and then the third player decides.</li>
      <li>Big numbers are tempting, but to be the middle with 25, somebody has to go higher.</li>
      <li>When you hand out tied points, think of yourself: is it better to lift the player below you or the one above?</li>
      <li>Ganging up on the leader doesn’t work here — and isn’t needed: the leader isn’t winning.</li>
    </ul>
    <p class="tip"><b>Variants from the book.</b> Any odd number of players works. With an even number, add an imaginary player who always says 15. You can drop the upper limit and allow any number at all. And for connoisseurs: a tournament of five games, won by whoever has the <i>median</i> number of wins.</p>`,
  'med.h.origin': 'Where it comes from',
  'med.origin': `
    <p>The game was invented on restaurant napkins by two siblings and a friend; one of the inventors was Douglas Hofstadter, author of <i>Gödel, Escher, Bach</i>. He explained why the middle decides the whole game too: the spirit of the whole should match the spirit of its parts.</p>
    <p>Its other name is “Hruska”, after US senator Roman Hruska, who in 1970 defended a controversial Supreme Court nominee by arguing that mediocre people are plentiful and deserve some representation too.</p>`,
});
