import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'h101.title': '101 — и хватит',
  'h101.tagline': 'кубик, десятки и единицы: доберитесь до сотни, но не дальше',
  'h101.mode': 'Играем:',
  'h101.mode.pvp': 'без компьютера',
  'h101.mode.easy': 'с компьютером (простой)',
  'h101.mode.normal': 'с компьютером (обычный)',
  'h101.mode.hard': 'с компьютером (хитрый)',
  'h101.players': 'Игроков:',
  'h101.rounds': 'Раундов:',
  'h101.rounds.n': ['раунд', 'раунда', 'раундов'],
  'h101.wins': ['победа', 'победы', 'побед'],
  'h101.again': 'ещё матч!',
  'h101.p0': 'Синий',
  'h101.p1': 'Красный',
  'h101.p2': 'Зелёный',
  'h101.p3': 'Оранжевый',
  'h101.cpu': 'Компьютер',
  'h101.round': 'Раунд {r} из {n}',
  'h101.roll': 'бросить',
  'h101.next': 'следующий раунд →',
  'h101.bust': 'перебор',
  'h101.wait.roll': 'бросает…',
  'h101.wait.pick': 'выбирает…',
  'h101.st.roll': 'Бросает {name}',
  'h101.st.roll.you': 'Ваш бросок',
  'h101.st.pick': '{name}: {d} или {dd}?',
  'h101.st.pick.you': 'Взять {d} или {dd}?',
  'h101.st.thinking': '{name} думает…',
  'h101.st.them': 'Ходит {name}…',
  'h101.st.roundwin': 'Раунд за: {name} ({v})',
  'h101.st.roundtie': 'Ничья в раунде: {names}',
  'h101.st.roundnone': 'Перебор у всех — раунд ничей',
  'h101.online.wait': 'Ждём второго игрока…',
  'h101.online.note': 'Сейчас идёт игра по сети: новый матч начинает и число раундов выбирает создатель комнаты.',
  'h101.online.waitnew': 'Новый матч начнёт {name}',
  'h101.win': 'Побеждает {name}!',
  'h101.tie': 'Ничья!',
  'h101.tie.some': 'Делят победу: {names}',
  'h101.score': 'по раундам {s}',
  'say.big': ['Десятки!', 'Ныряю!', 'Гуляем!', 'Ух!'],
  'say.careful': ['Потихоньку…', 'Не жадничаю', 'Спокойно'],
  'say.good': ['Расчёт!', 'Как по нотам', 'Так и надо'],
  'say.risky': ['Смело…', 'Ой, рискованно', 'Ну-ну', 'Посмотрим…'],
  'say.timid': ['Маловато', 'Скромненько', 'Робко!'],
  'say.bust': ['Перебор!', 'Эх, жадность…', 'Сгораю!', 'Ну вот…'],
  'say.gloat': ['Хе-хе', 'Бывает!', 'Минус один'],
  'say.hundred': ['Ровно сто!', 'Сотня!', 'В яблочко!'],
  'say.round': ['Раунд мой!', 'Есть!', 'Ближе всех!'],
  'say.lostround': ['Ну и ладно', 'Отыграюсь', 'Эх'],
  'say.win': ['Ура!', 'Чемпион!', 'Я гений!'],
  'say.lose': ['Реванш?', 'Ещё разок?', 'Кубик виноват'],
  'h101.h.how': 'Как играть',
  'h101.how': `
    <p><b>Что нужно:</b> обычный кубик, 2–4 игрока и листок для счёта.</p>
    <p><b>Цель раунда:</b> набрать сумму как можно ближе к <b>100</b>, но не больше.</p>
    <ol>
      <li>Ходите по очереди: каждый ход — один бросок кубика.</li>
      <li>Выпавшее число вы добавляете к своей сумме <b>как есть</b> (выпало 4 — прибавьте 4) или <b>как десятки</b> (прибавьте 40). Решаете вы.</li>
      <li>За раунд каждый бросает ровно <b>шесть раз</b>, отказаться от броска нельзя.</li>
      <li>Сумма больше 100 — <b>перебор</b>: она считается нулём, и до конца раунда вы больше не бросаете.</li>
      <li>Раунд выигрывает тот, у кого сумма ближе всех к сотне (не больше 100). При равенстве раунд засчитывается всем, у кого лучшая сумма.</li>
      <li>Матч — пять раундов (можно поменять в настройках). Чемпион — у кого больше выигранных раундов.</li>
    </ol>
    <p>Нажмите на кубик или «бросить», потом выберите одну из двух кнопок.</p>`,
  'h101.h.tips': 'Хитрости',
  'h101.tips': `
    <ul>
      <li>Шесть бросков обязательны, а каждый добавляет <b>хотя бы 1</b>. Поэтому сотня в середине раунда — не победа, а верный перебор, да и 95 с парой бросков впереди чаще всего сгорает.</li>
      <li>Оставляйте запас под оставшиеся броски: в среднем каждый «единичный» бросок добавляет 3,5. Если впереди ещё <i>k</i> бросков, сумма до 100 − 6·<i>k</i> не сгорит никогда, а около 100 − 3,5·<i>k</i> — уже примерно пятьдесят на пятьдесят.</li>
      <li>Большие числа (5, 6) выгодно брать десятками в начале раунда, маленькие (1, 2) — оставлять «про запас» на конец.</li>
      <li>Смотрите на соперника: если он уже сгорел, вам достаточно просто не перебрать. Если он стоит на 97 — придётся рисковать.</li>
    </ul>
    <p class="tip"><b>Компьютер.</b> Простой почти всегда берёт десятки. Обычный считает лучшую среднюю сумму. Хитрый просчитывает шансы обыграть именно вас с учётом ваших оставшихся бросков.</p>
    <p class="tip"><b>Вариант с секретами.</b> Первый бросок каждого держится в тайне, а дальше все видят кубик, но не знают, взял ли игрок единицы или десятки. Всё раскрывается после последнего броска. В этой версии он не реализован — попробуйте за столом.</p>`,
  'h101.h.origin': 'Откуда игра',
  'h101.origin': `
    <p>Игру придумала американский педагог-математик Мэрилин Бёрнс, чтобы младшие школьники «пощупали» разряды: одна и та же цифра на кубике стоит то 4, то 40 — в зависимости от того, в какой разряд её поставить.</p>
    <p>Но и взрослым тут есть над чем подумать: найти лучшую стратегию — небольшая, но настоящая задача о риске. Жадный план «всегда бери десятки, пока влезает» быстро упирается в сотню слишком рано, а оставшиеся обязательные броски доводят до перебора.</p>`,
});

addStrings('en', {
  'h101.title': '101 and You’re Done',
  'h101.tagline': 'a die, tens and ones: reach a hundred, but no further',
  'h101.mode': 'Play:',
  'h101.mode.pvp': 'people only',
  'h101.mode.easy': 'vs computer (easy)',
  'h101.mode.normal': 'vs computer (normal)',
  'h101.mode.hard': 'vs computer (sneaky)',
  'h101.players': 'Players:',
  'h101.rounds': 'Rounds:',
  'h101.rounds.n': ['round', 'rounds'],
  'h101.wins': ['win', 'wins'],
  'h101.again': 'another match!',
  'h101.p0': 'Blue',
  'h101.p1': 'Red',
  'h101.p2': 'Green',
  'h101.p3': 'Orange',
  'h101.cpu': 'Computer',
  'h101.round': 'Round {r} of {n}',
  'h101.roll': 'roll',
  'h101.next': 'next round →',
  'h101.bust': 'bust',
  'h101.wait.roll': 'rolling…',
  'h101.wait.pick': 'choosing…',
  'h101.st.roll': '{name} to roll',
  'h101.st.roll.you': 'Your roll',
  'h101.st.pick': '{name}: {d} or {dd}?',
  'h101.st.pick.you': 'Take {d} or {dd}?',
  'h101.st.thinking': '{name} is thinking…',
  'h101.st.them': '{name} is moving…',
  'h101.st.roundwin': 'Round goes to {name} ({v})',
  'h101.st.roundtie': 'Shared round: {names}',
  'h101.st.roundnone': 'Everyone went bust — nobody takes it',
  'h101.online.wait': 'Waiting for the other player…',
  'h101.online.note': 'You’re playing online: the room creator starts new matches and picks the number of rounds.',
  'h101.online.waitnew': '{name} will start the next match',
  'h101.win': '{name} wins!',
  'h101.tie': 'A tie!',
  'h101.tie.some': 'Shared win: {names}',
  'h101.score': 'rounds {s}',
  'say.big': ['Tens!', 'Here goes!', 'Go big!', 'Whee!'],
  'say.careful': ['Slowly…', 'No greed', 'Ones add up', 'Easy does it'],
  'say.good': ['Calculated!', 'Textbook', 'That’s the way'],
  'say.risky': ['Bold…', 'Ooh, risky', 'Well, well', 'We’ll see…'],
  'say.timid': ['That’s timid', 'Modest', 'Too timid'],
  'say.bust': ['Bust!', 'Greed got me…', 'Burned!', 'Oh no…'],
  'say.gloat': ['Heh', 'Happens!', 'One down'],
  'say.hundred': ['Exactly 100!', 'A hundred!', 'Bullseye!'],
  'say.round': ['My round!', 'Yes!', 'Closest!'],
  'say.lostround': ['Whatever', 'Next one’s mine', 'Ugh'],
  'say.win': ['Hooray!', 'Champion!', 'Best at math'],
  'say.lose': ['Rematch?', 'Next time…', 'Blame the die'],
  'h101.h.how': 'How to play',
  'h101.how': `
    <p><b>You need:</b> one ordinary die, 2–4 players and a scrap of paper.</p>
    <p><b>Goal of a round:</b> end as close to <b>100</b> as you can without going over.</p>
    <ol>
      <li>Take turns; each turn is one roll of the die.</li>
      <li>Add the number to your total <b>as ones</b> (roll a 4, add 4) or <b>as tens</b> (add 40). Your call.</li>
      <li>Everybody rolls exactly <b>six times</b> per round — you can’t skip a roll.</li>
      <li>Above 100 is a <b>bust</b>: your total counts as zero and you sit out the rest of the round.</li>
      <li>The total closest to 100 (and not above it) takes the round. On a tie, everyone with the best total takes it.</li>
      <li>A match is five rounds (change it in settings). Most rounds won makes you champion.</li>
    </ol>
    <p>Tap the die or “roll”, then pick one of the two buttons.</p>`,
  'h101.h.tips': 'Tricks',
  'h101.tips': `
    <ul>
      <li>All six rolls are compulsory and each adds <b>at least 1</b>. Hitting 100 mid-round isn’t a win — it’s a sure bust, and 95 with a couple of rolls to go usually burns too.</li>
      <li>Leave room for the rolls to come: a roll taken as ones adds 3.5 on average. With <i>k</i> rolls left, a total of 100 − 6·<i>k</i> or less can never bust, while one near 100 − 3.5·<i>k</i> is roughly a coin flip.</li>
      <li>Big faces (5, 6) are best taken as tens early on; small ones (1, 2) are good to keep as ones near the end.</li>
      <li>Watch your opponent: if they’ve already gone bust, you only need to stay under. If they sit at 97, you’ll have to gamble.</li>
    </ul>
    <p class="tip"><b>The computer.</b> Easy grabs tens almost every time. Normal aims for the best average total. Sneaky works out its odds of beating <i>you</i>, given the rolls you have left.</p>
    <p class="tip"><b>Secret variant.</b> Everyone’s first roll stays hidden; after that the die is public, but nobody knows whether a player took ones or tens until the final reveal. Not built in here — try it at the table.</p>`,
  'h101.h.origin': 'Where it comes from',
  'h101.origin': `
    <p>The game was created by American math educator Marilyn Burns to give young students a hands-on feel for place value: the same face of the die is worth 4 or 40 depending on which column you put it in.</p>
    <p>Grown-ups get a real puzzle too: finding the best strategy is a small but genuine problem about risk. The greedy plan — “take tens whenever they fit” — tends to hit the ceiling too early, and the compulsory rolls that remain push you over.</p>`,
});
