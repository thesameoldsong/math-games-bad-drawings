import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'pw.title': 'Мелочь',
  'pw.tagline': 'игра о том, как правильно брать сдачу',
  'pw.players': 'Игроков:',
  'pw.mode': 'Играем:',
  'pw.mode.pvp': 'только люди',
  'pw.mode.easy': 'с компьютером (простой)',
  'pw.mode.normal': 'с компьютером (обычный)',
  'pw.mode.hard': 'с компьютером (хитрый)',
  'pw.coins': 'Кошелёк:',
  'pw.c.classic': 'классический',
  'pw.c.coprimes': '«взаимно простой»',
  'pw.c.darlene': '«Дарлин»',
  'pw.c.nodimes': 'без 10¢',
  'pw.c.sugar': '«Сахарок»',
  'pw.c.taylor': '«Тейлор»',
  'pw.c.djibouti': 'Джибути',
  'pw.c.chile': 'Чили',
  'pw.c.bhutan': 'Бутан',
  'pw.c.azerbaijan': 'Азербайджан',
  'pw.c.madagascar': 'Мадагаскар',
  'pw.purse': 'У каждого: {list} — всего {sum}¢',
  'pw.rule': 'Сдача:',
  'pw.r.classic': 'дешевле монеты',
  'pw.r.perfect': 'точная',
  'pw.r.more': 'с горкой',
  'pw.vsnote': 'Вы играете за Синего, остальные — компьютер.',
  'pw.again': 'ещё раз!',
  'pw.p0': 'Синий', 'pw.p1': 'Красный', 'pw.p2': 'Зелёный', 'pw.p3': 'Рыжий', 'pw.p4': 'Лиловый', 'pw.p5': 'Розовый',
  'pw.cpu': 'Компьютер',
  'pw.bot': 'Робот {n}',
  'pw.coinsN': ['монета', 'монеты', 'монет'],
  'pw.broke': 'банкрот',
  'pw.pick': '{name}: положите монету',
  'pw.pick.you': 'Ваш ход: положите монету',
  'pw.change': '{name}: соберите сдачу',
  'pw.change.you': 'Соберите сдачу и жмите «Готово»',
  'pw.thinking': '{name} думает…',
  'pw.them': 'Ходит {name}…',
  'pw.online.wait': 'Ждём второго игрока…',
  'pw.online.note': 'Сейчас идёт игра по сети: новую партию начинает и кошелёк выбирает создатель комнаты. По сети играют двое.',
  'pw.online.waitnew': 'Новую партию начнёт {name}',
  'pw.ok': 'Готово',
  'pw.table': 'стол',
  'pw.empty': 'на столе пусто',
  'pw.tray.lim': 'сдача {got}¢ из {lim}¢',
  'pw.tray.more': 'сдача {got}¢',
  'pw.tray.none': 'без сдачи',
  'pw.tray.small': 'за самую мелкую монету сдачи нет',
  'pw.tray.hint': 'нажмите монету в своём кошельке',
  'pw.tray.start': 'кошельки полны, стол пуст',
  'pw.last': '{name}: {give}¢, сдача {got}¢',
  'pw.win': 'Побеждает {name}!',
  'pw.left': 'В кошельке осталось {cents}¢',
  'pw.next': 'Следующую партию начинает {name}',
  'pw.say.big': ['Сдачи не надо? Беру!', 'Вот это сдача!', 'Мелочь — моя!', 'Копейка к копейке', 'Как удачно'],
  'pw.say.nochange': ['Эх, без сдачи…', 'Дорогой ход', 'Ну и цены!', 'Плакали мои центы'],
  'pw.say.penny': ['Держи цент', 'Копеечку…', 'Один цент — один ход'],
  'pw.say.robbed': ['Эй, это была моя мелочь!', 'Прощай, моя мелочь!', 'Ну и аппетит'],
  'pw.say.low': ['Последние монеты…', 'Кошелёк худеет', 'Кажется, пора экономить'],
  'pw.say.broke': ['Я банкрот!', 'Всё, пусто', 'Ни цента…'],
  'pw.say.smug': ['Я всё посчитал', 'Сдача сходится', 'Уже знаю, чем кончится'],
  'pw.say.win': ['Ура!', 'Последний цент мой!', 'Бережливость!'],
  'pw.say.lose': ['Реванш?', 'Без гроша…', 'В следующий раз'],
  'pw.h.how': 'Как играть',
  'pw.how': `
    <p><b>Что нужно:</b> от двух до шести игроков и горсть монет. Кошельки у всех одинаковые: четыре монеты по 1¢, три по 5¢, две по 10¢ и одна в 25¢ — всего 64¢.</p>
    <p><b>Цель:</b> остаться последним, у кого ещё звенят монеты.</p>
    <ol>
      <li>В свой ход положите <b>одну</b> свою монету на стол.</li>
      <li>Потом можно забрать со стола <b>сдачу</b> — любые монеты, которые вместе стоят <b>строго меньше</b> положенной. Положили 10¢ — заберёте не больше 9¢. Часто сдачи нет вовсе (например, в самом первом ходу).</li>
      <li>У кого кончились монеты, тот выбывает. Последний игрок с деньгами побеждает.</li>
    </ol>
    <p class="tip">Здесь: нажмите монету в своём кошельке — она ляжет на стол, а самая щедрая сдача соберётся сама. Можно поправить: нажатие на стопку на столе добавляет монету, на монету в сдаче — возвращает её. Затем «Готово».</p>`,
  'pw.h.tips': 'Хитрости',
  'pw.tips': `
    <ul>
      <li><b>Берите всю сдачу.</b> Каждый ход стоит минимум цент. С 64¢ в теории можно продержаться 64 хода — но каждый недобранный цент сокращает вашу жизнь.</li>
      <li><b>Монета в 1¢ — ровно один ход.</b> А вот 25¢ могут купить и десяток ходов, и всего один: всё зависит от того, найдётся ли на столе мелочь для сдачи.</li>
      <li><b>Не спешите избавляться от мелочи.</b> Положите пенни — и его тут же подберёт сосед. Придержите крупное до момента, когда на столе есть чем дать сдачу, но и мелкие монеты не разбазаривайте.</li>
    </ul>
    <p class="tip"><b>Кто выигрывает?</b> Наш компьютер перебрал все позиции партии вдвоём — для каждого кошелька и каждого правила сдачи в настройках. Вывод: при безошибочной игре всегда побеждает тот, кто ходит <b>вторым</b>. Поэтому право первого хода переходит из партии в партию, а «хитрый» компьютер, ходя вторым, не ошибается (разве что на самых больших наборах, где он считает не до конца).</p>
    <p><b>Варианты</b> (есть в настройках):</p>
    <ul>
      <li><b>Другие кошельки.</b> Автор игры предлагал свои наборы, а можно взять монеты настоящих стран — например, в Джибути и на Мадагаскаре есть монеты в 2 единицы, а в Азербайджане — в 3. Главное, чтобы у всех кошельки были одинаковые.</li>
      <li><b>Точная сдача:</b> можно забрать и ровно столько, сколько положили, но только монетами помельче (за 10¢ — две по 5¢).</li>
      <li><b>Сдача с горкой:</b> забирайте со стола <i>все</i> монеты мельче положенной, сколько бы они ни стоили.</li>
    </ul>
    <p>Загадка: может ли с такими щедрыми правилами игра длиться вечно?</p>
    <p><b>Ещё вариант — с кубиками:</b> вместо монет у каждого по пять кубиков; кубик можно «разменять» на кубики со стола с меньшей суммой очков, а можно перевернуть свой кубик (1 ↔ 6, 2 ↔ 5, 3 ↔ 4).</p>`,
  'pw.h.origin': 'Откуда игра',
  'pw.origin': `
    <p>«Мелочь» (в оригинале <i>Pennywise</i>) придумал Джеймс Эрнест — основатель маленького издательства Cheapass Games, известного дешёвыми и остроумными настольными играми. Игра настолько проста, что когда-то её правила печатали прямо на обороте визитки издательства.</p>
    <p>Игра продолжает старую традицию задачек о размене. Например: чтобы набрать 99¢ американскими монетами, нужно минимум девять монет. А какую сумму меньше доллара так же трудно набрать? (Ответ: 94¢ — тоже девять монет.) А какие четыре номинала позволили бы набирать любые суммы от 1¢ до 99¢ самым маленьким числом монет? Хорошая задача для программиста.</p>
    <p>А ещё монеты напоминают, откуда вообще взялись числа. Древние счетоводы отмечали каждую овцу отдельным глиняным жетоном, потом придумали жетоны «за несколько овец» — прообраз пятаков и гривенников, — а от них дошли до числа «три» самого по себе, без овец. Есть гипотеза, что и письменность выросла из отметок на конвертах с такими жетонами.</p>`,
});

addStrings('en', {
  'pw.title': 'Pennywise',
  'pw.tagline': 'a game about taking your change',
  'pw.players': 'Players:',
  'pw.mode': 'Play:',
  'pw.mode.pvp': 'humans only',
  'pw.mode.easy': 'vs computer (easy)',
  'pw.mode.normal': 'vs computer (normal)',
  'pw.mode.hard': 'vs computer (sneaky)',
  'pw.coins': 'Purse:',
  'pw.c.classic': 'classic',
  'pw.c.coprimes': 'Coprimes',
  'pw.c.darlene': 'Darlene',
  'pw.c.nodimes': 'No Dimes',
  'pw.c.sugar': 'Sugar',
  'pw.c.taylor': 'Taylor',
  'pw.c.djibouti': 'Djibouti',
  'pw.c.chile': 'Chile',
  'pw.c.bhutan': 'Bhutan',
  'pw.c.azerbaijan': 'Azerbaijan',
  'pw.c.madagascar': 'Madagascar',
  'pw.purse': 'Everyone gets: {list} — {sum}¢ in all',
  'pw.rule': 'Change:',
  'pw.r.classic': 'worth less',
  'pw.r.perfect': 'perfect',
  'pw.r.more': 'more than perfect',
  'pw.vsnote': 'You play Blue; everyone else is the computer.',
  'pw.again': 'again!',
  'pw.p0': 'Blue', 'pw.p1': 'Red', 'pw.p2': 'Green', 'pw.p3': 'Orange', 'pw.p4': 'Purple', 'pw.p5': 'Pink',
  'pw.cpu': 'Computer',
  'pw.bot': 'Bot {n}',
  'pw.coinsN': ['coin', 'coins'],
  'pw.broke': 'broke',
  'pw.pick': '{name}: put a coin down',
  'pw.pick.you': 'Your move: put a coin down',
  'pw.change': '{name}: pick your change',
  'pw.change.you': 'Pick your change, then tap “Done”',
  'pw.thinking': '{name} is thinking…',
  'pw.them': '{name} is moving…',
  'pw.online.wait': 'Waiting for the other player…',
  'pw.online.note': 'You’re playing online: the room creator starts new games and picks the purse. Online games are for two.',
  'pw.online.waitnew': '{name} will start the next game',
  'pw.ok': 'Done',
  'pw.table': 'table',
  'pw.empty': 'the table is empty',
  'pw.tray.lim': 'change {got}¢ of {lim}¢',
  'pw.tray.more': 'change {got}¢',
  'pw.tray.none': 'no change',
  'pw.tray.small': 'the smallest coin gets no change',
  'pw.tray.hint': 'tap a coin in your purse',
  'pw.tray.start': 'full purses, empty table',
  'pw.last': '{name}: {give}¢, change {got}¢',
  'pw.win': '{name} wins!',
  'pw.left': '{cents}¢ left in the purse',
  'pw.next': '{name} starts the next game',
  'pw.say.big': ['Keep the change? No way!', 'Nice change!', 'Small coins, big win', 'Every penny counts', 'Lucky!'],
  'pw.say.nochange': ['No change…', 'Pricey move', 'Daylight robbery!', 'There go my cents'],
  'pw.say.penny': ['Here’s a penny', 'Just a cent…', 'One penny, one turn'],
  'pw.say.robbed': ['Hey, that was my change!', 'Took all the pennies!', 'What an appetite'],
  'pw.say.low': ['Last few coins…', 'My purse is shrinking', 'Time to save'],
  'pw.say.broke': ['I’m broke!', 'Empty purse…', 'Not a cent left'],
  'pw.say.smug': ['I’ve done the math', 'The change adds up', 'I know how this ends'],
  'pw.say.win': ['Hooray!', 'The last penny is mine!', 'Thrift wins!'],
  'pw.say.lose': ['Rematch?', 'Bankrupt…', 'Next time'],
  'pw.h.how': 'How to play',
  'pw.how': `
    <p><b>You need:</b> two to six players and a pile of coins. Everyone starts with the same purse: four 1¢ coins, three 5¢, two 10¢ and one 25¢ — 64¢ in all.</p>
    <p><b>Goal:</b> be the last player with any coins left.</p>
    <ol>
      <li>On your turn, put <b>one</b> of your coins on the table.</li>
      <li>Then you may take <b>change</b> from the table: any coins whose total is <b>strictly less</b> than the coin you put down. Put down 10¢ and you can take back at most 9¢. Often there’s no change at all (on the very first move, for instance).</li>
      <li>Run out of coins and you’re out. The last player with money wins.</li>
    </ol>
    <p class="tip">Here: tap a coin in your purse — it goes on the table and the most generous change is picked for you. You can adjust it: tap a pile on the table to add a coin, tap a coin in your change to put it back. Then tap “Done”.</p>`,
  'pw.h.tips': 'Tricks',
  'pw.tips': `
    <ul>
      <li><b>Take all the change you can.</b> Every turn costs at least a cent. With 64¢ you could in theory last 64 turns — but every cent you leave behind shortens your life.</li>
      <li><b>A penny is exactly one turn.</b> A quarter might buy ten turns, or only one: it depends on whether the table has small coins to give you change.</li>
      <li><b>Don’t dump your small coins too early.</b> Put a penny down and your neighbour snaps it up. Save big coins for when the table can make change — but don’t squander the small ones either.</li>
    </ul>
    <p class="tip"><b>Who wins?</b> Our computer searched every position of the two-player game — for every purse and every change rule in the settings. The verdict: with perfect play the player who moves <b>second</b> always wins. That’s why the first move alternates between games, and why the sneaky computer never slips when it moves second (except on the very biggest purses, where it can’t search all the way).</p>
    <p><b>Variants</b> (in the settings):</p>
    <ul>
      <li><b>Other purses.</b> The game’s designer suggested a few, or borrow real countries’ coins — Djibouti and Madagascar have 2-unit coins, Azerbaijan a 3. Just make sure everyone starts with the same purse.</li>
      <li><b>Perfect change:</b> you may take back as much as you paid, but only in smaller coins (two 5¢ for a dime).</li>
      <li><b>More than perfect:</b> take <i>every</i> coin on the table smaller than yours, however much they add up to.</li>
    </ul>
    <p>A puzzle: with such generous rules, could the game ever go on forever?</p>
    <p><b>A dice version:</b> everyone has five dice instead of coins; you trade a die for table dice with a smaller total, or flip one of your own dice over (1 ↔ 6, 2 ↔ 5, 3 ↔ 4).</p>`,
  'pw.h.origin': 'Where it comes from',
  'pw.origin': `
    <p>Pennywise was invented by James Ernest, founder of the tiny publisher Cheapass Games, known for cheap and clever board games. It’s so simple that its rules were once printed on the back of the company’s business card.</p>
    <p>It belongs to an old family of change-making puzzles. Making 99¢ in US coins takes at least nine coins. Which smaller amount is just as awkward? (Answer: 94¢ — also nine.) And which four denominations would let you make every amount from 1¢ to 99¢ with the fewest coins in total? A nice job for a programmer.</p>
    <p>Coins also hint at where numbers came from. Ancient bookkeepers tracked each sheep with its own clay token, then invented tokens worth several sheep — the nickels and dimes of the herd — and eventually reached the idea of “three” on its own, with no sheep attached. One theory says writing itself grew out of the marks pressed onto clay envelopes holding such tokens.</p>`,
});
