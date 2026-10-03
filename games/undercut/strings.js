import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'uc.title': 'Подрезка',
  'uc.tagline': 'игра на пальцах, где выигрывает тот, кто на один меньше',
  'uc.mode': 'Играем:',
  'uc.mode.pvp': 'вдвоём',
  'uc.mode.easy': 'с компьютером (простак)',
  'uc.mode.normal': 'с компьютером (кубик)',
  'uc.mode.hard': 'с компьютером (сыщик)',
  'uc.rules': 'Правила:',
  'uc.rules.classic': 'классика',
  'uc.rules.flaunt': '«Пижон» (степени)',
  'uc.target': 'Нужен перевес:',
  'uc.again': 'ещё раз!',
  'uc.p0': 'Синий',
  'uc.p1': 'Красный',
  'uc.cpu': 'Компьютер',
  'uc.pts': ['очко', 'очка', 'очков'],
  'uc.lead': 'перевес {n} из {t}',
  'uc.even': 'поровну, нужно {t}',
  'uc.round': 'раунд {n}',
  'uc.ready': 'готово ✓',
  'uc.cut': 'подрезка!',
  'uc.pick': '{name}, выберите число',
  'uc.pick.you': 'Выберите число от 1 до 5',
  'uc.pick.mine': 'Ваше число: {v}. Ждём соперника…',
  'uc.cover.title': 'Очередь: {name}',
  'uc.cover.note': 'Остальные — не подглядывать!',
  'uc.cover.btn': 'Это я — показать',
  'uc.cover.status': 'Передайте устройство: {name}',
  'uc.online.wait': 'Ждём второго игрока…',
  'uc.online.note': 'Идёт игра по сети: новую партию и правила выбирает создатель комнаты.',
  'uc.online.waitnew': 'Новую партию начнёт {name}',
  'uc.win': 'Побеждает {name}! {a}\u00a0:\u00a0{b}',
  'uc.say.cut': ['Подрезка!', 'Попался!', 'Угадано!', 'На один меньше!', 'Спасибо за очки!'],
  'uc.say.cutby': ['Ой!', 'Как?!', 'Подрезали…', 'Ну вот…', 'Предсказуемо, да?'],
  'uc.say.big': ['Неплохо!', 'Беру!', 'Хе-хе', 'Пять!'],
  'uc.say.same': ['Одинаково!', 'Мысли сходятся', 'Ха, и ты?'],
  'uc.say.close': ['Ещё чуть-чуть!', 'Почти!', 'Финиш близко'],
  'uc.say.worried': ['Так, спокойно…', 'Надо думать…', 'Хм…'],
  'uc.say.streak': ['Опять это число!', 'Ещё раз!', 'Не меняю!'],
  'uc.say.win': ['Ура!', 'Победа!', 'Читаю мысли!'],
  'uc.say.lose': ['Реванш?', 'В следующий раз…', 'Это был кубик'],
  'uc.h.how': 'Как играть',
  'uc.how': `
    <p><b>Что нужно:</b> двое и по одной руке у каждого. Здесь — по пять кнопок.</p>
    <p><b>Цель:</b> первым уйти в отрыв на <b>11 очков</b> (в настройках можно выбрать другой перевес).</p>
    <ol>
      <li>Каждый раунд оба <b>тайно</b> выбирают число от 1 до 5, а потом одновременно показывают пальцы.</li>
      <li>Обычно каждый получает столько очков, сколько пальцев показано.</li>
      <li><b>Подрезка:</b> если ваше число ровно <b>на 1 больше</b>, чем у соперника, ваши очки уходят ему. Он забирает оба числа: 4 против 3 — это +7 тому, у кого 3.</li>
      <li>Одинаковые числа — каждый просто получает своё.</li>
      <li>Играем раунд за раундом, пока чей-то перевес не станет 11 или больше. Полоска над руками показывает, кто сколько «перетягивает».</li>
    </ol>
    <p>Вдвоём на одном экране: перед каждым выбором появляется заслонка — передайте телефон и не подсматривайте.</p>`,
  'uc.h.tips': 'Хитрости',
  'uc.tips': `
    <ul>
      <li>Хотите больше очков? Берите числа <b>на 2–4 больше</b>, чем ждёте от соперника. А лучше всего — ровно <b>на 1 меньше</b>.</li>
      <li>Пятёрка соблазнительна, но её подрезает четвёрка, и соперник получает сразу 9. Единица кажется жалкой, но подрезает двойку.</li>
      <li>Самая надёжная защита — настоящая случайность. Есть «правильная» смесь: из 66 бросков примерно 10 раз единица, 26 — двойка, 13 — тройка, 16 — четвёрка и лишь 1 раз пятёрка. Против неё любая тактика в среднем выходит в ноль. Так играет компьютер-«кубик»: обыграть его нельзя, но и он вас не переиграет — дело везения.</li>
      <li>Люди плохо изображают случайность: повторяют любимые числа, боятся повторять одно и то же трижды, после проигрыша меняют тактику. «Сыщик» ищет такие привычки и бьёт по ним — попробуйте быть непредсказуемыми.</li>
    </ul>
    <p class="tip"><b>Пижон (вариант в настройках).</b> Если показать одно и то же число несколько раундов подряд, оно возводится в степень: вторая четвёрка подряд стоит 4 × 4 = 16, третья — 64. Но и подрезка такой серии отдаёт сопернику всю сумму. Играют до перевеса в 100 очков и больше.</p>
    <p class="tip"><b>Ещё варианты для компании.</b> Втроём и больше: каждый, кто на 1 меньше другого, забирает его очки (двое подрезавших делят добычу), играют до 30. А в «Недобор» называют любые целые числа: меньшее число приносит себе очки, но если числа отличаются ровно на 1, больший забирает их сумму.</p>`,
  'uc.h.origin': 'Откуда игра',
  'uc.origin': `
    <p>Игру придумали летом 1962 года студенты-математики Дуглас Хофштадтер и Роберт Бёнингер, скучавшие в долгой автобусной поездке по Европе. Сначала числа у игроков были разные — у одного от 1 до 5, у другого от 2 до 6, — но потом правила сделали симметричными.</p>
    <p>Той же осенью Хофштадтер написал программу, которая вычисляла закономерности в ходах соперника и подрезала его. Она была грозой всех — пока Джон Питерсон не выставил против неё программу, которая просто бросала «нечестный кубик» с выверенными по теории игр вероятностями. Ловить в ней было нечего, и поединок вечно заканчивался вничью. Позже Хофштадтер рассказал эту историю в журнале <i>Scientific American</i> и признавался, что проигрывать бездумному «кубику» было ужасно обидно.</p>
    <p>Мораль: случайный выбор нельзя перехитрить — но и он никого не перехитрит. Чтобы выиграть, приходится угадывать чужие привычки, рискуя выдать свои.</p>`,
});

addStrings('en', {
  'uc.title': 'Undercut',
  'uc.tagline': 'a finger game where coming in one lower pays best',
  'uc.mode': 'Play:',
  'uc.mode.pvp': 'two players',
  'uc.mode.easy': 'vs computer (naive)',
  'uc.mode.normal': 'vs computer (dice)',
  'uc.mode.hard': 'vs computer (sleuth)',
  'uc.rules': 'Rules:',
  'uc.rules.classic': 'classic',
  'uc.rules.flaunt': 'Flaunt (powers)',
  'uc.target': 'Lead to win:',
  'uc.again': 'again!',
  'uc.p0': 'Blue',
  'uc.p1': 'Red',
  'uc.cpu': 'Computer',
  'uc.pts': ['point', 'points'],
  'uc.lead': 'lead {n} of {t}',
  'uc.even': 'all square, need {t}',
  'uc.round': 'round {n}',
  'uc.ready': 'ready ✓',
  'uc.cut': 'undercut!',
  'uc.pick': '{name}, pick a number',
  'uc.pick.you': 'Pick a number from 1 to 5',
  'uc.pick.mine': 'You picked {v}. Waiting for your opponent…',
  'uc.cover.title': 'Next up: {name}',
  'uc.cover.note': 'Everyone else — no peeking!',
  'uc.cover.btn': 'It’s me — show',
  'uc.cover.status': 'Pass the device to {name}',
  'uc.online.wait': 'Waiting for the other player…',
  'uc.online.note': 'You’re playing online: the room creator starts new games and picks the rules.',
  'uc.online.waitnew': '{name} will start the next game',
  'uc.win': '{name} wins! {a}\u00a0:\u00a0{b}',
  'uc.say.cut': ['Undercut!', 'Gotcha!', 'Knew it!', 'One lower!', 'Thanks for the points!'],
  'uc.say.cutby': ['Ouch!', 'What?!', 'Undercut…', 'Oh no…', 'Too predictable?'],
  'uc.say.big': ['Not bad!', 'Mine!', 'Heh', 'Five!'],
  'uc.say.same': ['Same!', 'Great minds…', 'Ha, you too?'],
  'uc.say.close': ['Almost there!', 'So close!', 'Finish line!'],
  'uc.say.worried': ['Stay calm…', 'Think, think…', 'Hmm…'],
  'uc.say.streak': ['That number again!', 'Once more!', 'Not changing!'],
  'uc.say.win': ['Hooray!', 'Victory!', 'I read your mind!'],
  'uc.say.lose': ['Rematch?', 'Next time…', 'It was the dice'],
  'uc.h.how': 'How to play',
  'uc.how': `
    <p><b>You need:</b> two players with one hand each. Here, five buttons each.</p>
    <p><b>Goal:</b> be the first to pull ahead by <b>11 points</b> (another margin can be chosen in the settings).</p>
    <ol>
      <li>Each round both players <b>secretly</b> pick a number from 1 to 5, then reveal at the same time.</li>
      <li>Normally you score as many points as you showed.</li>
      <li><b>Undercut:</b> if your number is exactly <b>1 higher</b> than your opponent’s, your points go to them. They take both numbers: 4 against 3 gives +7 to whoever showed the 3.</li>
      <li>Equal numbers — each just scores their own.</li>
      <li>Keep playing rounds until someone leads by 11 or more. The rope above the hands shows who is pulling ahead.</li>
    </ol>
    <p>Two players on one screen: a cover appears before every pick — pass the phone over and don’t peek.</p>`,
  'uc.h.tips': 'Tricks',
  'uc.tips': `
    <ul>
      <li>Want points? Pick <b>2–4 higher</b> than what you expect from your opponent. Better still: exactly <b>1 lower</b>.</li>
      <li>A five is tempting, but a four undercuts it and hands over 9 at once. A one looks feeble, but it undercuts a two.</li>
      <li>The safest defence is true randomness. There is a “perfect” mix: out of 66 throws, about 10 ones, 26 twos, 13 threes, 16 fours and a single five. Against it every tactic breaks even on average. The “dice” computer plays exactly that: you can’t beat it, but it can’t outplay you either — it’s pure luck.</li>
      <li>People are bad at being random: we repeat favourite numbers, avoid the same choice three times running, switch after a loss. The “sleuth” hunts for such habits and punishes them — try to be unpredictable.</li>
    </ul>
    <p class="tip"><b>Flaunt (a variant in the settings).</b> Show the same number several rounds in a row and it grows as a power: a second four in a row is worth 4 × 4 = 16, a third one 64. But undercutting such a streak hands the whole amount to the opponent. Play to a lead of 100 points or more.</p>
    <p class="tip"><b>More variants for a crowd.</b> With three or more players, anyone exactly 1 lower than someone else takes that player’s points (two undercutters split the loot); first to 30 wins. In “Underwhelm” you may name any whole number: the lower number scores itself, but if the numbers differ by exactly 1, the higher one takes their sum.</p>`,
  'uc.h.origin': 'Where it comes from',
  'uc.origin': `
    <p>The game was invented in the summer of 1962 by math students Douglas Hofstadter and Robert Boeninger, killing time on a long bus ride across Europe. At first the two players had different ranges — one picked 1 to 5, the other 2 to 6 — but the rules were soon made symmetric.</p>
    <p>That autumn Hofstadter wrote a program that sniffed out patterns in its opponent’s moves and undercut them. It dominated — until Jon Peterson pitted against it a program that simply rolled a “loaded die” with probabilities tuned by game theory. There were no patterns to catch, and every match between the two ended in a stalemate. Hofstadter later told the story in <i>Scientific American</i> as one of his most exasperating defeats.</p>
    <p>The moral: you can’t outguess randomness — but randomness can’t outguess you either. To actually win, you have to read the other player’s habits and risk revealing your own.</p>`,
});
