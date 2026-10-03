import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'dom.title': 'Доминирование',
  'dom.tagline': 'кому первым не хватит места для доминошки',
  'dom.size': 'Поле:',
  'dom.variant': 'Правила:',
  'dom.variant.dom': 'классика',
  'dom.variant.cram': '«Теснота» (Cram)',
  'dom.mode': 'Играем:',
  'dom.mode.pvp': 'вдвоём',
  'dom.mode.easy': 'с компьютером (простой)',
  'dom.mode.normal': 'с компьютером (обычный)',
  'dom.mode.hard': 'с компьютером (сильный)',
  'dom.again': 'ещё раз!',
  'dom.p0': 'Синий',
  'dom.p1': 'Красный',
  'dom.cpu': 'Компьютер',
  'dom.role.h': '↔ лёжа',
  'dom.role.v': '↕ стоя',
  'dom.role.any': '↔ ↕',
  'dom.spots': ['место', 'места', 'мест'],
  'dom.turn': 'Ходит {name}',
  'dom.thinking': '{name} думает…',
  'dom.turn.you': 'Ваш ход',
  'dom.turn.them': 'Ходит {name}…',
  'dom.online.wait': 'Ждём второго игрока…',
  'dom.online.note': 'Сейчас идёт игра по сети: новую партию начинает, поле и правила выбирает создатель комнаты.',
  'dom.online.waitnew': 'Новую партию запустит {name}',
  'dom.win': 'Побеждает {name}!',
  'dom.why': '{name} — доминошку положить некуда',
  'dom.say.squeeze': ['Тесновато?', 'Подвинься!', 'Моё место!', 'Хе-хе', 'Не пройдёшь'],
  'dom.say.safe': ['Это мне на потом', 'Запас!', 'Тихая гавань'],
  'dom.say.ouch': ['Эй!', 'Ой', 'Куда мне теперь?', 'Хм…'],
  'dom.say.low': ['Места почти нет…', 'Тесно!', 'Помогите'],
  'dom.say.win': ['Ура!', 'Простор мой!', 'Победа!'],
  'dom.say.lose': ['Реванш?', 'Некуда…', 'Зажали'],
  'dom.h.how': 'Как играть',
  'dom.how': `
    <p><b>Что нужно:</b> двое и клетчатое поле (подойдёт и тетрадный лист). Доминошка занимает <b>две соседние клетки</b>.</p>
    <ol>
      <li>Ходите по очереди: каждый кладёт одну доминошку на две пустые клетки.</li>
      <li><b class="blue">Синий</b> кладёт доминошки только <b>лёжа</b> (↔), <b class="red">красный</b> — только <b>стоя</b> (↕).</li>
      <li>Нельзя накрывать уже занятые клетки и вылезать за край.</li>
      <li>Кому в свой ход <b>некуда положить</b> доминошку — тот проиграл. Ничьих не бывает.</li>
    </ol>
    <p>Нажмите на поле там, куда хотите положить доминошку: она встанет ближе всего к пальцу. На телефоне можно прижать палец, посмотреть, где появится доминошка, и отпустить.</p>`,
  'dom.h.tips': 'Хитрости',
  'dom.tips': `
    <ul>
      <li>Каждая ваша доминошка заодно <b>отнимает место у соперника</b>. Кладите её так, чтобы перекрыть ему как можно больше вариантов, а себе — как можно меньше.</li>
      <li>Ищите <b>«свои» места</b>: две клетки, куда соперник уже никогда не влезет (например, полоска высотой в одну клетку для того, кто кладёт лёжа). Такие места не горят — оставьте их на конец игры, а пока ходите в спорных зонах.</li>
      <li>Ближе к концу доминошки делят поле на маленькие отдельные комнатки. Каждую можно разобрать отдельно: сложите, сколько ходов осталось у вас и у соперника, — и станет ясно, у кого место кончится раньше. Число под именем — сколько вариантов у игрока прямо сейчас.</li>
    </ul>
    <p class="tip"><b>«Теснота» (Cram).</b> Близкий родственник: оба игрока кладут доминошки как угодно — и лёжа, и стоя. Кому некуда ходить, тот проиграл. Здесь важна уже не своя территория, а чётность: сколько ходов осталось всего. Включается в настройках.</p>`,
  'dom.h.origin': 'Откуда игра',
  'dom.origin': `
    <p>Игру придумал шведский математик Йоран Андерссон около 1973 года; она быстро попала в колонку Мартина Гарднера и разошлась под разными именами — например, «Стоп-ворота» и «Кросс-крэм».</p>
    <p>Доминирование — одна из любимых игр комбинаторной теории игр: в ней каждая позиция распадается на независимые кусочки, и их можно «складывать» как числа. Этому посвящены целые главы классической книги Берлекэмпа, Конвея и Гая <i>Winning Ways</i>. Компьютеры с тех пор решили немало досок: например, на поле 8 × 8 при идеальной игре выигрывает тот, кто ходит первым.</p>`,
});

addStrings('en', {
  'dom.title': 'Domineering',
  'dom.tagline': 'who runs out of room for a domino first?',
  'dom.size': 'Board:',
  'dom.variant': 'Rules:',
  'dom.variant.dom': 'classic',
  'dom.variant.cram': 'Cram (any direction)',
  'dom.mode': 'Play:',
  'dom.mode.pvp': 'two players',
  'dom.mode.easy': 'vs computer (easy)',
  'dom.mode.normal': 'vs computer (normal)',
  'dom.mode.hard': 'vs computer (strong)',
  'dom.again': 'again!',
  'dom.p0': 'Blue',
  'dom.p1': 'Red',
  'dom.cpu': 'Computer',
  'dom.role.h': '↔ flat',
  'dom.role.v': '↕ upright',
  'dom.role.any': '↔ ↕',
  'dom.spots': ['spot', 'spots'],
  'dom.turn': '{name} to move',
  'dom.thinking': '{name} is thinking…',
  'dom.turn.you': 'Your move',
  'dom.turn.them': '{name} is moving…',
  'dom.online.wait': 'Waiting for the other player…',
  'dom.online.note': 'You’re playing online: the room creator starts new games and picks the board and rules.',
  'dom.online.waitnew': '{name} will set up the next game',
  'dom.win': '{name} wins!',
  'dom.why': '{name} has nowhere to put a domino',
  'dom.say.squeeze': ['Bit cramped?', 'Scoot over!', 'My spot!', 'Heh', 'No entry'],
  'dom.say.safe': ['Saving that one', 'A spare!', 'Safe harbour'],
  'dom.say.ouch': ['Hey!', 'Ouch', 'Where do I go now?', 'Hmm…'],
  'dom.say.low': ['Running out of room…', 'So tight!', 'Help'],
  'dom.say.win': ['Hooray!', 'All mine!', 'Victory!'],
  'dom.say.lose': ['Rematch?', 'Nowhere to go…', 'Boxed in'],
  'dom.h.how': 'How to play',
  'dom.how': `
    <p><b>You need:</b> two players and a grid (graph paper works). A domino covers <b>two neighbouring squares</b>.</p>
    <ol>
      <li>Take turns placing one domino on two empty squares.</li>
      <li><b class="blue">Blue</b> only places dominoes <b>flat</b> (↔), <b class="red">Red</b> only <b>upright</b> (↕).</li>
      <li>You can’t cover a taken square or hang off the edge.</li>
      <li>If it’s your turn and there’s <b>nowhere to put</b> your domino, you lose. There are no ties.</li>
    </ol>
    <p>Tap the board where you want your domino: it lands on the spot closest to your finger. On a phone you can press, check where the domino will go, then lift.</p>`,
  'dom.h.tips': 'Tricks',
  'dom.tips': `
    <ul>
      <li>Every domino you place also <b>steals room from your opponent</b>. Place it to block as many of their options as you can while costing yourself as few as possible.</li>
      <li>Look for <b>private spots</b>: two squares your opponent can never use (say, a strip one square tall, if you play flat). They won’t go anywhere — save them for the end and fight over the contested areas first.</li>
      <li>Later on, the pieces wall the grid off into small separate rooms. Each room can be worked out on its own: add up what’s left for you and for your opponent, and you’ll see who runs out of room first. The number under each name shows how many placements that player has right now.</li>
    </ul>
    <p class="tip"><b>Cram.</b> A close cousin: both players may place dominoes either way, flat or upright. Whoever can’t move loses. Now it’s not about territory but about parity — how many moves are left in total. Switch it on in settings.</p>`,
  'dom.h.origin': 'Where it comes from',
  'dom.origin': `
    <p>The game was invented by Swedish mathematician Göran Andersson around 1973. It soon appeared in Martin Gardner’s column and travelled under several names, among them Stop-Gate and Cross-Cram.</p>
    <p>Domineering is a darling of combinatorial game theory: positions split into independent pieces that can be “added” like numbers, and Berlekamp, Conway and Guy devote whole chapters of their classic <i>Winning Ways</i> to it. Computers have since solved many boards — on 8 × 8, for example, the first player wins with perfect play.</p>`,
});
