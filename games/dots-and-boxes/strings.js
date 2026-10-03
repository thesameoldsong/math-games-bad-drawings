import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'dab.title': 'Точки и квадраты',
  'dab.tagline': 'игра в клеточки, в которую все играли на последней парте',
  'dab.size': 'Точек:',
  'dab.mode': 'Играем:',
  'dab.mode.pvp': 'вдвоём',
  'dab.mode.easy': 'с компьютером (простой)',
  'dab.mode.normal': 'с компьютером (обычный)',
  'dab.mode.hard': 'с компьютером (хитрый)',
  'dab.undo': '↶ отменить',
  'dab.new': 'новая игра',
  'dab.again': 'ещё раз!',
  'dab.p0': 'Синий',
  'dab.p1': 'Красный',
  'dab.cpu': 'Компьютер',
  'dab.boxes': ['клетка', 'клетки', 'клеток'],
  'dab.turn': 'Ходит {name}',
  'dab.turn.again': '{name} ходит ещё раз',
  'dab.thinking': '{name} думает…',
  'dab.turn.you': 'Ваш ход',
  'dab.turn.them': 'Ходит {name}…',
  'dab.online.wait': 'Ждём второго игрока…',
  'dab.online.note': 'Сейчас идёт игра по сети: новую партию начинает и размер поля выбирает создатель комнаты.',
  'dab.online.waitnew': 'Новую партию начнёт {name}',
  'dab.win': 'Побеждает {name}! {a} : {b}',
  'dab.tie': 'Ничья! {a} : {b}',
  'say.capture': ['Моё!', 'Беру!', 'Ещё ход!', 'Хе-хе', 'Спасибо!'],
  'say.chain': ['Цепочка!', 'И это моё…', 'И это!', 'Сколько всего!'],
  'say.lost': ['Эх…', 'Ну вот', 'Ой', 'Хм'],
  'say.dc': ['Держи две. Остальное потом.', 'Подарок!', 'Двойной крест!'],
  'say.win': ['Ура!', 'Победа!', 'Я гений'],
  'say.lose': ['Реванш?', 'В следующий раз…', 'Ну и ладно'],
  'dab.h.how': 'Как играть',
  'dab.how': `
    <p><b>Что нужно:</b> двое и сетка из точек. Классика — 6 × 6 точек, но подойдёт любой прямоугольник.</p>
    <p><b>Цель:</b> забрать больше клеток, чем соперник.</p>
    <ol>
      <li>Ходите по очереди: соедините две <b>соседние</b> точки линией — по горизонтали или по вертикали. Нажмите между точками.</li>
      <li>Кто провёл <b>четвёртую сторону</b> клетки — забирает её (там появится его буква) и <b>сразу ходит ещё раз</b>. Так за один ход можно собрать целую цепочку.</li>
      <li>Когда все линии проведены, побеждает тот, у кого больше клеток.</li>
    </ol>`,
  'dab.h.tips': 'Хитрости',
  'dab.tips': `
    <ul>
      <li>Не рисуйте <b>третью сторону</b> клетки — сопернику останется только её закрыть.</li>
      <li>Рано или поздно безопасные ходы закончатся, и кому-то придётся отдавать клетки. Отдавайте <b>самый маленький</b> кусок.</li>
    </ul>
    <p class="tip"><b>Двойной крест.</b> Соперник отдал вам длинную цепочку? Заберите её всю, <i>кроме последних двух клеток</i>: вместо них проведите дальнюю линию, оставив сопернику «домино», которое он закроет одним ходом. Вы теряете две клетки — зато следующую цепочку открывать придётся ему, и она достанется вам. Хитрый компьютер так умеет.</p>`,
  'dab.h.origin': 'Откуда игра',
  'dab.origin': `
    <p>Впервые правила напечатал французский математик Эдуар Люка в 1889 году — игра называлась <i>La Pipopipette</i>. Сегодня в неё играют на тетрадных листах по всему миру, а математик Элвин Берлекэмп посвятил ей целую книгу и называл её самой математически богатой из популярных детских игр.</p>`,
});

addStrings('en', {
  'dab.title': 'Dots and Boxes',
  'dab.tagline': 'the back-of-the-notebook classic',
  'dab.size': 'Dots:',
  'dab.mode': 'Play:',
  'dab.mode.pvp': 'two players',
  'dab.mode.easy': 'vs computer (easy)',
  'dab.mode.normal': 'vs computer (normal)',
  'dab.mode.hard': 'vs computer (sneaky)',
  'dab.undo': '↶ undo',
  'dab.new': 'new game',
  'dab.again': 'again!',
  'dab.p0': 'Blue',
  'dab.p1': 'Red',
  'dab.cpu': 'Computer',
  'dab.boxes': ['box', 'boxes'],
  'dab.turn': '{name} to move',
  'dab.turn.again': '{name} goes again',
  'dab.thinking': '{name} is thinking…',
  'dab.turn.you': 'Your move',
  'dab.turn.them': '{name} is moving…',
  'dab.online.wait': 'Waiting for the other player…',
  'dab.online.note': 'You’re playing online: the room creator starts new games and picks the board size.',
  'dab.online.waitnew': '{name} will start the next game',
  'dab.win': '{name} wins! {a} : {b}',
  'dab.tie': 'A tie! {a} : {b}',
  'say.capture': ['Mine!', 'Gotcha!', 'Again!', 'Heh', 'Thanks!'],
  'say.chain': ['A chain!', 'And this one…', 'And this!', 'So many!'],
  'say.lost': ['Ugh…', 'Oh no', 'Oops', 'Hmm'],
  'say.dc': ['Take two. I’ll get the rest.', 'A gift!', 'Double cross!'],
  'say.win': ['Hooray!', 'Victory!', 'I’m a genius'],
  'say.lose': ['Rematch?', 'Next time…', 'Whatever'],
  'dab.h.how': 'How to play',
  'dab.how': `
    <p><b>You need:</b> two players and a grid of dots. 6 × 6 dots is the classic, but any rectangle works.</p>
    <p><b>Goal:</b> claim more boxes than your opponent.</p>
    <ol>
      <li>Take turns joining two <b>adjacent</b> dots with a horizontal or vertical line. Tap between the dots.</li>
      <li>Draw the <b>fourth side</b> of a box and it’s yours (your initial appears) — and you <b>move again right away</b>. One turn can sweep up a whole chain.</li>
      <li>When every line is drawn, whoever has more boxes wins.</li>
    </ol>`,
  'dab.h.tips': 'Tricks',
  'dab.tips': `
    <ul>
      <li>Don’t draw the <b>third side</b> of a box — your opponent will just close it.</li>
      <li>Sooner or later the safe moves run out and someone has to give boxes away. Give away the <b>smallest</b> piece.</li>
    </ul>
    <p class="tip"><b>The double cross.</b> Handed a long chain? Take all of it <i>except the last two boxes</i>: draw the far line instead, leaving a “domino” your opponent closes with one stroke. You lose two boxes — but now they must open the next chain, and it’s yours. The sneaky computer knows this trick.</p>`,
  'dab.h.origin': 'Where it comes from',
  'dab.origin': `
    <p>The rules were first published by the French mathematician Édouard Lucas in 1889, under the name <i>La Pipopipette</i>. Today it’s played on scraps of paper everywhere, and mathematician Elwyn Berlekamp wrote a whole book about it, calling it the most mathematically rich popular children’s game.</p>`,
});
