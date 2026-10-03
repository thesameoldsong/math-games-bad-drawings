import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'gl.title': 'Тупик',
  'gl.tagline': 'кубики, прямоугольники и немного вредности',
  'gl.size': 'Поле:',
  'gl.mode': 'Играем:',
  'gl.mode.pvp': 'вдвоём',
  'gl.mode.easy': 'с компьютером (простой)',
  'gl.mode.normal': 'с компьютером (обычный)',
  'gl.mode.hard': 'с компьютером (вредный)',
  'gl.spoil': 'Чужое поле:',
  'gl.spoil.on': 'можно занимать',
  'gl.spoil.off': 'только своё',
  'gl.again': 'ещё раз!',
  'gl.p0': 'Синий',
  'gl.p1': 'Красный',
  'gl.cpu': 'Компьютер',
  'gl.cells': ['клетка', 'клетки', 'клеток'],
  'gl.rotate': 'повернуть',
  'gl.place': 'сюда!',
  'gl.pass': 'пропустить',
  'gl.rolling': 'бросаем…',
  'gl.turn': '{name}: поставь {a}×{b}',
  'gl.turn.you': 'Ваш ход: поставьте {a}×{b}',
  'gl.turn.them': 'Ходит {name}…',
  'gl.thinking': '{name} думает…',
  'gl.nofit.own': '{a}×{b} не влезает к себе: ставь к сопернику или пропусти ход',
  'gl.nofit.all': '{a}×{b} никуда не влезает — ход пропущен',
  'gl.online.wait': 'Ждём второго игрока…',
  'gl.online.note': 'Сейчас идёт игра по сети: новую партию начинает и правила выбирает создатель комнаты.',
  'gl.online.waitnew': 'Новую партию начнёт {name}',
  'gl.win': 'Побеждает {name}! {a}\u00a0:\u00a0{b}',
  'gl.tie': 'Ничья! {a}\u00a0:\u00a0{b}',
  'gl.lastpass': 'Оба пропустили ход подряд — игра окончена.',
  'say.big': ['Отличный бросок!', 'Вот это кусок!', 'Сколько места!', 'Ого!'],
  'say.tiny': ['Мелочь, а приятно', 'Ну хоть так', 'Крошка'],
  'say.snug': ['Тютелька в тютельку', 'Как в тетрисе!', 'Идеально легло'],
  'say.spoil': ['Ой, а тут занято?', 'Это тебе подарок', 'Хе-хе', 'Мешаю?'],
  'say.spoiled': ['Эй!', 'Ты что делаешь?!', 'Моё поле!', 'Ну зачем…'],
  'say.pass': ['Не влезает…', 'Эх, мимо', 'Пропускаю', 'Тесно'],
  'say.passOther': ['Тесновато?', 'Бывает', 'Хм…'],
  'say.win': ['Ура!', 'Победа!', 'Поле моё!'],
  'say.lose': ['Реванш?', 'В следующий раз…', 'Кубики подвели'],
  'gl.h.how': 'Как играть',
  'gl.how': `
    <p><b>Что нужно:</b> двое, два кубика и у каждого своё поле 10 × 10 клеток.</p>
    <p><b>Цель:</b> к концу игры закрасить на <b>своём</b> поле больше клеток, чем соперник на своём.</p>
    <ol>
      <li>В начале хода бросаются два кубика. Выпало, скажем, 3 и 5 — закрасьте прямоугольник 3 × 5 (или 5 × 3) из <b>пустых</b> клеток. Нажмите на поле, чтобы примерить, кнопкой «повернуть» поменяйте стороны, нажмите на тень ещё раз — и готово.</li>
      <li>Вместо своего поля можно поставить прямоугольник <b>на поле соперника</b>. Клетки всё равно засчитаются ему — зато маленький брусок посреди его поля может испортить ему всю игру.</li>
      <li>Если прямоугольник не помещается на ваше поле, ход пропадает (по желанию можно всё же поставить его сопернику).</li>
      <li>Когда оба игрока пропускают ход один за другим, игра кончается. Побеждает тот, у кого на поле больше закрашенных клеток.</li>
    </ol>`,
  'gl.h.tips': 'Хитрости',
  'gl.tips': `
    <ul>
      <li>Ставьте прямоугольники <b>вплотную</b> к краю и друг к другу. Узкие щели в одну-две клетки потом почти нечем заполнить.</li>
      <li>Берегите <b>большой свободный кусок</b>: шанс выбросить что-то вроде 5 × 6 невелик, но если он выпадет, а места нет — обидно вдвойне.</li>
      <li>Портить чужое поле выгоднее всего <b>мелкой</b> фигуркой (1 × 1, 1 × 2) прямо посреди самого большого пустого места соперника: вы дарите ему пару клеток, а отнимаете возможность поставить крупный прямоугольник.</li>
      <li>Под конец игры, когда у вас самих места нет, «пустой» ход всё равно можно потратить на вредность.</li>
    </ul>
    <p class="tip"><b>Варианты.</b> Попробуйте играть без вредности — каждый только на своём поле (это есть в настройках): получается спокойная игра на удачу и аккуратность. Можно менять размер поля — на 8 × 8 игра короткая и злая, на 12 × 12 долгая и просторная.</p>`,
  'gl.h.origin': 'Откуда игра',
  'gl.origin': `
    <p>Исходная идея — из материалов YouCubed, центра математического образования при Стэнфордском университете. Там похожая игра с двумя кубиками и клетчатым полем задумана как <b>совместная</b>: дети по очереди заполняют поле прямоугольниками и заодно привыкают к умножению как к площади.</p>
    <p>Бен Орлин добавил всего одно правило — можно ставить свою фигуру на поле соперника — и мирная тренировка таблицы умножения превратилась в хитрую игру про место, риск и маленькие пакости.</p>`,
});

addStrings('en', {
  'gl.title': 'Gridlock',
  'gl.tagline': 'dice, rectangles and a little spite',
  'gl.size': 'Grid:',
  'gl.mode': 'Play:',
  'gl.mode.pvp': 'two players',
  'gl.mode.easy': 'vs computer (easy)',
  'gl.mode.normal': 'vs computer (normal)',
  'gl.mode.hard': 'vs computer (spiteful)',
  'gl.spoil': 'Opponent’s grid:',
  'gl.spoil.on': 'allowed',
  'gl.spoil.off': 'own grid only',
  'gl.again': 'again!',
  'gl.p0': 'Blue',
  'gl.p1': 'Red',
  'gl.cpu': 'Computer',
  'gl.cells': ['square', 'squares'],
  'gl.rotate': 'rotate',
  'gl.place': 'here!',
  'gl.pass': 'pass',
  'gl.rolling': 'rolling…',
  'gl.turn': '{name}: place a {a}×{b}',
  'gl.turn.you': 'Your turn: place a {a}×{b}',
  'gl.turn.them': '{name} is moving…',
  'gl.thinking': '{name} is thinking…',
  'gl.nofit.own': 'No room for {a}×{b} at home: spoil the other grid or pass',
  'gl.nofit.all': '{a}×{b} fits nowhere — turn lost',
  'gl.online.wait': 'Waiting for the other player…',
  'gl.online.note': 'You’re playing online: the room creator starts new games and picks the rules.',
  'gl.online.waitnew': '{name} will start the next game',
  'gl.win': '{name} wins! {a}\u00a0:\u00a0{b}',
  'gl.tie': 'A tie! {a}\u00a0:\u00a0{b}',
  'gl.lastpass': 'Both players lost a turn in a row — game over.',
  'say.big': ['Great roll!', 'What a chunk!', 'So much room!', 'Whoa!'],
  'say.tiny': ['Small but mine', 'Better than nothing', 'A crumb'],
  'say.snug': ['Snug fit!', 'Just like Tetris!', 'Perfect'],
  'say.spoil': ['Oh, was this taken?', 'A little gift', 'Heh', 'In your way?'],
  'say.spoiled': ['Hey!', 'What are you doing?!', 'My grid!', 'Why…'],
  'say.pass': ['Won’t fit…', 'Ugh, no room', 'Pass', 'Too tight'],
  'say.passOther': ['A bit cramped?', 'Happens', 'Hmm…'],
  'say.win': ['Hooray!', 'Victory!', 'Grid master!'],
  'say.lose': ['Rematch?', 'Next time…', 'Blame the dice'],
  'gl.h.how': 'How to play',
  'gl.how': `
    <p><b>You need:</b> two players, two dice, and a 10 × 10 grid for each player.</p>
    <p><b>Goal:</b> by the end, have more shaded squares on <b>your own</b> grid than your opponent has on theirs.</p>
    <ol>
      <li>Each turn starts with a roll of two dice. Got 3 and 5? Shade a 3 × 5 (or 5 × 3) rectangle of <b>empty</b> squares. Tap a grid to try it on, use “rotate” to swap the sides, then tap the shadow again to place it.</li>
      <li>Instead of your own grid, you may place the rectangle <b>on your opponent’s grid</b>. Those squares still count for them — but a small block in the middle of their grid can wreck their plans.</li>
      <li>If the rectangle won’t fit on your grid, you lose your turn (you may still drop it on your opponent’s grid if you like).</li>
      <li>When both players lose their turns one right after the other, the game ends. Whoever has more shaded squares on their grid wins.</li>
    </ol>`,
  'gl.h.tips': 'Tricks',
  'gl.tips': `
    <ul>
      <li>Pack rectangles <b>tight</b> against the edges and each other. Skinny one- or two-square gaps are hard to ever fill.</li>
      <li>Keep one <b>big open area</b>: a 5 × 6 doesn’t come up often, but when it does and you have no room, it stings.</li>
      <li>Spoiling works best with a <b>tiny</b> piece (1 × 1, 1 × 2) dropped right in the middle of your opponent’s largest open space: you give away a couple of squares and take away their big rectangles.</li>
      <li>Late in the game, when your own grid is full, a “lost” turn can still be spent on mischief.</li>
    </ul>
    <p class="tip"><b>Variants.</b> Turn spoiling off in the settings — everyone plays only on their own grid — for a calm game of luck and neat packing. Changing the grid size helps too: 8 × 8 is short and cutthroat, 12 × 12 long and roomy.</p>`,
  'gl.h.origin': 'Where it comes from',
  'gl.origin': `
    <p>The seed of the game comes from YouCubed, a math-education center at Stanford University. Their version, with two dice and a grid, is <b>cooperative</b>: kids take turns filling a grid with rectangles and get used to seeing multiplication as area along the way.</p>
    <p>Ben Orlin added just one rule — you may place your rectangle on your opponent’s grid — and a gentle times-table exercise became a crafty game about space, risk and small acts of sabotage.</p>`,
});
