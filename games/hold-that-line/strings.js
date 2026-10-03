import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'htl.title': 'Держи линию',
  'htl.tagline': 'одна ломаная на двоих — и никто не хочет рисовать её последним',
  'htl.rules': 'Правила:',
  'htl.rules.sackson4': 'Сэксон, 4 × 4 точки',
  'htl.rules.sackson5': 'Сэксон, 5 × 5 точек',
  'htl.rules.lucas': 'Люка, 6 × 6 точек',
  'htl.mode': 'Играем:',
  'htl.mode.pvp': 'вдвоём',
  'htl.mode.easy': 'с компьютером (простой)',
  'htl.mode.normal': 'с компьютером (обычный)',
  'htl.mode.hard': 'с компьютером (сильный)',
  'htl.again': 'ещё раз!',
  'htl.p0': 'Синий',
  'htl.p1': 'Красный',
  'htl.cpu': 'Компьютер',
  'htl.segs': ['отрезок', 'отрезка', 'отрезков'],
  'htl.turn': 'Ходит {name}',
  'htl.turn.first': '{name}: соедините две точки',
  'htl.turn.from': '{name}: куда тянем линию?',
  'htl.turn.pick': 'С какого конца? Нажмите на конец линии',
  'htl.thinking': '{name} думает…',
  'htl.turn.you': 'Ваш ход',
  'htl.turn.them': 'Ходит {name}…',
  'htl.online.wait': 'Ждём второго игрока…',
  'htl.online.note': 'Сейчас идёт игра по сети: новую партию начинает и правила выбирает создатель комнаты.',
  'htl.online.waitnew': 'Новую партию начнёт {name}',
  'htl.win': 'Побеждает {name}!',
  'htl.why.misere': 'Линию больше не продлить, а кто нарисовал последний отрезок — проигрывает.',
  'htl.why.normal': 'Линию больше не продлить: кто нарисовал последний отрезок — тот и победил.',
  'htl.say.long': ['Размах!', 'Через всё поле!', 'Широким жестом', 'Вжух!'],
  'htl.say.trap': ['Всё посчитано', 'Хе-хе', 'Попался?', 'Твой ход!', 'Красиво легло'],
  'htl.say.thanks': ['Спасибо!', 'Ага!', 'О, это мне подходит', 'Ну-ну'],
  'htl.say.oops': ['Ой…', 'Кажется, зря', 'Хм', 'Не туда'],
  'htl.say.tight': ['Тесно…', 'Куда же…', 'Ой-ой', 'Мало места'],
  'htl.say.win': ['Ура!', 'Держу линию!', 'Победа!', 'Так и задумано'],
  'htl.say.lose': ['Реванш?', 'Эх…', 'Вот это петля', 'Ну и ладно'],
  'htl.h.how': 'Как играть',
  'htl.how': `
    <p><b>Что нужно:</b> двое, карандаш и квадрат из 4 × 4 точек.</p>
    <ol>
      <li>Первый игрок соединяет <b>любые две точки</b> прямым отрезком: по горизонтали, по вертикали или по диагонали под 45°. Длина — любая.</li>
      <li>Дальше ходят по очереди и <b>продлевают эту же линию</b> с любого из двух концов: новый прямой отрезок любой длины в одном из восьми направлений.</li>
      <li>Линия не может <b>касаться себя</b>: новый отрезок не может проходить через точку, которая уже на линии, или заканчиваться на ней (даже на другом конце линии), и не может пересекать уже нарисованную диагональ.</li>
      <li>Когда продлить линию больше нельзя, игра кончается. <b>Кто нарисовал последний отрезок — проиграл.</b> Ничьих не бывает.</li>
    </ol>
    <p>Как ходить: нажмите на конец линии, а потом на точку, куда её тянуть (можно и просто протянуть пальцем). Если точка достижима только с одного конца, хватит одного нажатия. Кружками отмечены точки, куда можно дотянуться.</p>
    <p class="tip"><b>Вариант Люка</b> (включается в настройках). Поле 6 × 6, каждый ход — шажок в одну клетку и только по горизонтали или вертикали. Вторым ходом можно расти с любого конца первого отрезка, а дальше — только с того конца, который только что дорисовал соперник. Касаться себя линия так же не может. И победа здесь наоборот: <b>кто сделал последний ход — выиграл</b>.</p>`,
  'htl.h.tips': 'Хитрости',
  'htl.tips': `
    <ul>
      <li>Вы хотите, чтобы последний отрезок пришлось рисовать сопернику. Значит, считать надо <b>ходы до конца</b>, а не красоту линии.</li>
      <li>Длинный отрезок съедает сразу несколько точек — это способ поменять чётность: «сделать ход за двоих».</li>
      <li>Под конец проверяйте: если после вашего хода у соперника останется ровно одно продолжение, после которого ходов нет, — ему придётся нарисовать последний отрезок.</li>
      <li>Диагонали коварны: одна диагональ закрывает пересекающую её навсегда, даже если обе точки той ещё свободны.</li>
    </ul>
    <p class="tip"><b>Секрет варианта Люка.</b> Начинающий может выиграть всегда. Мысленно разложите поле 6 × 6 на доминошки так, чтобы первый отрезок был одной из них. Каждый ход соперника заходит в новую доминошку — а вы просто дорисовываете её вторую половину. Ход у вас найдётся всегда, значит, застрянет соперник. Сильный компьютер этим пользуется.</p>
    <p class="tip">А в классике 4 × 4 компьютер просчитал игру до конца: начинающий тоже может выиграть при точной игре, но выигрышный путь далеко не очевиден.</p>`,
  'htl.h.origin': 'Откуда игра',
  'htl.origin': `
    <p>Эту игру придумал американец Сид Сэксон — один из самых плодовитых изобретателей настольных игр XX века. Он хотел предложить замену крестикам-ноликам: такую же простую игру на клочке бумаги, но без вечных ничьих. Здесь ничья невозможна в принципе: линия рано или поздно упрётся, и кто-то нарисует последний отрезок.</p>
    <p>У игры есть старший родственник. Французский математик Эдуар Люка, тот самый, что напечатал «Точки и квадраты», описал похожую забаву: змейка на поле 6 × 6 растёт по одному шагу с одного конца, и выигрывает тот, кто сходил последним.</p>`,
});

addStrings('en', {
  'htl.title': 'Hold That Line',
  'htl.tagline': 'one shared zigzag, and nobody wants to draw its last piece',
  'htl.rules': 'Rules:',
  'htl.rules.sackson4': 'Sackson, 4 × 4 dots',
  'htl.rules.sackson5': 'Sackson, 5 × 5 dots',
  'htl.rules.lucas': 'Lucas, 6 × 6 dots',
  'htl.mode': 'Play:',
  'htl.mode.pvp': 'two players',
  'htl.mode.easy': 'vs computer (easy)',
  'htl.mode.normal': 'vs computer (normal)',
  'htl.mode.hard': 'vs computer (strong)',
  'htl.again': 'again!',
  'htl.p0': 'Blue',
  'htl.p1': 'Red',
  'htl.cpu': 'Computer',
  'htl.segs': ['segment', 'segments'],
  'htl.turn': '{name} to move',
  'htl.turn.first': '{name}: join any two dots',
  'htl.turn.from': '{name}: where does it go?',
  'htl.turn.pick': 'Which end? Tap an end of the line',
  'htl.thinking': '{name} is thinking…',
  'htl.turn.you': 'Your move',
  'htl.turn.them': '{name} is moving…',
  'htl.online.wait': 'Waiting for the other player…',
  'htl.online.note': 'You’re playing online: the room creator starts new games and picks the rules.',
  'htl.online.waitnew': '{name} will start the next game',
  'htl.win': '{name} wins!',
  'htl.why.misere': 'The line can’t grow any more, and whoever drew the last segment loses.',
  'htl.why.normal': 'The line can’t grow any more, and whoever drew the last segment wins.',
  'htl.say.long': ['Big swing!', 'All the way!', 'Wheee', 'Long one!'],
  'htl.say.trap': ['All figured out', 'Heh', 'Your move!', 'Got you?', 'Neat'],
  'htl.say.thanks': ['Thanks!', 'Aha!', 'That suits me', 'Oh really?'],
  'htl.say.oops': ['Oops…', 'Hmm, bad idea', 'Uh-oh', 'Wrong way'],
  'htl.say.tight': ['Cramped…', 'Where to?', 'Uh-oh', 'Not much room'],
  'htl.say.win': ['Hooray!', 'Held it!', 'Victory!', 'As planned'],
  'htl.say.lose': ['Rematch?', 'Ugh…', 'Tangled up', 'Whatever'],
  'htl.h.how': 'How to play',
  'htl.how': `
    <p><b>You need:</b> two players, a pencil and a 4 × 4 square of dots.</p>
    <ol>
      <li>The first player joins <b>any two dots</b> with a straight segment: horizontal, vertical or 45° diagonal, of any length.</li>
      <li>Then take turns <b>extending that same line</b> from either of its two ends: a new straight segment of any length in one of eight directions.</li>
      <li>The line may never <b>touch itself</b>: a new segment may not pass through or end on a dot that is already on the line (not even the line’s other end), and may not cross a diagonal that is already drawn.</li>
      <li>When the line can’t be extended any more, the game ends. <b>Whoever drew the last segment loses.</b> There are no ties.</li>
    </ol>
    <p>To move: tap an end of the line, then the dot to stretch it to (or just drag). If a dot can only be reached from one end, a single tap is enough. Small rings mark the dots you can reach.</p>
    <p class="tip"><b>Lucas’s version</b> (switch it on in the settings). A 6 × 6 board, and every move is a single step across or up/down. The second move may grow either end of the first segment; after that, only the end your opponent just drew may grow. The line still may not touch itself. And the goal is flipped: <b>whoever makes the last move wins</b>.</p>`,
  'htl.h.tips': 'Tricks',
  'htl.tips': `
    <ul>
      <li>You want your opponent to be stuck drawing the last segment. So count <b>moves left</b>, not how pretty the line is.</li>
      <li>A long segment eats several dots at once — a handy way to flip the parity and “take two turns in one”.</li>
      <li>Near the end, check: if after your move your opponent only has moves that leave nothing behind, they must draw the last segment.</li>
      <li>Diagonals are sneaky: one diagonal blocks the one crossing it forever, even when that one’s dots are still free.</li>
    </ul>
    <p class="tip"><b>The secret of Lucas’s version.</b> The starting player can always win. Picture the 6 × 6 board cut into dominoes so that the first segment is one of them. Every move your opponent makes steps into a fresh domino — you simply finish it. You always have a reply, so your opponent gets stuck first. The strong computer knows this.</p>
    <p class="tip">The classic 4 × 4 game has been searched to the end by the computer too: the starting player can force a win, though the winning path is far from obvious.</p>`,
  'htl.h.origin': 'Where it comes from',
  'htl.origin': `
    <p>This game was invented by Sid Sackson, one of the most prolific American game designers of the 20th century. He meant it as a replacement for tic-tac-toe: just as easy to play on a scrap of paper, but without the endless draws. Here a tie is impossible — sooner or later the line gets stuck, and somebody draws the last segment.</p>
    <p>It has an older cousin. The French mathematician Édouard Lucas, the same man who published Dots and Boxes, described a similar pastime: a snake on a 6 × 6 board grows one step at a time from one end, and the last player to move wins.</p>`,
});
