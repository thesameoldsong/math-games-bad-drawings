import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'spl.title': 'Клякса',
  'spl.tagline': 'игра про взрывную краску и умение вовремя притормозить',
  'spl.size': 'Поле:',
  'spl.mode': 'Играем:',
  'spl.mode.pvp': 'вдвоём',
  'spl.mode.easy': 'с компьютером (простой)',
  'spl.mode.normal': 'с компьютером (обычный)',
  'spl.mode.hard': 'с компьютером (хитрый)',
  'spl.pats': 'Брызги:',
  'spl.pats.classic': 'одна или все соседи',
  'spl.pats.extended': '+ крестом и наискосок',
  'spl.setup': 'Кляксы:',
  'spl.setup.random': 'раскидать случайно',
  'spl.setup.turns': 'ставить по очереди',
  'spl.again': 'ещё раз!',
  'spl.p0': 'Синий',
  'spl.p1': 'Красный',
  'spl.cpu': 'Компьютер',
  'spl.blobs': ['клякса', 'кляксы', 'клякс'],
  'spl.turn': 'Ходит {name} — выберите свою кляксу',
  'spl.place': '{name} ставит кляксу',
  'spl.place.you': 'Поставьте свою кляксу в пустую клетку',
  'spl.thinking': '{name} думает…',
  'spl.turn.you': 'Ваш ход — выберите свою кляксу',
  'spl.turn.them': 'Ходит {name}…',
  'spl.online.wait': 'Ждём второго игрока…',
  'spl.online.note': 'Сейчас идёт игра по сети: новую партию начинает и настройки выбирает создатель комнаты.',
  'spl.online.waitnew': 'Новую партию начнёт {name}',
  'spl.pat.one': 'одну',
  'spl.pat.all': 'с соседями',
  'spl.pat.x': 'наискосок',
  'spl.pat.plus': 'крестом',
  'spl.win': 'Побеждает {name}!',
  'spl.win.left': 'Осталось: {n}',
  'spl.win.both': 'Последним брызгом — сразу обе краски!',
  'spl.say.big': ['Бабах!', 'Шмяк!', 'Вот это брызги!', 'Всё в краске!'],
  'spl.say.hit': ['Шлёп!', 'Попал!', 'Брызь!'],
  'spl.say.slow': ['Не спешу…', 'Потихоньку', 'Тише едешь…', 'Ещё ход!'],
  'spl.say.ouch': ['Эй!', 'Моя клякса!', 'Ой-ой', 'Ну вот…'],
  'spl.say.last': ['Последняя!', 'Держусь!', 'Одна осталась…'],
  'spl.say.place': ['Сюда!', 'Вот так', 'Хм…'],
  'spl.say.win': ['Ура!', 'Чистая победа!', 'Я художник!'],
  'spl.say.lose': ['Реванш?', 'Вся краска кончилась', 'Эх…'],
  'spl.h.how': 'Как играть',
  'spl.how': `
    <p><b>Что нужно:</b> двое и прямоугольная сетка, в каждой клетке — клякса краски. Синих и красных клякс поровну. Ваш цвет — ваши кляксы.</p>
    <p><b>Цель:</b> чтобы у соперника кляксы кончились раньше, чем у вас.</p>
    <ol>
      <li>В свой ход нажмите на <b>свою</b> кляксу и решите, как она брызнет:
        <ul>
          <li><b>одну</b> — исчезает только эта клякса;</li>
          <li><b>с соседями</b> — вместе с ней исчезают все кляксы вокруг (до восьми, по сторонам и по углам), и свои, и чужие.</li>
        </ul>
      </li>
      <li>Забрызганные клетки выбывают из игры. Пропускать ход нельзя.</li>
      <li>Как только у кого-то не осталось ни одной кляксы — побеждает соперник. Если один брызг смыл последние кляксы обоих цветов, побеждает тот, кто брызнул.</li>
    </ol>
    <p>В настройках можно включить ещё два брызга — <b>наискосок</b> (четыре угловых соседа) и <b>крестом</b> (четыре соседа по сторонам), а также расставлять кляксы по очереди вместо случайной раскладки.</p>`,
  'spl.h.tips': 'Хитрости',
  'spl.tips': `
    <ul>
      <li>Каждая клякса — это запас ходов. Брызг «с соседями» выгоден, когда вокруг больше чужих клякс, чем своих.</li>
      <li>Ваша клякса рядом с чужой — это обоюдная угроза: кто первым брызнет, тот и снимет соседа.</li>
      <li>Когда кляксы разных цветов перестали соприкасаться, игра превращается в простой счёт: каждый брызгает по одной, и у кого клякс больше, тот и переживёт соперника. Если клякс поровну, проигрывает тот, кто сейчас ходит.</li>
    </ul>
    <p class="tip"><b>Газ и тормоз.</b> В начале выгодно разносить чужие кляксы большими брызгами. Ближе к концу важнее растянуть игру: брызгайте одиночками там, где никого не задеваете, и держите свои кляксы подальше от чужих.</p>`,
  'spl.h.origin': 'Откуда игра',
  'spl.origin': `
    <p>«Клякса» — одна из коротких игр в сборнике Бена Орлина «Math Games with Bad Drawings». Это игра на подсчёт темпа: важно не столько уничтожить побольше, сколько остаться последним.</p>
    <p>Варианты для бумаги:</p>
    <ul>
      <li><b>Быстрая расстановка.</b> Один игрок сам раскладывает кляксы обоих цветов как хочет, а второй выбирает цвет — и вместе с ним, ходить первым или вторым. Так раскладчику невыгодно делать поле удобным для одной из сторон.</li>
      <li><b>Неторопливая расстановка.</b> Цвета распределены заранее, кляксы ставятся по очереди на пустую сетку — это есть в настройках.</li>
      <li><b>Больше узоров.</b> Кроме «одной» и «со всеми соседями» разрешить брызги наискосок и крестом — тоже есть в настройках.</li>
    </ul>`,
});

addStrings('en', {
  'spl.title': 'Splatter',
  'spl.tagline': 'a game of exploding paint and knowing when to brake',
  'spl.size': 'Board:',
  'spl.mode': 'Play:',
  'spl.mode.pvp': 'two players',
  'spl.mode.easy': 'vs computer (easy)',
  'spl.mode.normal': 'vs computer (normal)',
  'spl.mode.hard': 'vs computer (sneaky)',
  'spl.pats': 'Splats:',
  'spl.pats.classic': 'alone or all neighbours',
  'spl.pats.extended': '+ diagonal and cross',
  'spl.setup': 'Blobs:',
  'spl.setup.random': 'scattered at random',
  'spl.setup.turns': 'placed in turns',
  'spl.again': 'again!',
  'spl.p0': 'Blue',
  'spl.p1': 'Red',
  'spl.cpu': 'Computer',
  'spl.blobs': ['blob', 'blobs'],
  'spl.turn': '{name} to move — pick one of your blobs',
  'spl.place': '{name} places a blob',
  'spl.place.you': 'Put one of your blobs in an empty cell',
  'spl.thinking': '{name} is thinking…',
  'spl.turn.you': 'Your move — pick one of your blobs',
  'spl.turn.them': '{name} is moving…',
  'spl.online.wait': 'Waiting for the other player…',
  'spl.online.note': 'You’re playing online: the room creator starts new games and picks the settings.',
  'spl.online.waitnew': '{name} will start the next game',
  'spl.pat.one': 'alone',
  'spl.pat.all': 'neighbours',
  'spl.pat.x': 'diagonal',
  'spl.pat.plus': 'cross',
  'spl.win': '{name} wins!',
  'spl.win.left': 'Blobs left: {n}',
  'spl.win.both': 'One last splat wiped out both colours!',
  'spl.say.big': ['Kaboom!', 'Splat!', 'What a mess!', 'Paint everywhere!'],
  'spl.say.hit': ['Splosh!', 'Got one!', 'Splish!'],
  'spl.say.slow': ['No rush…', 'Easy does it', 'Slow and steady', 'One more turn!'],
  'spl.say.ouch': ['Hey!', 'My blob!', 'Ouch', 'Oh no…'],
  'spl.say.last': ['Last one!', 'Hanging on!', 'Just one left…'],
  'spl.say.place': ['Here!', 'Like so', 'Hmm…'],
  'spl.say.win': ['Hooray!', 'Clean win!', 'I’m an artist!'],
  'spl.say.lose': ['Rematch?', 'Out of paint', 'Oh well…'],
  'spl.h.how': 'How to play',
  'spl.how': `
    <p><b>You need:</b> two players and a rectangular grid with a paint blob in every cell, half blue and half red. Your colour is your blobs.</p>
    <p><b>Goal:</b> make your opponent run out of blobs before you do.</p>
    <ol>
      <li>On your turn tap one of <b>your</b> blobs and choose how it splats:
        <ul>
          <li><b>alone</b> — only that blob disappears;</li>
          <li><b>neighbours</b> — every blob around it goes too (up to eight: sides and corners), yours and theirs alike.</li>
        </ul>
      </li>
      <li>Splattered cells are out of the game. You can’t skip a turn.</li>
      <li>As soon as someone has no blobs left, the other player wins. If one splat wipes out the last blobs of both colours, whoever made it wins.</li>
    </ol>
    <p>In the settings you can add two more splats — <b>diagonal</b> (the four corner neighbours) and <b>cross</b> (the four side neighbours) — and place blobs in turns instead of scattering them at random.</p>`,
  'spl.h.tips': 'Tricks',
  'spl.tips': `
    <ul>
      <li>Every blob is a spare turn. A neighbours-splat pays off when it hits more of their blobs than yours.</li>
      <li>Your blob next to theirs is a threat both ways: whoever splats first takes the neighbour.</li>
      <li>Once no blobs of different colours touch, it’s just counting: each side splats one at a time and the larger pile outlasts the other. With equal piles, the player to move loses.</li>
    </ul>
    <p class="tip"><b>Gas and brakes.</b> Early on, big splats into enemy territory pay. Later, stretching the game matters more: splat lone blobs that hit nobody, and keep your blobs away from theirs.</p>`,
  'spl.h.origin': 'Where it comes from',
  'spl.origin': `
    <p>Splatter is one of the short games in Ben Orlin’s collection “Math Games with Bad Drawings”. It’s a game about tempo: wiping out lots of paint matters less than being the one left standing.</p>
    <p>Pen-and-paper variants:</p>
    <ul>
      <li><b>Quick setup.</b> One player lays out blobs of both colours however they like; the other then picks a colour — and with it, whether to move first or second. That keeps the layout honest.</li>
      <li><b>Slow setup.</b> Colours are assigned up front and blobs are placed in turns on an empty grid — available in the settings.</li>
      <li><b>More shapes.</b> Besides “alone” and “all neighbours”, allow diagonal and cross splats — also in the settings.</li>
    </ul>`,
});
