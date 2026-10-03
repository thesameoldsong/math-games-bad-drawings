import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'spr.title': 'Рассада',
  'spr.tagline': 'точки, линии и немного топологии',
  'spr.spots': 'Точек в начале:',
  'spr.mode': 'Играем:',
  'spr.mode.pvp': 'вдвоём',
  'spr.mode.easy': 'с компьютером (простой)',
  'spr.mode.normal': 'с компьютером (обычный)',
  'spr.mode.hard': 'с компьютером (сильный)',
  'spr.first': 'Первый ход:',
  'spr.first.0': 'синий',
  'spr.first.1': 'красный',
  'spr.first.alt': 'по очереди',
  'spr.again': 'ещё раз!',
  'spr.p0': 'Синий',
  'spr.p1': 'Красный',
  'spr.cpu': 'Компьютер',
  'spr.moves': ['ход', 'хода', 'ходов'],
  'spr.turn': 'Ходит {name}',
  'spr.hint': 'проведите линию от точки к точке',
  'spr.thinking': '{name} думает…',
  'spr.turn.you': 'Ваш ход',
  'spr.turn.them': 'Ходит {name}…',
  'spr.online.wait': 'Ждём второго игрока…',
  'spr.online.note': 'Сейчас идёт игра по сети: новую партию начинает и настраивает создатель комнаты.',
  'spr.online.waitnew': 'Новую партию начнёт {name}',
  'spr.win': 'Побеждает {name}!',
  'spr.win.sub': 'Ходов больше нет. Всего за партию: {n}.',
  'spr.win.stuck': 'Ход ещё есть, но нарисовать его негде — {name} сдаётся.',
  'spr.err.cross': 'Линии не должны пересекаться и касаться',
  'spr.err.spot': 'Линия не может проходить через точку',
  'spr.err.full': 'У этой точки уже три линии',
  'spr.err.loop': 'Для петли у точки нужно два свободных конца',
  'spr.err.short': 'Слишком короткая линия',
  'spr.err.edge': 'Не выходите за край листа',
  'spr.err.end': 'Начните и закончите линию на точке',
  'spr.say.oops': ['Ой!', 'Не так…', 'Упс', 'Кривовато'],
  'spr.say.fixed': ['Чуть подправлю', 'Вот так ровнее', 'Почти!'],
  'spr.say.loop': ['Петелька!', 'Узелок', 'Кругом!'],
  'spr.say.good': ['Ага!', 'Хе-хе', 'Посчитано', 'Так-так…', 'Интересно…'],
  'spr.say.worry': ['Хм…', 'Тесно…', 'Ой-ой', 'Подумать бы…'],
  'spr.say.blunder': ['Ой, зря…', 'Эх!', 'Не та линия…'],
  'spr.say.stuck': ['Не протиснуться!', 'Сдаюсь…'],
  'spr.say.win': ['Последний ход мой!', 'Ура!', 'Победа!'],
  'spr.say.lose': ['Реванш?', 'Ну вот…', 'Некуда!'],
  'spr.h.how': 'Как играть',
  'spr.how': `
    <p><b>Что нужно:</b> двое, ручка и лист бумаги с несколькими точками. Для первых партий хватит трёх-четырёх точек.</p>
    <p><b>Цель:</b> сделать последний ход. Кому ходить некуда, тот проигрывает.</p>
    <ol>
      <li>За ход проведите линию от одной точки до другой (или от точки к ней самой — петлёй). Здесь: <b>проведите пальцем или мышью</b>, начав на точке и закончив на точке.</li>
      <li>На новой линии сразу вырастает <b>новая точка</b> — её ставит игра, примерно посередине.</li>
      <li>Линии <b>не пересекаются</b> ни друг с другом, ни сами с собой и не проходят сквозь точки.</li>
      <li>Из одной точки выходит <b>не больше трёх линий</b>. Точка с тремя линиями становится серой — она «закончилась».</li>
      <li>Когда ходов не осталось, побеждает тот, кто ходил последним.</li>
    </ol>
    <p class="tip">Форма линии не важна — важно лишь, какие точки она соединяет и что оказывается по разные стороны от неё. Если линия чуть задела соседнюю, игра попробует её аккуратно поправить.</p>`,
  'spr.h.tips': 'Хитрости',
  'spr.tips': `
    <ul>
      <li><b>Считайте свободные концы.</b> У каждой точки их три. Ход тратит два и даёт один (у новой точки), так что всего минус один. Значит, партия с <i>n</i> точками длится не больше 3<i>n</i> − 1 ходов — и не меньше 2<i>n</i>.</li>
      <li><b>Делите поле.</b> Замкнутая линия отрезает «комнату». Что внутри — уже не связано с тем, что снаружи. Сосчитайте, сколько ходов осталось в каждой комнате, и подстройте чётность под себя.</li>
      <li>Петля вокруг одиночной точки — сильный приём: решаете, что окажется внутри, а что снаружи.</li>
      <li>Компьютеры давно перебрали маленькие партии: при 3, 4 и 5 точках выигрывает начинающий (если не ошибается), при 1, 2 и 6 — второй. Похоже, дальше узор повторяется с шагом 6. Сильный компьютер здесь просчитывает партию на 3–4 точках с первого хода, а на 5–6 — ближе к концу.</li>
    </ul>
    <p class="tip"><b>Другие варианты.</b> <i>«Сорняки»:</i> на новую линию можно поставить ноль, одну или две точки. <i>«Очки»:</i> замкнул область — получил по очку за каждую точку на её границе, а внутрь больше никто не ходит; в конце считают очки. <i>«Брюссельская капуста»:</i> вместо точек — крестики с четырьмя концами, соединяют концы и ставят на линию чёрточку. Выглядит хитро, но это розыгрыш: исход заранее известен по числу крестиков, партия всегда длится 5<i>n</i> − 2 хода.</p>`,
  'spr.h.origin': 'Откуда игра',
  'spr.origin': `
    <p>У «Рассады» точная дата рождения: 21 февраля 1967 года, Кембридж. Информатик Майк Патерсон и математик Джон Конвей придумывали игру на бумаге. Патерсон предложил ставить на линию новую точку, Конвей — название. Уже через день в неё играли во всех чайных комнатах факультета.</p>
    <p>Игра оказалась на удивление глубокой. Полный разбор партии на шести точках занял у Дениса Моллисона несколько десятков страниц, а в 1990-х компьютер решил партии до одиннадцати точек.</p>
    <p>Это игра про <b>топологию</b>: длина и форма линий не важны, важно лишь, что с чем соединено и что внутри чего. Здесь всегда выполняется равенство Эйлера: <i>точки + области = линии + куски</i>.</p>`,
});

addStrings('en', {
  'spr.title': 'Sprouts',
  'spr.tagline': 'dots, lines and a pinch of topology',
  'spr.spots': 'Starting spots:',
  'spr.mode': 'Play:',
  'spr.mode.pvp': 'two players',
  'spr.mode.easy': 'vs computer (easy)',
  'spr.mode.normal': 'vs computer (normal)',
  'spr.mode.hard': 'vs computer (strong)',
  'spr.first': 'First move:',
  'spr.first.0': 'blue',
  'spr.first.1': 'red',
  'spr.first.alt': 'take turns',
  'spr.again': 'again!',
  'spr.p0': 'Blue',
  'spr.p1': 'Red',
  'spr.cpu': 'Computer',
  'spr.moves': ['move', 'moves'],
  'spr.turn': '{name} to move',
  'spr.hint': 'drag a line from spot to spot',
  'spr.thinking': '{name} is thinking…',
  'spr.turn.you': 'Your move',
  'spr.turn.them': '{name} is moving…',
  'spr.online.wait': 'Waiting for the other player…',
  'spr.online.note': 'You’re playing online: the room creator starts and sets up new games.',
  'spr.online.waitnew': '{name} will start the next game',
  'spr.win': '{name} wins!',
  'spr.win.sub': 'No moves left. Moves in this game: {n}.',
  'spr.win.stuck': 'A move still exists, but there’s no room to draw it — {name} gives up.',
  'spr.err.cross': 'Lines may not cross or touch',
  'spr.err.spot': 'A line can’t run through a spot',
  'spr.err.full': 'That spot already has three lines',
  'spr.err.loop': 'A loop needs two free ends at the spot',
  'spr.err.short': 'That line is too short',
  'spr.err.edge': 'Stay on the paper',
  'spr.err.end': 'Start and end your line on a spot',
  'spr.say.oops': ['Oops!', 'Not like that…', 'Whoops', 'Wobbly'],
  'spr.say.fixed': ['Let me tidy that', 'Neater', 'Almost!'],
  'spr.say.loop': ['A loop!', 'Round we go', 'Lasso!'],
  'spr.say.good': ['Aha!', 'Heh', 'Calculated', 'Hmm-hm…', 'Interesting…'],
  'spr.say.worry': ['Hmm…', 'Getting cramped…', 'Uh-oh', 'Let me think…'],
  'spr.say.blunder': ['Oh no…', 'Argh!', 'Wrong line'],
  'spr.say.stuck': ['Can’t squeeze through!', 'I give up…'],
  'spr.say.win': ['Last move’s mine!', 'Hooray!', 'Victory!'],
  'spr.say.lose': ['Rematch?', 'Oh well…', 'Nowhere to go!'],
  'spr.h.how': 'How to play',
  'spr.how': `
    <p><b>You need:</b> two players, a pen, and paper with a few spots on it. Three or four spots are plenty for your first games.</p>
    <p><b>Goal:</b> make the last move. Whoever has no move left loses.</p>
    <ol>
      <li>On your turn draw a line from one spot to another (or from a spot back to itself, as a loop). Here: <b>drag with your finger or mouse</b>, starting on a spot and ending on a spot.</li>
      <li>A <b>new spot</b> sprouts on the line you drew — the game places it, roughly in the middle.</li>
      <li>Lines <b>never cross</b> each other or themselves, and never pass through a spot.</li>
      <li>A spot can have <b>at most three lines</b>. A spot with three lines turns grey — it’s used up.</li>
      <li>When no moves remain, whoever moved last wins.</li>
    </ol>
    <p class="tip">The shape of a line doesn’t matter — only which spots it joins and what ends up on each side of it. If your line brushes against another one, the game will try to tidy it up.</p>`,
  'spr.h.tips': 'Tricks',
  'spr.tips': `
    <ul>
      <li><b>Count free ends.</b> Each spot starts with three. A move uses two and creates one (on the new spot): one fewer each turn. So a game with <i>n</i> spots lasts at most 3<i>n</i> − 1 moves — and at least 2<i>n</i>.</li>
      <li><b>Split the board.</b> A closed line seals off a “room”, and what’s inside no longer interacts with what’s outside. Count the moves left in each room and steer the parity your way.</li>
      <li>A loop around a lone spot is a strong move: you decide what ends up inside and what stays out.</li>
      <li>Computers have solved the small games: with 3, 4 or 5 spots the first player wins (with perfect play), with 1, 2 or 6 the second does. The pattern seems to repeat every 6. The strong computer here works out 3–4 spot games from the first move, and 5–6 spot games once they get closer to the end.</li>
    </ul>
    <p class="tip"><b>Other versions.</b> <i>Weeds:</i> you may put zero, one or two new spots on your line. <i>Point Set:</i> close off a region and score a point per spot on its border; nobody plays inside it afterwards; most points wins. <i>Brussels Sprouts:</i> start with crosses (four free ends each), join two ends and put a tick across the new line. It looks deep but it’s a prank: the outcome is fixed by the number of crosses — the game always lasts 5<i>n</i> − 2 moves.</p>`,
  'spr.h.origin': 'Where it comes from',
  'spr.origin': `
    <p>Sprouts has an exact birthday: February 21, 1967, in Cambridge, England. Computer scientist Mike Paterson and mathematician John Conway were trying to invent a game on paper. Paterson suggested the new-spot rule, Conway came up with the name. By the next day it had spread through every tea room in the department.</p>
    <p>It turned out to be surprisingly deep. A full analysis of the six-spot game took Denis Mollison dozens of pages, and in the 1990s a computer solved games of up to eleven spots.</p>
    <p>It’s a game about <b>topology</b>: the length and shape of lines don’t matter, only what is joined to what and what lies inside what. Euler’s formula always holds: <i>spots + regions = lines + pieces</i>.</p>`,
});
