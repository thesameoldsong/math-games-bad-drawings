import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'arp.title': 'Арпеджио',
  'arp.tagline': 'кости, два списка и одно право на разворот',
  'arp.mode': 'Играем:',
  'arp.mode.pvp': 'вдвоём',
  'arp.mode.easy': 'с компьютером (простой)',
  'arp.mode.normal': 'с компьютером (расчётливый)',
  'arp.asc': 'Вверх идёт:',
  'arp.asc.roll': 'как выпадет',
  'arp.asc.p0': 'синий',
  'arp.asc.p1': 'красный',
  'arp.again': 'ещё раз!',
  'arp.p0': 'Синий',
  'arp.p1': 'Красный',
  'arp.cpu': 'Компьютер',
  'arp.up': '↑ вверх',
  'arp.down': '↓ вниз',
  'arp.reset': 'разворот',
  'arp.roll': 'Бросить',
  'arp.pass': 'Пас',
  'arp.reroll': 'Перебросить',
  'arp.decline': 'Свой бросок',
  'arp.turn': '{name}: бросайте кости',
  'arp.decide': '{name}: берите число или пас',
  'arp.decide.none': '{name}: числа не подходят — пас',
  'arp.steal': '{name}: забрать кости?',
  'arp.steal.none': '{name}: не подходят — бросайте сами',
  'arp.thinking': '{name} думает…',
  'arp.you.roll': 'Ваш бросок',
  'arp.you.decide': 'Берите число или пас',
  'arp.you.steal': 'Вам пасовали: забрать?',
  'arp.them': 'Ходит {name}…',
  'arp.online.wait': 'Ждём второго игрока…',
  'arp.online.note': 'Идёт игра по сети: новую партию начинает и правила выбирает создатель комнаты.',
  'arp.online.waitnew': 'Новую партию начнёт {name}',
  'arp.win': 'Побеждает {name}! {a} : {b}',
  'arp.tie': 'Ничья! {a} : {b}',
  'arp.stuckend': 'Обоим больше некуда писать',
  'arp.count': '{n} из 10',
  'arp.stuck': 'тупик',
  'arp.say.up': ['Я иду вверх!', 'Мне вверх', 'Вверх так вверх'],
  'arp.say.down': ['А я вниз', 'Мне вниз', 'Вниз — тоже путь'],
  'arp.say.good': ['Идеально!', 'То что надо', 'Шаг в шаг', 'Красота'],
  'arp.say.ok': ['Пойдёт', 'Записываю', 'Беру'],
  'arp.say.risky': ['Рискну…', 'Далековато…', 'Ох, прыжок', 'Ладно, беру'],
  'arp.say.reset': ['Разворот!', 'Начну сначала', 'Жму на сброс'],
  'arp.say.pass': ['Пас', 'Не моё', 'Мимо', 'Не надо'],
  'arp.say.steal': ['Спасибо, возьму!', 'Моё!', 'Чужие кости — мои кости', 'Дают — бери'],
  'arp.say.robbed': ['Эй!', 'Ну вот…', 'Я ж не тебе'],
  'arp.say.decline': ['Нет, брошу свои', 'Обойдусь', 'Не надо'],
  'arp.say.double': ['Дубль!', 'Одинаковые!', 'О, пара'],
  'arp.say.close': ['Ещё чуть-чуть!', 'Финиш близко', 'Последний!'],
  'arp.say.worry': ['Ой-ой', 'Быстро идёт…', 'Не успеваю'],
  'arp.say.stuck': ['Тупик…', 'Мне больше некуда', 'Дальше хода нет'],
  'arp.say.win': ['Ура!', 'Десятка!', 'Финиш!'],
  'arp.say.lose': ['Реванш?', 'Кости против меня', 'В другой раз'],
  'arp.h.how': 'Как играть',
  'arp.how': `
    <p><b>Что нужно:</b> двое, пара обычных кубиков и листок. Здесь кубики бросаем нажатием кнопки.</p>
    <p><b>Цель:</b> первым записать в свой столбик <b>10 чисел</b>. У одного игрока числа должны <b>расти</b>, у другого — <b>убывать</b> (стрелка над столбиком).</p>
    <ol>
      <li>Каждый кубик — это цифра. Из двух кубиков можно собрать двузначное число в любом порядке: выпали 2 и 6 — выбирайте 26 или 62.</li>
      <li>Бросив кости, либо запишите одно из двух чисел следующим в свой столбик, либо скажите <b>«Пас»</b>.</li>
      <li>После паса соперник решает: <b>забрать кости</b> (записать число себе — это и есть его ход, затем снова бросаете вы) или <b>отказаться</b> и бросить свои.</li>
      <li>Выпал <b>дубль</b>? Один кубик можно перебросить — но только один раз за ход.</li>
      <li>Раз за игру можно <b>развернуться</b>: один шаг против своей стрелки. Объявлять заранее не нужно — кнопка сама подскажет «разворот».</li>
      <li>Повторять число подряд нельзя. Побеждает тот, кто первым запишет десятое число.</li>
    </ol>
    <p class="tip">Если обоим игрокам больше нечего записать (дошли до края и разворот потрачен), побеждает тот, у кого чисел больше.</p>`,
  'arp.h.tips': 'Хитрости',
  'arp.tips': `
    <ul>
      <li>Думайте о <b>взлётной полосе</b>: выпишите все 36 возможных чисел по порядку, а потом ещё раз. Каждое записанное число — шаг вперёд по этой полосе. Хорошее число отнимает мало полосы, плохое — съедает много.</li>
      <li>Разворот — вовсе не особая кнопка. Это просто переход с первого круга полосы на второй: прыжок с 54 на 13 съедает ровно столько же, сколько обычный шаг с 24 на 43.</li>
      <li>Пасуя, вы дарите кости сопернику. Иногда лучше записать неудобное число, чем отдать сопернику подарок.</li>
      <li>Сколько полосы можно потратить за раз, зависит от того, сколько осталось у вас и у соперника. Отстаёте — рискуйте смелее.</li>
    </ul>
    <p class="tip"><b>Варианты.</b> Можно играть вшестером: по кругу чередуйте «вверх» и «вниз», а пасованные кости уходят соседу. Есть и пасьянс: десять пустых строк, каждое выпавшее число обязательно вписать в любую свободную строку так, чтобы весь столбик рос, — не нашлось места, и вы проиграли. А в «Восходящих» все пишут каждый общий бросок в свой список из 15 строк, и побеждает самая длинная непрерывно растущая цепочка.</p>`,
  'arp.h.origin': 'Откуда игра',
  'arp.origin': `
    <p>Основу придумал бельгийский изобретатель игр Вальтер Йорис — простенькую игру с одним кубиком. Бен Орлин добавил второй кубик, соперничество «вверх против вниз», кражу пасованных костей и музыкальное название: арпеджио — это аккорд, сыгранный по одной ноте, вверх или вниз.</p>
    <p>В книге игра служит поводом поговорить о том, как <b>формулировка</b> меняет наше отношение к риску: одну и ту же задачу можно описать так, что выбор кажется очевидным, а можно — так, что он кажется безрассудным. «Взлётная полоса» из подсказок — пример удачной формулировки, превращающей пугающий обрыв в плавный склон.</p>`,
});

addStrings('en', {
  'arp.title': 'Arpeggios',
  'arp.tagline': 'two dice, two lists and one chance to turn around',
  'arp.mode': 'Play:',
  'arp.mode.pvp': 'two players',
  'arp.mode.easy': 'vs computer (easy)',
  'arp.mode.normal': 'vs computer (shrewd)',
  'arp.asc': 'Going up:',
  'arp.asc.roll': 'let dice decide',
  'arp.asc.p0': 'blue',
  'arp.asc.p1': 'red',
  'arp.again': 'again!',
  'arp.p0': 'Blue',
  'arp.p1': 'Red',
  'arp.cpu': 'Computer',
  'arp.up': '↑ up',
  'arp.down': '↓ down',
  'arp.reset': 'reset',
  'arp.roll': 'Roll',
  'arp.pass': 'Pass',
  'arp.reroll': 'Reroll one',
  'arp.decline': 'Roll my own',
  'arp.turn': '{name}: roll the dice',
  'arp.decide': '{name}: take a number or pass',
  'arp.decide.none': '{name}: nothing fits — pass',
  'arp.steal': '{name}: steal the dice?',
  'arp.steal.none': '{name}: no use — roll your own',
  'arp.thinking': '{name} is thinking…',
  'arp.you.roll': 'Your roll',
  'arp.you.decide': 'Take a number or pass',
  'arp.you.steal': 'Dice passed to you: steal?',
  'arp.them': '{name} is moving…',
  'arp.online.wait': 'Waiting for the other player…',
  'arp.online.note': 'You’re playing online: the room creator starts new games and picks the rules.',
  'arp.online.waitnew': '{name} will start the next game',
  'arp.win': '{name} wins! {a} : {b}',
  'arp.tie': 'A tie! {a} : {b}',
  'arp.stuckend': 'Neither player can write anything else',
  'arp.count': '{n} of 10',
  'arp.stuck': 'stuck',
  'arp.say.up': ['I’m going up!', 'Up for me', 'Upward!'],
  'arp.say.down': ['I’ll go down', 'Down for me', 'Downhill it is'],
  'arp.say.good': ['Perfect!', 'Just right', 'Tiny step', 'Lovely'],
  'arp.say.ok': ['That’ll do', 'Writing it down', 'I’ll take it'],
  'arp.say.risky': ['Risky…', 'Big jump…', 'Oof, far', 'Fine, I’ll take it'],
  'arp.say.reset': ['Reset!', 'Turning around', 'Back to the start'],
  'arp.say.pass': ['Pass', 'Not for me', 'Nope', 'No thanks'],
  'arp.say.steal': ['Don’t mind if I do!', 'Mine!', 'Thanks!', 'Yoink'],
  'arp.say.robbed': ['Hey!', 'Oh well…', 'That wasn’t for you'],
  'arp.say.decline': ['I’ll roll my own', 'Pass on that', 'No, thanks'],
  'arp.say.double': ['Doubles!', 'A pair!', 'Ooh, twins'],
  'arp.say.close': ['Almost there!', 'One more!', 'So close'],
  'arp.say.worry': ['Uh-oh', 'They’re fast…', 'Hurry up, me'],
  'arp.say.stuck': ['Stuck…', 'Nowhere to go', 'Dead end'],
  'arp.say.win': ['Hooray!', 'Ten!', 'Finished!'],
  'arp.say.lose': ['Rematch?', 'The dice hate me', 'Next time'],
  'arp.h.how': 'How to play',
  'arp.how': `
    <p><b>You need:</b> two players, a pair of ordinary dice and some paper. Here the dice roll at the press of a button.</p>
    <p><b>Goal:</b> be the first to write <b>10 numbers</b> in your column. One player’s numbers must <b>go up</b>, the other’s must <b>go down</b> (see the arrow over each column).</p>
    <ol>
      <li>Each die is a digit. The two dice form a two-digit number in either order: roll 2 and 6 and you may use 26 or 62.</li>
      <li>After rolling, either write one of the two numbers as the next entry in your column, or say <b>“Pass”</b>.</li>
      <li>When you pass, your opponent decides: <b>steal the dice</b> (write a number in their own column — that’s their turn, and you roll next) or <b>turn them down</b> and roll their own.</li>
      <li>Rolled <b>doubles</b>? You may reroll one die — once per turn.</li>
      <li>Once per game you may <b>reset</b>: a single step against your arrow. No need to announce it — the button will say “reset”.</li>
      <li>No number may follow itself. The first player to write a tenth number wins.</li>
    </ol>
    <p class="tip">If neither player can ever write again (both hit the end with their reset spent), the longer column wins.</p>`,
  'arp.h.tips': 'Tricks',
  'arp.tips': `
    <ul>
      <li>Think of a <b>runway</b>: write all 36 possible numbers in order, then write them again. Each number you take moves you down that runway. A good number uses little of it; a bad one eats a lot.</li>
      <li>The reset isn’t a special button at all — it’s just crossing from the first lap of the runway to the second. Jumping from 54 to 13 costs exactly as much as an ordinary step from 24 to 43.</li>
      <li>Passing hands the dice to your opponent. Sometimes an awkward number is better than a gift to them.</li>
      <li>How much runway to spend depends on how much you and your opponent have left. Behind? Take bigger risks.</li>
    </ul>
    <p class="tip"><b>Variants.</b> Up to six can play: alternate “up” and “down” around the table, and passed dice go to the next player. There’s a solitaire too: ten blank lines, and every roll must be written on some empty line so the whole column still rises — no room means you lose. In “Ascenders”, everyone writes each shared roll somewhere on a personal 15-line list, and the longest unbroken rising run wins.</p>`,
  'arp.h.origin': 'Where it comes from',
  'arp.origin': `
    <p>The seed is a tiny one-die game by the Belgian inventor Walter Joris. Ben Orlin added a second die, the up-versus-down rivalry, stealing passed dice and the musical name: an arpeggio is a chord played one note at a time, rising or falling.</p>
    <p>In the book the game opens a conversation about <b>framing</b>: the same risky choice can be described so that it feels obvious or so that it feels reckless. The “runway” from the tips is a good framing in action — it turns a scary cliff into a gentle slope.</p>`,
});
