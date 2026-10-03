import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'cs.title': 'Палочки',
  'cs.tagline': 'игра на пальцах, где 4 + 4 = 3',
  'cs.mode': 'Играем:',
  'cs.mode.pvp': 'вдвоём (или больше)',
  'cs.mode.easy': 'с компьютером (простой)',
  'cs.mode.normal': 'с компьютером (обычный)',
  'cs.mode.hard': 'с компьютером (безупречный)',
  'cs.players': 'Игроков:',
  'cs.rule': 'Больше пяти:',
  'cs.rule.wrap': 'вычесть пять',
  'cs.rule.cutoff': 'рука выбита',
  'cs.start': 'В начале:',
  'cs.start.1': 'по 1 пальцу',
  'cs.start.4': 'по 4 пальца',
  'cs.again': 'ещё раз!',
  'cs.p0': 'Синий',
  'cs.p1': 'Красный',
  'cs.p2': 'Зелёный',
  'cs.p3': 'Фиолетовый',
  'cs.cpu': 'Компьютер',
  'cs.hands': ['рука', 'руки', 'рук'],
  'cs.outplayer': 'выбывает',
  'cs.turn.pick': '{name}: выберите свою руку',
  'cs.turn.target': '{name}: по какой руке бьём?',
  'cs.thinking': '{name} думает…',
  'cs.turn.you': 'Ваш ход',
  'cs.turn.them': 'Ходит {name}…',
  'cs.split': 'переложить:',
  'cs.online.wait': 'Ждём второго игрока…',
  'cs.online.note': 'Игра по сети: число игроков, правила и новую партию выбирает создатель комнаты. Если игроков трое или четверо, за свободные места играет компьютер; кто подключится позже, сразу забирает его место — со следующего хода.',
  'cs.online.nohost': 'Нет связи с создателем комнаты, ждём…',
  'cs.online.away': '{name}: нет связи, ждём…',
  'cs.online.spectator': 'В этой партии мест нет — вы смотрите. Создатель комнаты может добавить игроков в настройках.',
  'cs.away': 'нет связи',
  'cs.cpu.tag': 'компьютер',
  // shared/net.js picks 'net.full' for a rejected guest whose own setting is 2 players, whatever the room size
  'net.full': 'В комнате {code} нет свободных мест. Создайте свою комнату или введите другой код.',
  'cs.say.hi': ['Я здесь!', 'Привет!', 'Я в игре!'],
  'cs.online.waitnew': 'Новую партию начнёт {name}',
  'cs.ai.note': 'С компьютером играют вдвоём.',
  'cs.win': 'Побеждает {name}!',
  'cs.draw': 'Ничья!',
  'cs.draw.sub': 'Позиция повторилась трижды',
  'cs.next': 'Следующую партию начинает {name}',
  'cs.out': 'выбита!',
  'cs.say.knock': ['Минус рука!', 'Бац!', 'Пять!', 'Выбита!', 'Хоп!'],
  'cs.say.ouch': ['Ой!', 'Ай!', 'Моя рука!', 'Эх…'],
  'cs.say.revive': ['Ожила!', 'Снова две!', 'Воскресла!', 'Сюрприз!'],
  'cs.say.split': ['Переложу…', 'Так-то лучше', 'Хм-хм'],
  'cs.say.blunder': ['Ага!', 'Ловушка!', 'А вот это зря', 'Хе-хе'],
  'cs.say.repeat': ['Где-то это уже было…', 'Опять то же самое', 'Ходим по кругу?', 'Дежавю!'],
  'cs.say.elim': ['Я выбываю…', 'Всё, без рук', 'Пока-пока'],
  'cs.say.win': ['Ура!', 'Победа!', 'Пять — это сила'],
  'cs.say.lose': ['Реванш?', 'В следующий раз…', 'Ну и ладно'],
  'cs.say.draw': ['Ничья!', 'Можно было вечно…', 'Хватит кружить'],
  'cs.h.how': 'Как играть',
  'cs.how': `
    <p><b>Что нужно:</b> двое или больше игроков, у каждого две руки. Пальцы здесь считает игра.</p>
    <p><b>Цель:</b> выбить обе руки соперника.</p>
    <ol>
      <li>Сначала на каждой руке поднят один палец.</li>
      <li><b>Удар.</b> Нажмите свою руку, затем руку соперника. К его руке прибавляется столько пальцев, сколько на вашей. Ваша рука не меняется.</li>
      <li>Ровно <b>пять</b> — рука <b>выбита</b> и сжимается в кулак. Кулак не бьёт, и бить по нему нельзя.</li>
      <li><b>Больше пяти</b> — пять просто вычитается: 3 + 4 = 2, рука остаётся в игре.</li>
      <li><b>Перекладывание.</b> Вместо удара можно по-новому распределить свои пальцы между руками (кнопки под полем). Так можно оживить кулак — или, наоборот, убрать одну руку. Просто поменять руки местами нельзя.</li>
      <li>Обе руки выбиты — игрок выбывает. Побеждает последний, у кого остались пальцы.</li>
    </ol>
    <p class="tip">Хорошие игроки могут ходить по кругу бесконечно, поэтому здесь действует правило: если одна и та же позиция повторилась <b>в третий раз</b> — ничья.</p>`,
  'cs.h.tips': 'Хитрости',
  'cs.tips': `
    <ul>
      <li>Вся игра — это счёт <b>по модулю 5</b>: важен только остаток от деления на пять. Поэтому 4 + 4 = 3, а 3 + 3 = 1. Так же устроены часы: 9 часов плюс 5 часов — это 2 часа.</li>
      <li>Прежде чем бить, посмотрите на ответ. Рука с <i>k</i> пальцами в опасности, если у соперника есть рука с 5 − <i>k</i>: двойку выбивает тройка, единицу — четвёрка.</li>
      <li>Последняя живая рука с одним пальцем — почти всегда беда: перекладывать нечего, а любая четвёрка соперника её добьёт.</li>
      <li>Перекладывание — не трусость. Им можно увернуться от угрозы или вернуть в игру кулак.</li>
      <li>У каждого игрока всего 15 возможных состояний рук, так что двоих хватает на 225 позиций. Безупречный компьютер знает их все: при обычных правилах он не проиграет, но и вы, играя точно, удержите ничью.</li>
    </ul>
    <p class="tip"><b>Варианты.</b> В настройках есть два: <b>«рука выбита»</b> — всё, что больше пяти, тоже выбивает руку (тогда при точной игре побеждает второй игрок!), и <b>«по 4 пальца»</b> — старт сразу с четвёрками; в эту позицию игра уже никогда не вернётся. А ещё можно попробовать с друзьями: считать не до пяти, а до 6, 7 или 99; играть «наоборот» — выигрывает тот, кто первым лишится обеих рук; проигрывать, если осталась одна рука с одним пальцем; или в большой компании разрешить выбывшим «зомби» бить одним пальцем — их самих бить нельзя.</p>`,
  'cs.h.origin': 'Откуда игра',
  'cs.origin': `
    <p>У «Палочек» нет автора: игру придумали дети на школьных переменах — по всей видимости, в Японии, несколько десятилетий назад. Около 2000 года она обошла весь мир, и у неё десятки имён: «Палочки», «Мечи», «Пальцы», «Сплит». Говорят, английское название связано с настоящими палочками для еды: подними все пять пальцев — и палочка упадёт.</p>
    <p>Сами того не зная, дети заново открыли <b>модульную арифметику</b> — счёт по кругу. Математики используют её повсюду: часы считают по модулю 12, дни недели — по модулю 7, а контрольные цифры в номерах банковских счетов и карт ловят опечатки, сравнивая остатки от деления.</p>
    <p>Игру на двоих можно разобрать полностью — позиций немного. Вывод: при точной игре никто не побеждает, и партия может длиться вечно.</p>`,
});

addStrings('en', {
  'cs.title': 'Chopsticks',
  'cs.tagline': 'the finger game where 4 + 4 = 3',
  'cs.mode': 'Play:',
  'cs.mode.pvp': 'two (or more) players',
  'cs.mode.easy': 'vs computer (easy)',
  'cs.mode.normal': 'vs computer (normal)',
  'cs.mode.hard': 'vs computer (perfect)',
  'cs.players': 'Players:',
  'cs.rule': 'Over five:',
  'cs.rule.wrap': 'subtract five',
  'cs.rule.cutoff': 'hand is out',
  'cs.start': 'Start with:',
  'cs.start.1': '1 finger each',
  'cs.start.4': '4 fingers each',
  'cs.again': 'again!',
  'cs.p0': 'Blue',
  'cs.p1': 'Red',
  'cs.p2': 'Green',
  'cs.p3': 'Purple',
  'cs.cpu': 'Computer',
  'cs.hands': ['hand', 'hands'],
  'cs.outplayer': 'out',
  'cs.turn.pick': '{name}: pick your hand',
  'cs.turn.target': '{name}: which hand to tap?',
  'cs.thinking': '{name} is thinking…',
  'cs.turn.you': 'Your move',
  'cs.turn.them': '{name} is moving…',
  'cs.split': 'split:',
  'cs.online.wait': 'Waiting for the other player…',
  'cs.online.note': 'You’re playing online: the room creator picks the number of players, the rules and starts new games. With three or four players, free seats are played by the computer; anyone who joins later takes a free seat over right away, from its next move.',
  'cs.online.nohost': 'Lost the room creator, waiting…',
  'cs.online.away': '{name} is disconnected, waiting…',
  'cs.online.spectator': 'No seat for you in this game — you’re watching. The room creator can add players in the settings.',
  'cs.away': 'offline',
  'cs.cpu.tag': 'computer',
  'net.full': 'Room {code} has no free seats. Create your own room or enter another code.',
  'cs.say.hi': ['I’m here!', 'Hi all!', 'I’m in!'],
  'cs.online.waitnew': '{name} will start the next game',
  'cs.ai.note': 'Games against the computer are for two.',
  'cs.win': '{name} wins!',
  'cs.draw': 'A draw!',
  'cs.draw.sub': 'Same position three times',
  'cs.next': '{name} goes first next game',
  'cs.out': 'out!',
  'cs.say.knock': ['One down!', 'Bam!', 'Five!', 'Knocked out!', 'Boop!'],
  'cs.say.ouch': ['Ouch!', 'Hey!', 'My hand!', 'Ugh…'],
  'cs.say.revive': ['It’s alive!', 'Two again!', 'Back in!', 'Surprise!'],
  'cs.say.split': ['Let me shuffle…', 'That’s better', 'Hmm-hmm'],
  'cs.say.blunder': ['Aha!', 'Gotcha…', 'Bad idea', 'Heh heh'],
  'cs.say.repeat': ['Haven’t we been here?', 'Same again', 'Going in circles?', 'Déjà vu!'],
  'cs.say.elim': ['I’m out…', 'No hands left', 'Bye-bye'],
  'cs.say.win': ['Hooray!', 'Victory!', 'High five!'],
  'cs.say.lose': ['Rematch?', 'Next time…', 'Whatever'],
  'cs.say.draw': ['A draw!', 'Could go on forever…', 'Enough circling'],
  'cs.h.how': 'How to play',
  'cs.how': `
    <p><b>You need:</b> two or more players with two hands each. Here the game counts the fingers for you.</p>
    <p><b>Goal:</b> knock out both of your opponent’s hands.</p>
    <ol>
      <li>Every hand starts with one finger up.</li>
      <li><b>Tap.</b> Tap one of your hands, then an opponent’s hand. Their hand gains as many fingers as yours shows. Yours stays the same.</li>
      <li>Exactly <b>five</b> and the hand is <b>out</b>: it becomes a fist. A fist can’t tap and can’t be tapped.</li>
      <li><b>More than five</b>: just take five away. 3 + 4 = 2, and the hand stays in.</li>
      <li><b>Split.</b> Instead of tapping, you may share out your fingers between your hands in a new way (buttons below the board). That can bring a fist back to life — or close one of your hands. Simply swapping the hands doesn’t count.</li>
      <li>Lose both hands and you’re out. The last player with fingers left wins.</li>
    </ol>
    <p class="tip">Good players could go round in circles forever, so we add one rule: when the same position comes up <b>a third time</b>, it’s a draw.</p>`,
  'cs.h.tips': 'Tricks',
  'cs.tips': `
    <ul>
      <li>The whole game is arithmetic <b>mod 5</b>: only the remainder after dividing by five matters. That’s why 4 + 4 = 3 and 3 + 3 = 1. Clocks work the same way: 9 o’clock plus 5 hours is 2 o’clock.</li>
      <li>Before you tap, look at the reply. A hand with <i>k</i> fingers is in danger if your opponent has a hand with 5 − <i>k</i>: a 3 knocks out a 2, a 4 knocks out a 1.</li>
      <li>A last hand with a single finger is nearly always trouble: there’s nothing to split, and any 4 finishes it.</li>
      <li>Splitting isn’t cowardice. Use it to dodge a threat or to bring a fist back into play.</li>
      <li>Each player has only 15 possible hand states, so two players share just 225 positions. The perfect computer knows them all: with the standard rules it never loses — but if you play precisely, you can always hold a draw.</li>
    </ul>
    <p class="tip"><b>Variants.</b> Two are in the settings: <b>“hand is out”</b> — anything over five knocks the hand out too (then, with perfect play, the second player wins!), and <b>“4 fingers each”</b> — start with fours; the game can never return to that position. Try others with friends: count to 6, 7 or 99 instead of five; play it backwards, so the first to lose both hands wins; lose as soon as you’re down to one hand with one finger; or, in a big group, let eliminated players carry on as “zombies” who tap with one finger but can’t be tapped.</p>`,
  'cs.h.origin': 'Where it comes from',
  'cs.origin': `
    <p>Chopsticks has no inventor: kids made it up at recess — most likely in Japan, a few decades ago. Around the year 2000 it swept the world’s schoolyards and picked up dozens of names: Sticks, Swords, Finger Chess, Split, Magic Fingers. One story says the name comes from real chopsticks: raise all five fingers and you drop them.</p>
    <p>Without knowing it, those kids reinvented <b>modular arithmetic</b> — counting in a circle. Mathematicians use it everywhere: clocks count mod 12, weekdays mod 7, and the check digits in bank account and card numbers catch typos by comparing remainders.</p>
    <p>The two-player game can be solved completely — there aren’t many positions. The verdict: with perfect play nobody wins, and a game can last forever.</p>`,
});
