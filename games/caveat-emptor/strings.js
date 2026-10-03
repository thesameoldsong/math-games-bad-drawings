import { addStrings } from '../../shared/i18n.js';

// list → {prefix0: …, prefix1: …} (array values would be picked at random by t())
const seq = (prefix, list) => Object.fromEntries(list.map((v, i) => [prefix + i, v]));

addStrings('ru', {
  'ce.title': 'Caveat Emptor',
  'ce.tagline': 'аукцион, где выигрыш легко обходится дороже проигрыша',
  'ce.players': 'Игроков:',
  'ce.cpu': 'Из них компьютеров:',
  'ce.level': 'Компьютер:',
  'ce.level.easy': 'простой',
  'ce.level.normal': 'обычный',
  'ce.level.hard': 'хитрый',
  'ce.rounds': 'Лотов:',
  'ce.rounds.opt': '{n} (карты 1–{m})',
  'ce.names': 'Имена',
  'ce.again': 'ещё раз!',
  ...seq('ce.p', ['Синий', 'Красный', 'Зелёный', 'Оранжевый', 'Фиолетовый', 'Бирюзовый', 'Розовый', 'Бурый']),
  ...seq('ce.bot', ['Робо', 'Чип', 'Байт', 'Болт', 'Гизмо', 'Пиксель', 'Зип', 'Тостер']),
  'ce.lot': 'Лот {r} из {n}',
  'ce.auctioneer': 'ведёт {name}',
  'ce.nobid': 'ставок нет',
  'ce.sold': 'продано!',
  'ce.value': 'стоит',
  'ce.col.cards': 'карты',
  'ce.col.now': 'тайна',
  'ce.col.bid': 'ставка',
  'ce.col.score': 'счёт',
  'ce.out': 'пас',
  ...seq('ce.item', ['плюшевый мишка', 'огрызок карандаша', 'крекер', 'купон на скидку', 'скрепка', 'одинокий носок',
    'резиновая уточка', 'кружка со сколом', 'ложка', 'ключ неизвестно от чего', 'банан', 'лампочка']),
  // panel
  'ce.pick.you': 'Выберите тайную карту — её прибавят к цене лота:',
  'ce.pick.name': '{name}, выберите тайную карту:',
  'ce.cover': 'Передайте устройство: {name}',
  'ce.cover.note': 'Остальные — не подглядывайте!',
  'ce.cover.btn': 'Это я, {name}',
  'ce.wait.pick': 'Ждём, пока выберут карты…',
  'ce.mine': 'Ваша карта: {c}',
  'ce.worth': 'лот стоит от {lo} до {hi}',
  'ce.peek': 'держите, чтобы увидеть карту',
  'ce.bid': 'ставлю {n}',
  'ce.drop': 'пас',
  'ce.open': 'Первую ставку пропустить нельзя.',
  'ce.next': 'следующий лот →',
  'ce.sum': 'Карты: {cards} = {v}',
  'ce.deal': '{name}: {v} − {p} = {d}',
  // status line
  'ce.st.pick': 'Выбираем тайные карты',
  'ce.st.turn': '{name}: повысить или пас?',
  'ce.st.open': '{name} открывает торги',
  'ce.st.you': 'Ваша ставка',
  'ce.st.them': 'Ходит {name}…',
  'ce.st.thinking': '{name} думает…',
  'ce.st.sold': 'Лот уходит к игроку {name}: {d}',
  'ce.online.wait': 'Ждём второго игрока…',
  'ce.online.note': 'Игра по сети: синий — создатель комнаты, красный — гость, остальные места занимает компьютер. Новую партию и настройки выбирает создатель комнаты.',
  'ce.online.waitnew': 'Новую партию начнёт {name}',
  'ce.win': 'Побеждает {name}!',
  'ce.tie': 'Ничья: {names}',
  // speech bubbles
  'say.pitch': ['{Item}! Почти антиквариат!', 'Перед вами — {item}. Шедевр!', '{Item}: мечта коллекционера!', 'Только сегодня: {item}!', 'Взгляните: {item}! Бесценно!'],
  'say.bid': ['{n}!', '{n}!', 'Даю {n}', '{n}, и точка', 'Пусть будет {n}'],
  'say.open': ['Начнём с {n}', 'Для разгона: {n}', '{n} для начала'],
  'say.drop': ['Пас. У меня {c}', 'Я пас, моя карта — {c}', 'Хватит. Была {c}'],
  'say.profit': ['Выгодно!', 'Отличная сделка', 'Моё!', 'Дёшево досталось'],
  'say.curse': ['Проклятие победителя!', 'Ох, переплата…', 'Зачем мне это?', 'Ой-ой'],
  'say.even': ['В ноль', 'Ни туда ни сюда'],
  'say.gloat': ['Хе-хе', 'Сочувствую!', 'Удачной покупки!', 'Бывает'],
  'say.envy': ['Эх, упустили', 'А могли бы…', 'Хм'],
  'say.win': ['Ура!', 'Я — акула торгов!', 'Победа!'],
  'say.lose': ['Реванш?', 'В следующий раз…', 'Ну и ладно'],
  // sheets
  'ce.h.how': 'Как играть',
  'ce.how': `
    <p><b>Что нужно:</b> от 2 до 8 игроков (лучше всего 4–6). У каждого — карты от 1 до 6, если играть 5 лотов.</p>
    <p><b>Цель:</b> покупать лоты дешевле, чем они на самом деле стоят.</p>
    <ol>
      <li>Каждый раунд один из игроков — <b>аукционист</b> — выставляет лот и нахваливает его. Аукционист меняется по кругу.</li>
      <li>Все (и аукционист тоже) <b>тайно</b> кладут по одной карте. <b>Настоящая цена лота — сумма всех карт</b>, но пока её никто не знает.</li>
      <li>Торги начинает игрок слева от аукциониста: он называет первую ставку. Дальше по кругу каждый либо <b>повышает</b> ставку, либо говорит <b>«пас»</b> и <b>открывает свою карту</b> — так остальные узнают о лоте чуть больше.</li>
      <li>Последний, кто не спасовал, <b>покупает лот</b> по своей ставке. Все карты открываются; покупатель получает <b>цену минус ставку</b> — это может быть и минус.</li>
      <li>Сыгранная карта уходит насовсем: каждую можно использовать только раз за игру. Использованные карты видно в таблице — они зачёркнуты.</li>
      <li>После последнего лота побеждает тот, у кого больше очков.</li>
    </ol>
    <p class="tip">На одном устройстве с несколькими людьми: перед выбором карты экран закрывается, и устройство передают следующему. Во время торгов свою карту можно подсмотреть, удерживая кнопку.</p>`,
  'ce.h.tips': 'Хитрости',
  'ce.tips': `
    <ul>
      <li><b>Считайте вилку.</b> Сложите свою карту, открытые карты и самые маленькие (и самые большие) из оставшихся у соперников — получится, сколько лот стоит как минимум и как максимум. Подсказка под таблицей делает это за вас.</li>
      <li><b>Победа — не цель.</b> Если вы переплатите, а все остальные спасуют, вы просто потеряете очки. Пасовать — нормально.</li>
      <li><b>Читайте ставки.</b> Кто рвётся вверх, скорее всего держит крупную карту… или блефует.</li>
      <li><b>Два блефа.</b> Положите маленькую карту и торгуйтесь бодро — пусть соперники переплатят. Или положите большую и делайте вид, что лот так себе, — и заберите его дёшево.</li>
      <li><b>Следите за остатками.</b> К последним лотам у каждого остаётся всего пара карт, и цена почти угадывается.</li>
    </ul>
    <p class="tip"><b>Другое число лотов.</b> Чтобы сыграть n лотов, берите карты от 1 до n + 1 — в последнем раунде у каждого останется выбор из двух. Это можно поменять в настройках.</p>
    <p class="tip"><b>Настоящий аукцион.</b> Можно разыгрывать настоящие призы — шоколадку или право выбрать следующую игру. Забавная поправка: приз достаётся только тому, кто не переплатил.</p>
    <p class="tip"><b>Родственники.</b> В <i>Liar’s Dice</i> (Дудо) игроки прячут кубики под стаканчиками и торгуются, сколько на столе, скажем, троек; любую ставку можно оспорить. <i>Liar’s Poker</i> — то же самое с цифрами серийных номеров купюр.</p>`,
  'ce.h.origin': 'Откуда игра',
  'ce.origin': `
    <p>Игру придумал сам Бен Орлин — захотелось чего-то шумного и компанейского после долгой возни со стратегическими играми. Название — латинское «пусть покупатель будет бдителен».</p>
    <p>Первые версии страдали от <b>проклятия победителя</b>: выигравший аукцион так часто переплачивал, что лучше было вообще не торговаться. Помогли две находки на тестовых вечеринках: каждую карту можно сыграть лишь раз, а спасовавший открывает свою карту. Информации стало больше — и проклятие ослабло.</p>
    <p>Проклятие победителя хорошо известно экономистам. Если толпу попросить угадать вес быка, среднее из догадок окажется удивительно точным, но самая большая догадка почти всегда завышена. На аукционе побеждает как раз самый оптимистичный — вот он и переплачивает.</p>`,
});

addStrings('en', {
  'ce.title': 'Caveat Emptor',
  'ce.tagline': 'an auction where winning can cost more than losing',
  'ce.players': 'Players:',
  'ce.cpu': 'Of them, computers:',
  'ce.level': 'Computer:',
  'ce.level.easy': 'easy',
  'ce.level.normal': 'normal',
  'ce.level.hard': 'sly',
  'ce.rounds': 'Lots:',
  'ce.rounds.opt': '{n} (cards 1–{m})',
  'ce.names': 'Names',
  'ce.again': 'again!',
  ...seq('ce.p', ['Blue', 'Red', 'Green', 'Orange', 'Purple', 'Teal', 'Pink', 'Brown']),
  ...seq('ce.bot', ['Robo', 'Chip', 'Byte', 'Bolt', 'Gizmo', 'Pixel', 'Zip', 'Toaster']),
  'ce.lot': 'Lot {r} of {n}',
  'ce.auctioneer': 'auctioneer: {name}',
  'ce.nobid': 'no bids yet',
  'ce.sold': 'sold!',
  'ce.value': 'worth',
  'ce.col.cards': 'cards',
  'ce.col.now': 'secret',
  'ce.col.bid': 'bid',
  'ce.col.score': 'score',
  'ce.out': 'out',
  ...seq('ce.item', ['teddy bear', 'pencil stub', 'cracker', 'discount coupon', 'paperclip', 'lonely sock',
    'rubber duck', 'chipped mug', 'spoon', 'mystery key', 'banana', 'light bulb']),
  'ce.pick.you': 'Pick a secret card — it adds to the lot’s value:',
  'ce.pick.name': '{name}, pick a secret card:',
  'ce.cover': 'Pass the device to {name}',
  'ce.cover.note': 'Everyone else — no peeking!',
  'ce.cover.btn': 'I’m {name}',
  'ce.wait.pick': 'Waiting for cards to be picked…',
  'ce.mine': 'Your card: {c}',
  'ce.worth': 'the lot is worth {lo}–{hi}',
  'ce.peek': 'hold to see your card',
  'ce.bid': 'bid {n}',
  'ce.drop': 'drop out',
  'ce.open': 'The opening bid can’t be skipped.',
  'ce.next': 'next lot →',
  'ce.sum': 'Cards: {cards} = {v}',
  'ce.deal': '{name}: {v} − {p} = {d}',
  'ce.st.pick': 'Picking secret cards',
  'ce.st.turn': '{name}: raise or drop out?',
  'ce.st.open': '{name} opens the bidding',
  'ce.st.you': 'Your bid',
  'ce.st.them': '{name} is bidding…',
  'ce.st.thinking': '{name} is thinking…',
  'ce.st.sold': '{name} buys the lot: {d}',
  'ce.online.wait': 'Waiting for the other player…',
  'ce.online.note': 'Online game: blue is the room creator, red is the guest, other seats are played by the computer. The room creator starts new games and picks the settings.',
  'ce.online.waitnew': '{name} will start the next game',
  'ce.win': '{name} wins!',
  'ce.tie': 'A tie: {names}',
  'say.pitch': ['Behold: {item}!', 'This {item} could be yours!', 'One genuine {item}!', 'A {item}! Nearly antique!', 'Lot: {item}. Priceless!'],
  'say.bid': ['{n}!', '{n}!', 'I’ll pay {n}', '{n}, final offer', 'Make it {n}'],
  'say.open': ['Let’s start at {n}', '{n} to begin', 'Opening: {n}'],
  'say.drop': ['I’m out. I had a {c}', 'Pass — my card: {c}', 'Too rich. I had {c}'],
  'say.profit': ['A bargain!', 'Great deal', 'Mine!', 'Cheap!'],
  'say.curse': ['Winner’s curse!', 'Oops, overpaid…', 'Why did I buy this?', 'Uh-oh'],
  'say.even': ['Broke even', 'Meh'],
  'say.gloat': ['Heh', 'Enjoy it!', 'Sold, sucker', 'Happens'],
  'say.envy': ['Should’ve kept going', 'Missed that one', 'Hmm'],
  'say.win': ['Hooray!', 'Auction shark!', 'Victory!'],
  'say.lose': ['Rematch?', 'Next time…', 'Whatever'],
  'ce.h.how': 'How to play',
  'ce.how': `
    <p><b>You need:</b> 2 to 8 players (4–6 is best). For 5 lots, each player has cards 1 to 6.</p>
    <p><b>Goal:</b> buy lots for less than they’re really worth.</p>
    <ol>
      <li>Each round one player — the <b>auctioneer</b> — puts up a lot and praises it. The role passes around the table.</li>
      <li>Everyone (the auctioneer too) <b>secretly</b> plays one card. <b>The lot’s true value is the sum of all cards</b> — but nobody knows it yet.</li>
      <li>The player left of the auctioneer names an opening bid. Then, going around, each player either <b>raises</b> or <b>drops out</b> — and dropping out means <b>revealing your card</b>, so everyone learns a bit more.</li>
      <li>The last player still in <b>buys the lot</b> at their bid. All cards are shown; the buyer scores <b>value minus price</b> — which may be negative.</li>
      <li>A played card is gone for good: each number is used once per game. Spent cards are crossed out in the table.</li>
      <li>After the last lot, the highest score wins.</li>
    </ol>
    <p class="tip">Several people on one device: the screen is covered before each secret pick, so pass the device along. During bidding you can hold a button to peek at your own card.</p>`,
  'ce.h.tips': 'Tricks',
  'ce.tips': `
    <ul>
      <li><b>Know the range.</b> Add your card, the revealed cards, and the smallest (then the largest) cards your rivals still hold: that’s the lowest and highest the lot can be worth. The hint under the table does this for you.</li>
      <li><b>Winning isn’t the goal.</b> Overpay while everyone else drops out and you simply lose points. Dropping out is fine.</li>
      <li><b>Read the bids.</b> Someone pushing the price up probably holds a big card… or is bluffing.</li>
      <li><b>Two bluffs.</b> Play a small card and bid eagerly so others overpay. Or play a big one, act unimpressed, and grab the lot cheap.</li>
      <li><b>Watch what’s left.</b> By the last lots everyone has only a couple of cards, and the value is nearly guessable.</li>
    </ul>
    <p class="tip"><b>Other lengths.</b> To play n lots, use cards 1 to n + 1, so everyone still has a choice of two in the final round. You can change this in settings.</p>
    <p class="tip"><b>Real prizes.</b> Auction off something real — a candy bar, or the right to pick the next game. A fun twist: the buyer only gets the prize if they didn’t overpay.</p>
    <p class="tip"><b>Relatives.</b> In <i>Liar’s Dice</i> (Dudo) everyone hides dice under a cup and bids on how many of some face are on the table; any bid can be challenged. <i>Liar’s Poker</i> is the same idea with the digits of banknote serial numbers.</p>`,
  'ce.h.origin': 'Where it comes from',
  'ce.origin': `
    <p>Ben Orlin invented this one himself, craving something loud and social after a long stretch of abstract strategy games. The name is Latin for “let the buyer beware.”</p>
    <p>Early versions suffered from the <b>winner’s curse</b>: whoever won an auction overpaid so often that the best plan was not to bid at all. Two ideas from play-testing parties fixed it: each card can be played only once, and whoever drops out shows their card. More information, weaker curse.</p>
    <p>Economists know the winner’s curse well. Ask a crowd to guess the weight of an ox and the average guess is uncannily close — but the highest guess is almost always too high. At an auction the most optimistic bidder wins, and so tends to overpay.</p>`,
});
