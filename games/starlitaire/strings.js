import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'star.title': 'Звёздный пасьянс',
  'star.tagline': 'круг из точек, правило счёта — и звёзды рисуются сами',
  'star.dots': 'Точек на круге:',
  'star.rule': 'Правило:',
  'star.rule.skip0': 'соседние точки',
  'star.rule.skip': 'через {k}',
  'star.rule.mix': 'через {list} по очереди',
  'star.rule.free': 'своё правило (свободно)',
  'star.rule.freeS': 'свободно',
  'star.rule.mixS': 'через {list}…',
  'star.rule.cur0': 'соседняя точка',
  'star.hint': 'Подсказка:',
  'star.hint.always': 'всегда показывать',
  'star.hint.miss': 'после ошибки',
  'star.hint.never': 'не нужна',
  'star.guess': 'Угадывать заранее:',
  'star.guess.on': 'да',
  'star.guess.off': 'нет',
  'star.p0': 'Вы',
  'star.p1': 'Звездочёт',
  'star.lines': ['линия', 'линии', 'линий'],
  'star.figs': ['фигура', 'фигуры', 'фигур'],
  'star.corners': ['вершина', 'вершины', 'вершин'],
  'star.rulecard': '{n} · {rule}',
  'star.st.ask': 'Сколько выйдет отдельных фигур?',
  'star.st.start': 'Нажмите любую точку круга',
  'star.st.bet': 'Ставка: {g}. Нажмите любую точку',
  'star.st.next': 'Фигура {f}: {rule} — куда дальше?',
  'star.st.newfig': 'Фигура замкнулась! Начните новую с пустой точки',
  'star.st.free': 'Соединяйте любые точки как хочется',
  'star.st.freepen': 'Ещё точку — или нажмите ту же, чтобы поднять карандаш',
  'star.auto': '▶ дорисовать',
  'star.stop': '⏸ стоп',
  'star.skipguess': 'без ставки',
  'star.again': 'ещё раз',
  'star.random': 'наугад!',
  'star.done': 'Звезда готова!',
  'star.sum.one': 'Одна фигура, {c}',
  'star.sum.many': '{f} по {c}',
  'star.sum.mixed': '{f}: {list}',
  'star.why': 'Шаг {s}, НОД({n}, {s}) = {g}',
  'star.guess.right': 'Ставка сыграла: {g}!',
  'star.guess.wrong': 'Ставка была {g}, вышло {f}',
  'star.miss': 'ошибок: {m}',
  'star.say.ok': ['Так!', 'Верно', 'Раз, два — тут!', 'Красиво'],
  'star.say.close': ['Замкнулось!', 'Есть фигура!', 'Круг пройден'],
  'star.say.wrong': ['Посчитай ещё раз', 'Не туда', 'Мимо, считаем…', 'Хм, не та'],
  'star.say.oops': ['Ой', 'Ой-ой', 'Эх'],
  'star.say.done': ['Звезда!', 'Красота!', 'Ух ты!', 'Как по волшебству'],
  'star.say.right': ['В точку!', 'Угадано!', 'Ага!'],
  'star.say.wrongbet': ['Ну и ладно', 'Сюрприз!', 'Хм…'],
  'star.say.prime': ['{n} — простое!', 'Одним росчерком!'],
  'star.say.empty': ['Начни с пустой точки', 'Эта уже занята'],
  'star.online.none': 'Это пасьянс для одного — игры по сети нет.',
  'star.h.how': 'Как играть',
  'star.how': `
    <p>Это пасьянс для одного: здесь нельзя выиграть или проиграть, зато можно нарисовать очень красивую звезду.</p>
    <ol>
      <li>На круге расставлены точки. В настройках выберите, сколько их, и <b>правило</b> — например, «через 2»: каждый раз перепрыгиваем две точки и соединяем с третьей.</li>
      <li>Нажмите любую точку — это начало. Дальше считайте по часовой стрелке и нажимайте точку, куда ведёт правило. Ошиблись — Звездочёт подскажет.</li>
      <li>Когда линия вернётся в начало, фигура замкнулась. Если остались нетронутые точки, начните с любой из них новую фигуру — она будет другого цвета.</li>
      <li>Когда задеты все точки, звезда готова. С правилом «через k» можно заранее угадать, сколько получится отдельных фигур.</li>
    </ol>
    <p>Кнопка «дорисовать» закончит рисунок сама. В режиме «своё правило» соединяйте точки как угодно.</p>`,
  'star.h.tips': 'Секреты звёзд',
  'star.tips': `
    <ul>
      <li>«Через k» — значит шаг на <b>k + 1</b> позицию вперёд. Число отдельных фигур равно <b>наибольшему общему делителю</b> числа точек и длины шага. 12 точек, через 2 (шаг 3): НОД(12, 3) = 3 — три квадрата.</li>
      <li>Если число точек <b>простое</b> (5, 7, 11, 13…), любое правило «через k» рисует одну фигуру одним росчерком: делить нечего.</li>
      <li>Правила «через k» и «через n − k − 2» рисуют одну и ту же звезду, только в обратную сторону.</li>
      <li>Если шаг равен половине круга, «фигуры» получаются просто отрезками-диаметрами.</li>
    </ul>
    <p class="tip"><b>Попробуйте ещё:</b> смешанные правила (через 1, через 2, через 1…) — они есть в настройках. Там число фигур зависит уже и от того, с каких точек вы начинаете. А на бумаге можно рисовать разными цветами, расставлять точки не по кругу или неравномерно и придумывать совсем свои правила счёта.</p>`,
  'star.h.origin': 'Откуда игра',
  'star.origin': `
    <p>Звёздные многоугольники рисуют много веков: их разбирал английский учёный Томас Брадвардин ещё в XIV веке, а Иоганн Кеплер изучал их в книге о гармонии мира. Математики обозначают такую звезду {n/k}: n точек, соединяем каждую k-ю.</p>
    <p>Превратить это в спокойную игру-раскраску предложила математик и художница Ви Харт в одном из своих популярных видео о «математических каракулях на уроке». Правил почти нет, победителя нет — но счёт по кругу незаметно учит делителям и простым числам. Немецкий математик Леопольд Кронекер как-то сравнил специалистов по теории чисел с поедателями лотоса из «Одиссеи»: раз попробовав, остановиться уже невозможно.</p>`,
});

addStrings('en', {
  'star.title': 'Starlitaire',
  'star.tagline': 'a ring of dots, a counting rule, and stars that draw themselves',
  'star.dots': 'Dots on the ring:',
  'star.rule': 'Rule:',
  'star.rule.skip0': 'next-door dots',
  'star.rule.skip': 'skip {k}',
  'star.rule.mix': 'skip {list} in turn',
  'star.rule.free': 'your own rule (free)',
  'star.rule.freeS': 'free drawing',
  'star.rule.mixS': 'skip {list}…',
  'star.rule.cur0': 'next-door dot',
  'star.hint': 'Hint:',
  'star.hint.always': 'always show',
  'star.hint.miss': 'after a slip',
  'star.hint.never': 'no hints',
  'star.guess': 'Guess first:',
  'star.guess.on': 'yes',
  'star.guess.off': 'no',
  'star.p0': 'You',
  'star.p1': 'Stargazer',
  'star.lines': ['line', 'lines'],
  'star.figs': ['shape', 'shapes'],
  'star.corners': ['point', 'points'],
  'star.rulecard': '{n} · {rule}',
  'star.st.ask': 'How many separate shapes will appear?',
  'star.st.start': 'Tap any dot on the ring',
  'star.st.bet': 'Your guess: {g}. Tap any dot',
  'star.st.next': 'Shape {f}: {rule} — where next?',
  'star.st.newfig': 'Shape closed! Start a new one on an empty dot',
  'star.st.free': 'Join any dots you like',
  'star.st.freepen': 'Another dot — or tap the same one to lift the pen',
  'star.auto': '▶ finish it',
  'star.stop': '⏸ stop',
  'star.skipguess': 'no guess',
  'star.again': 'again',
  'star.random': 'surprise me!',
  'star.done': 'Star complete!',
  'star.sum.one': 'One shape, {c}',
  'star.sum.many': '{f} of {c}',
  'star.sum.mixed': '{f}: {list}',
  'star.why': 'Step {s}, gcd({n}, {s}) = {g}',
  'star.guess.right': 'Good guess: {g}!',
  'star.guess.wrong': 'You guessed {g}, got {f}',
  'star.miss': 'slips: {m}',
  'star.say.ok': ['Yes!', 'Right', 'One, two — here!', 'Pretty'],
  'star.say.close': ['Closed!', 'A shape!', 'Full circle'],
  'star.say.wrong': ['Count again', 'Not that one', 'Missed, let’s count…', 'Hmm, nope'],
  'star.say.oops': ['Oops', 'Lost count', 'Argh'],
  'star.say.done': ['A star!', 'Gorgeous!', 'Wow!', 'Like magic'],
  'star.say.right': ['Spot on!', 'Knew it', 'Aha!'],
  'star.say.wrongbet': ['Oh well', 'Surprise!', 'Hmm…'],
  'star.say.prime': ['{n} is prime!', 'One stroke!'],
  'star.say.empty': ['Start on an empty dot', 'That one’s taken'],
  'star.online.none': 'This is a one-person pastime — no online play.',
  'star.h.how': 'How to play',
  'star.how': `
    <p>A pastime for one: there’s no winning or losing here, just a very pretty star to draw.</p>
    <ol>
      <li>Dots sit on a ring. In the settings pick how many, and a <b>rule</b> — say “skip 2”: hop over two dots each time and join the third.</li>
      <li>Tap any dot to begin. Then count clockwise and tap the dot the rule sends you to. Slip up and the Stargazer will help.</li>
      <li>When the line returns to its start, the shape is closed. If some dots are still untouched, start a new shape from any of them — it gets a new colour.</li>
      <li>Once every dot is used, the star is done. With a “skip k” rule you can guess beforehand how many separate shapes it will have.</li>
    </ol>
    <p>The “finish it” button completes the drawing for you. With “your own rule”, join dots however you like.</p>`,
  'star.h.tips': 'Star secrets',
  'star.tips': `
    <ul>
      <li>“Skip k” means a step of <b>k + 1</b> dots. The number of separate shapes is the <b>greatest common divisor</b> of the dot count and the step. 12 dots, skip 2 (step 3): gcd(12, 3) = 3 — three squares.</li>
      <li>With a <b>prime</b> number of dots (5, 7, 11, 13…), every “skip k” rule draws a single shape in one stroke: nothing divides.</li>
      <li>“Skip k” and “skip n − k − 2” draw the same star, just in opposite directions.</li>
      <li>If the step is half the ring, the “shapes” are just diameters.</li>
    </ul>
    <p class="tip"><b>More to try:</b> mixed rules (skip 1, skip 2, skip 1…) are in the settings. With those, the number of shapes also depends on which dots you start from. On paper you can also use several colours, space the dots unevenly or off a circle, and invent counting rules of your own.</p>`,
  'star.h.origin': 'Where it comes from',
  'star.origin': `
    <p>People have drawn star polygons for centuries: the English scholar Thomas Bradwardine studied them in the 14th century, and Johannes Kepler explored them in his book on the harmony of the world. Mathematicians write such a star as {n/k}: n dots, join every k-th one.</p>
    <p>Turning it into a calm drawing game was the idea of mathematician and artist Vi Hart, in one of her popular videos about doodling in math class. There are hardly any rules and no winner — yet counting around the ring quietly teaches divisors and primes. The German mathematician Leopold Kronecker once likened number theorists to the lotus-eaters of the Odyssey: one taste and you can never stop.</p>`,
});
