import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'lam.title': 'Любовь и брак',
  'lam.tagline': 'вечеринка, где надо быстро найти близкое число',
  'lam.mode': 'Играем:',
  'lam.mode.pvp': 'вдвоём',
  'lam.mode.easy': 'с компьютером (простой)',
  'lam.mode.normal': 'с компьютером (обычный)',
  'lam.guests': 'Гостей:',
  'lam.rounds': 'Раундов:',
  'lam.again': 'ещё раз!',
  'lam.next': 'следующий раунд',
  'lam.p0': 'Синий',
  'lam.p1': 'Красный',
  'lam.cpu': 'Компьютер',
  'lam.card': '№{c}',
  'lam.round': 'раунд {r}/{n}',
  'lam.wait': 'ждать',
  'lam.turn': 'Ходит {name}',
  'lam.thinking': '{name} думает…',
  'lam.turn.you': 'Ваш ход',
  'lam.turn.them': 'Ходит {name}…',
  'lam.hint': 'нажмите «?» — узнать номер, число — сделать предложение',
  'lam.online.wait': 'Ждём второго игрока…',
  'lam.online.note': 'Сейчас идёт игра по сети: новую партию начинает и настройки выбирает создатель комнаты.',
  'lam.online.waitnew': 'Новую партию начнёт {name}',
  'lam.round.head': 'Раунд {r}',
  'lam.round.line': '{name}: {pts}',
  'lam.single': 'без пары — 0',
  'lam.couple': '{a} ♥ {b}',
  'lam.win': 'Побеждает {name}!',
  'lam.tie': 'Ничья!',
  'lam.yes': ['Да!', 'Идёт!', 'С радостью!', 'Конечно!'],
  'lam.no': ['Нет!', 'Подожду', 'Не-а', 'Может, позже'],
  'lam.my': 'У меня {c}!',
  'say.wed': ['Свадьба!', 'Ура!', 'Нашлась пара!', 'Мы вместе!'],
  'say.great': ['Идеальная пара!', 'Лучше не бывает!', 'Вот это да!'],
  'say.meh': ['Ну хоть так…', 'Лучше, чем никак', 'Сойдёт'],
  'say.no': ['Отказали…', 'Эх', 'Ну и ладно', 'Подумаешь!'],
  'say.stolen': ['Увели!', 'Это была моя пара!', 'Не успеть…'],
  'say.suitor': ['Ко мне сватаются!', 'Меня зовут под венец?', 'О, поклонник!'],
  'say.ask': ['Какой у вас номер?', 'Покажите карточку!', 'А вы кто?'],
  'say.hurry': ['Время уходит!', 'Скорее!', 'Ряды занимают!'],
  'say.round': ['Неплохо!', 'Отличный раунд', 'Так держать'],
  'say.roundbad': ['Не повезло', 'Отыграюсь', 'Хм…'],
  'say.win': ['Ура!', 'Победа!', 'Я мастер свиданий'],
  'say.lose': ['Реванш?', 'В следующий раз…', 'Любовь зла'],
  'lam.h.how': 'Как играть',
  'lam.how': `
    <p><b>Вечеринка:</b> в зале много гостей, у каждого карточка с номером. Карточки раздают из колоды 1…(гостей + 10), так что некоторых номеров в зале нет. Вы — синий и красный гости, остальные — толпа, которая ищет пару сама.</p>
    <p><b>Цель:</b> набрать больше очков за несколько раундов, выгодно «женившись» в каждом.</p>
    <ol>
      <li>Время идёт тактами (кружки сверху). За такт каждый игрок делает одно действие: нажать на <b>«?»</b> — узнать номер гостя, нажать на <b>открытое число</b> — сделать предложение, или <b>ждать</b>.</li>
      <li>Если гость согласен, пара сразу встаёт на <b>самую высокую свободную строку</b> табло слева. Если нет — ваше предложение остаётся в силе: гость может передумать в следующих тактах.</li>
      <li>Гости из толпы тоже выкрикивают номера и подходят к тем, кто им нравится (сердечко под карточкой — кому они делают предложение). Ответьте на предложение — и свадьба мгновенная.</li>
      <li><b>Очки</b> = число строки ÷ разница номеров. Меньший номер в паре получает <b>+5</b>. Пример: 13 и 15 на строке 80 → 80 ÷ 2 = 40, и ещё +5 у номера 13.</li>
      <li>Кто остался без пары, когда время вышло, получает 0. Раунд заканчивается, когда оба игрока в браке или время вышло.</li>
    </ol>`,
  'lam.h.tips': 'Хитрости',
  'lam.tips': `
    <ul>
      <li>Хочется трёх вещей сразу, и они мешают друг другу: <b>ранняя свадьба</b> (высокая строка), <b>близкий номер</b> (маленькая разница) и <b>быть меньшим в паре</b> (+5).</li>
      <li>Разница 1 делит строку на 1 — это огромный выигрыш. Разница 2 уже вдвое хуже, а разница 5 почти ничего не стоит. Поэтому соседа ищут, пока есть время.</li>
      <li>Толпа сначала разборчива, но к концу вечера соглашается почти на всех. Отказ сейчас — ещё не отказ навсегда.</li>
      <li>Узнавая номера, вы открываете их и сопернику. Иногда лучше подождать, пока гости выкрикнут номера сами.</li>
      <li>Можно пожениться и с соперником: если ваши номера рядом, это лучший вариант для обоих — но +5 достанется меньшему.</li>
    </ul>
    <p class="tip"><b>Вариант для класса.</b> Вживую это игра для большой компании, от 15 человек: каждому раздают карточку, и у всех есть три минуты, чтобы найти пару и положить карточки на табло. Если гостей больше двадцати, строки табло идут через 5 (100, 95, 90…), а не через 10 — здесь так сделано для 24 гостей.</p>`,
  'lam.h.origin': 'Откуда игра',
  'lam.origin': `
    <p>Игру придумал геймдизайнер Джеймс Эрнест — его попросила учительница средней школы, которой нужна была живая игра для класса на тему «любовь и брак». Получилась шумная игра на сообразительность: все ходят по комнате, выкрикивают номера и торгуются.</p>
    <p>Забавно, что заранее не скажешь, повезло ли вам с карточкой. Карточка 1 в любой паре будет меньшей и принесёт +5 — но как раз поэтому соседям невыгодно за него выходить: им самим хочется этот бонус. Всё решает то, как поведут себя остальные гости. Здесь толпу изображает компьютер, а вы с соперником соревнуетесь, кто устроится лучше.</p>`,
});

addStrings('en', {
  'lam.title': 'Love and Marriage',
  'lam.tagline': 'a party where you must find a close number, fast',
  'lam.mode': 'Play:',
  'lam.mode.pvp': 'two players',
  'lam.mode.easy': 'vs computer (easy)',
  'lam.mode.normal': 'vs computer (normal)',
  'lam.guests': 'Guests:',
  'lam.rounds': 'Rounds:',
  'lam.again': 'again!',
  'lam.next': 'next round',
  'lam.p0': 'Blue',
  'lam.p1': 'Red',
  'lam.cpu': 'Computer',
  'lam.card': '#{c}',
  'lam.round': 'round {r}/{n}',
  'lam.wait': 'wait',
  'lam.turn': '{name} to move',
  'lam.thinking': '{name} is thinking…',
  'lam.turn.you': 'Your move',
  'lam.turn.them': '{name} is moving…',
  'lam.hint': 'tap “?” to ask a number, a number to propose',
  'lam.online.wait': 'Waiting for the other player…',
  'lam.online.note': 'You’re playing online: the room creator starts new games and picks the settings.',
  'lam.online.waitnew': '{name} will start the next game',
  'lam.round.head': 'Round {r}',
  'lam.round.line': '{name}: {pts}',
  'lam.single': 'single — 0',
  'lam.couple': '{a} ♥ {b}',
  'lam.win': '{name} wins!',
  'lam.tie': 'A tie!',
  'lam.yes': ['Yes!', 'Gladly!', 'I do!', 'Of course!'],
  'lam.no': ['No!', 'I’ll wait', 'Nope', 'Maybe later'],
  'lam.my': 'I’m {c}!',
  'say.wed': ['Wedding!', 'Hooray!', 'Found a match!', 'Together!'],
  'say.great': ['Perfect match!', 'Can’t beat that!', 'Wow!'],
  'say.meh': ['Better than nothing…', 'It’ll do', 'Well, okay'],
  'say.no': ['Rejected…', 'Ouch', 'Fine then', 'Their loss!'],
  'say.stolen': ['Stolen!', 'That was my match!', 'Too slow…'],
  'say.suitor': ['A suitor!', 'Someone likes me!', 'Ooh, an admirer!'],
  'say.ask': ['What’s your number?', 'Show me your card!', 'And you are…?'],
  'say.hurry': ['Time’s running out!', 'Hurry!', 'The rows are filling!'],
  'say.round': ['Not bad!', 'Great round', 'Keep it up'],
  'say.roundbad': ['Unlucky', 'I’ll catch up', 'Hmm…'],
  'say.win': ['Hooray!', 'Victory!', 'Matchmaking master'],
  'say.lose': ['Rematch?', 'Next time…', 'Love is cruel'],
  'lam.h.how': 'How to play',
  'lam.how': `
    <p><b>The party:</b> a roomful of guests, each holding a numbered card. The cards come from a deck 1…(guests + 10), so some numbers aren’t in the room at all. You are the blue and red guests; everyone else is a crowd looking for partners on its own.</p>
    <p><b>Goal:</b> score more points over several rounds by making good matches.</p>
    <ol>
      <li>Time ticks in beats (the circles on top). Each beat every player takes one action: tap a <b>“?”</b> to ask that guest’s number, tap a <b>visible number</b> to propose, or <b>wait</b>.</li>
      <li>If the guest says yes, the couple takes the <b>highest free row</b> of the scoreboard on the left. If not, your proposal stays open — they may change their mind in a later beat.</li>
      <li>Crowd guests shout their numbers and approach people they like (the heart under a card shows whom they’re courting). Answer a proposal and the wedding is instant.</li>
      <li><b>Points</b> = row number ÷ the difference of the two cards. The lower card also gets <b>+5</b>. Example: 13 and 15 on row 80 → 80 ÷ 2 = 40, plus 5 for the 13.</li>
      <li>Anyone still single when time runs out scores 0. A round ends when both players are married or the time is up.</li>
    </ol>`,
  'lam.h.tips': 'Tricks',
  'lam.tips': `
    <ul>
      <li>You want three things at once, and they get in each other’s way: an <b>early wedding</b> (a high row), a <b>nearby number</b> (a small difference) and being the <b>smaller card</b> of the couple (+5).</li>
      <li>A difference of 1 keeps the whole row. A difference of 2 already halves it, and 5 is worth very little. That’s why it pays to hunt for a neighbour while there’s time.</li>
      <li>The crowd is picky at first but will take almost anyone near the end. A “no” now isn’t a “no” forever.</li>
      <li>When you ask a number, your opponent sees it too. Sometimes it’s better to wait for guests to shout their numbers themselves.</li>
      <li>You can marry your opponent: if your numbers are close it’s great for both of you — but only the lower card gets the +5.</li>
    </ul>
    <p class="tip"><b>The classroom version.</b> In real life this is a game for a big group, 15 people or more: everyone gets a card and has three minutes to find a partner and place both cards on the scoreboard. With more than twenty players the rows go down by 5 (100, 95, 90…) instead of by 10 — the 24-guest setting here does the same.</p>`,
  'lam.h.origin': 'Where it comes from',
  'lam.origin': `
    <p>Game designer James Ernest made it for a middle-school teacher who wanted a lively classroom game on the theme of love and marriage. The result is a loud game of quick thinking: everyone walks around, shouts numbers and bargains.</p>
    <p>The fun part: you can’t tell in advance whether your card is lucky. Card 1 is the lower one in any couple and always collects the +5 — which is exactly why its neighbours aren’t keen on it: they want that bonus for themselves. It all comes down to how the other guests behave. Here the computer plays the crowd, and you and your opponent compete to settle down best.</p>`,
});
