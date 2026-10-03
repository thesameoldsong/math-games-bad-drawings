import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'tc.title': 'Сборщик налогов',
  'tc.tagline': 'головоломка о делителях, где за каждое число приходится платить',
  'tc.ceiling': 'Числа до:',
  'tc.record': 'Лучший возможный счёт для чисел до {n}: {best} из {total}.',
  'tc.again': 'ещё раз!',
  'tc.hint': 'подсказка',
  'tc.p0': 'Вы',
  'tc.p1': 'Сборщик',
  'tc.pts': ['очко', 'очка', 'очков'],
  'tc.pick': 'Выберите число',
  'tc.preview': '{x}: вам +{x}, сборщику +{tax}',
  'tc.confirm': 'нажмите ещё раз, чтобы взять',
  'tc.nodiv': 'У {x} не осталось делителей — так нельзя',
  'tc.hinted': 'Подсказка: попробуйте {x}',
  'tc.win': 'Победа!',
  'tc.lose': 'Побеждает сборщик!',
  'tc.tie': 'Ничья!',
  'tc.one': 'Единицу взять нельзя: у неё нет делителей',
  'tc.perfect': 'Это лучший возможный результат — идеально!',
  'tc.short': 'Рекорд для чисел до {n} — {best}. Не хватило {d}.',
  'say.good': ['Отлично!', 'Неплохо!', 'Моё!', 'Так-то!'],
  'say.cheap': ['Всего {t}? Беру!', 'Дёшево!'],
  'say.grr': ['Хм…', 'Маловато', 'Скупо', 'Ну-ну'],
  'say.thanks': ['Спасибо!', 'Благодарю!', 'Щедро!', 'В казну!'],
  'say.orphan': ['И {list} — потом моё!', '{list} теперь мне!'],
  'say.oops': ['Ой…', 'Эх', 'Упс'],
  'say.sweep': ['Остальное — в казну!', 'Всё остальное моё!'],
  'say.win': ['Ура!', 'Налог уплачен!', 'Я гений'],
  'say.lose': ['Реванш?', 'В следующий раз…', 'Ну и ладно'],
  'say.taxwin': ['Казна довольна!', 'Хе-хе', 'Платите налоги!'],
  'say.taxlose': ['Безобразие!', 'Я подам жалобу!', 'Хмф'],
  'say.nodiv': ['Мне же ничего не достанется!', 'А мне что?', 'Так не пойдёт!'],
  'tc.h.how': 'Как играть',
  'tc.how': `
    <p><b>Что нужно:</b> вы, лист бумаги и числа от 1 до какого-нибудь предела — например, до 12. Это головоломка для одного: против вас играет безжалостный и предсказуемый Сборщик налогов.</p>
    <p><b>Цель:</b> набрать больше очков, чем Сборщик.</p>
    <ol>
      <li>Каждый ход вы берёте одно число — оно идёт в ваш счёт (синий кружок).</li>
      <li>Сборщик тут же забирает <b>все ещё лежащие делители</b> этого числа (красные рамки). Взяли 12, а на столе остались 2, 3 и 6? Сборщик получит 11.</li>
      <li>Сборщик <b>обязан что-то получить</b>: брать можно только число, у которого остался хотя бы один делитель. Такие числа нарисованы тёмным, остальные — бледным.</li>
      <li>Когда брать больше нечего, всё, что осталось на столе, уходит Сборщику. Сравниваем суммы.</li>
    </ol>
    <p>Нажмите на число, чтобы увидеть, что достанется Сборщику, и ещё раз — чтобы взять его. Мышью достаточно навести и щёлкнуть.</p>`,
  'tc.h.tips': 'Хитрости',
  'tc.tips': `
    <ul>
      <li><b>Первый ход почти очевиден:</b> самое большое простое число. Его единственный делитель — единица, так что налог всего 1.</li>
      <li>После этого единицы нет, и <b>простые числа больше половины предела</b> не взять уже никогда — они достанутся Сборщику. С этим придётся смириться.</li>
      <li>Ищите числа, у которых остался <b>ровно один</b> делитель: налог за них минимальный.</li>
      <li>«Жадный» ход (больше всего очков прямо сейчас) — хорошее начало, но не всегда лучший. <b>Порядок важен.</b> Например, при пределе 12: если взять 12, пока на столе лежат 2 и 4, то 8 лишится последних делителей и тоже уйдёт Сборщику. Возьмите сначала 8 — а 12 потом.</li>
      <li>Перед каждым ходом спросите себя: какое число я делаю «сиротой»? Забирая делитель, вы, возможно, отдаёте Сборщику и его кратные.</li>
    </ul>
    <p class="tip"><b>Без компьютера:</b> вместо листка подойдут игральные карты — туз как 1, валет как 11, дама как 12. Чем больше предел, тем труднее найти идеальную игру; после партии вы увидите рекорд для своего предела. А кнопка «подсказка» предложит сильный ход.</p>`,
  'tc.h.origin': 'Откуда игра',
  'tc.origin': `
    <p>Эта головоломка лет пятьдесят кочует по учебникам программирования: правила умещаются в две строчки, игру легко написать новичку — а вот найти лучшую стратегию трудно даже компьютеру. Поэтому её до сих пор любят давать студентам как первую задачу на перебор.</p>
    <p>Самые большие возможные счета для каждого предела найдены перебором и собраны в отдельную последовательность в Онлайн-энциклопедии целочисленных последовательностей (OEIS). Простой формулы для них никто не знает.</p>
    <p>Говорят, играть лучше всего под песню The Beatles «Taxman».</p>`,
});

addStrings('en', {
  'tc.title': 'Tax Collector',
  'tc.tagline': 'a divisor puzzle where every number comes with a bill',
  'tc.ceiling': 'Numbers up to:',
  'tc.record': 'Best possible score for numbers up to {n}: {best} of {total}.',
  'tc.again': 'again!',
  'tc.hint': 'hint',
  'tc.p0': 'You',
  'tc.p1': 'Taxman',
  'tc.pts': ['point', 'points'],
  'tc.pick': 'Pick a number',
  'tc.preview': '{x}: you +{x}, taxman +{tax}',
  'tc.confirm': 'tap again to take it',
  'tc.nodiv': '{x} has no divisors left — not allowed',
  'tc.hinted': 'Hint: try {x}',
  'tc.win': 'You win!',
  'tc.lose': 'The taxman wins!',
  'tc.tie': 'A tie!',
  'tc.one': 'You can’t take 1: it has no divisors',
  'tc.perfect': 'That’s the best possible score — perfect!',
  'tc.short': 'The record for numbers up to {n} is {best}. You were {d} short.',
  'say.good': ['Nice!', 'Not bad!', 'Mine!', 'There!'],
  'say.cheap': ['Only {t}? Deal!', 'Cheap!'],
  'say.grr': ['Hmm…', 'Stingy', 'Meagre', 'Hmph'],
  'say.thanks': ['Thank you!', 'Generous!', 'Into the vault!', 'Much obliged!'],
  'say.orphan': ['And {list} — mine later!', '{list} is mine now!'],
  'say.oops': ['Oops…', 'Uh-oh', 'Hmm'],
  'say.sweep': ['The rest goes to the treasury!', 'All the rest is mine!'],
  'say.win': ['Hooray!', 'Taxes paid!', 'I’m a genius'],
  'say.lose': ['Rematch?', 'Next time…', 'Whatever'],
  'say.taxwin': ['The treasury thanks you!', 'Heh heh', 'Pay your taxes!'],
  'say.taxlose': ['Outrageous!', 'I’ll file a complaint!', 'Hmph'],
  'say.nodiv': ['But I’d get nothing!', 'What about me?', 'Not allowed!'],
  'tc.h.how': 'How to play',
  'tc.how': `
    <p><b>You need:</b> yourself, some paper and the numbers from 1 up to a ceiling — say 12. It’s a solo puzzle: your opponent is the ruthless, entirely predictable Tax Collector.</p>
    <p><b>Goal:</b> end with a bigger total than the Tax Collector.</p>
    <ol>
      <li>Each turn you take one number and add it to your score (blue circle).</li>
      <li>The Tax Collector immediately takes <b>every divisor of it still on the table</b> (red boxes). Take 12 while 2, 3 and 6 remain? The taxman gets 11.</li>
      <li>The taxman <b>must get something</b>: you may only take a number that still has at least one divisor on the table. Those numbers are drawn dark; the others are faded.</li>
      <li>When nothing can be taken, everything left on the table goes to the Tax Collector. Compare totals.</li>
    </ol>
    <p>Tap a number to see what the taxman would get, then tap it again to take it. With a mouse, just hover and click.</p>`,
  'tc.h.tips': 'Tricks',
  'tc.tips': `
    <ul>
      <li><b>The first move is nearly obvious:</b> the largest prime. Its only divisor is 1, so the tax is just 1.</li>
      <li>After that the 1 is gone, so <b>primes above half the ceiling</b> can never be taken — they are the taxman’s. Accept it.</li>
      <li>Look for numbers with <b>exactly one</b> divisor left: they cost the least.</li>
      <li>The greedy move (most points right now) is a fine start but not always the best. <b>Order matters.</b> With a ceiling of 12, say: take 12 while 2 and 4 are still around and 8 loses its last divisors — another gift to the taxman. Take 8 first, then 12.</li>
      <li>Before every move ask: which number am I orphaning? Handing over a divisor may hand over its multiples too.</li>
    </ul>
    <p class="tip"><b>Away from the screen:</b> a deck of cards works instead of paper — ace for 1, jack for 11, queen for 12. The higher the ceiling, the harder perfect play gets; after each game you’ll see the record for your ceiling. The “hint” button suggests a strong move.</p>`,
  'tc.h.origin': 'Where it comes from',
  'tc.origin': `
    <p>This puzzle has been passed around programming textbooks for about fifty years: the rules fit in two lines, a beginner can code it in an afternoon — yet finding the best strategy is hard even for a computer. That is why teachers still hand it to students as a first exercise in search.</p>
    <p>The best possible scores for each ceiling were found by exhaustive search and form their own entry in the On-Line Encyclopedia of Integer Sequences (OEIS). Nobody knows a simple formula for them.</p>
    <p>It is said to be best played to the Beatles’ song “Taxman”.</p>`,
});
