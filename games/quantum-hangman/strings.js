import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'qh.title': 'Квантовая виселица',
  'qh.tagline': 'виселица, в которой загадано сразу два слова',
  'qh.p0': 'Синий',
  'qh.p1': 'Красный',
  'qh.cpu': 'Компьютер',
  'qh.role.set': 'загадывает',
  'qh.role.guess': 'отгадывает',
  'qh.wins': ['победа', 'победы', 'побед'],
  'qh.again': 'следующий раунд',
  'qh.mode': 'Играем:',
  'qh.mode.pvp': 'вдвоём',
  'qh.mode.easy': 'с компьютером (простой)',
  'qh.mode.normal': 'с компьютером (обычный)',
  'qh.mode.hard': 'с компьютером (хитрый)',
  'qh.you': 'Я:',
  'qh.you.alt': 'по очереди',
  'qh.you.guess': 'всегда отгадываю',
  'qh.you.set': 'всегда загадываю',
  'qh.nwords': 'Слов:',
  'qh.nwords.2': 'два (как в книге)',
  'qh.nwords.3': 'три (сложнее)',
  'qh.len': 'Длина слов:',
  'qh.len.note': 'Длина — для слов компьютера и кнопки «случайные»; свои слова можно загадать любой длины от 3 до 10 букв.',
  'qh.online.note': 'Идёт игра по сети: новый раунд и настройки — за создателем комнаты.',
  'qh.online.wait': 'Ждём второго игрока…',
  'qh.online.waitnew': 'Следующий раунд начнёт {name}',

  'qh.wrongbox': 'ошибки',
  'qh.yourwords': 'загадано:',
  'qh.setup.title': '{name}, загадайте {n}',
  'qh.setup.n2': 'два слова',
  'qh.setup.n3': 'три слова',
  'qh.setup.ph': 'слово {i}',
  'qh.setup.note': 'Слова одной длины, 3–10 букв, все на одном языке.',
  'qh.setup.peek': '{name}, не подглядывайте!',
  'qh.setup.rand': 'случайные',
  'qh.setup.ok': 'загадано!',
  'qh.err.empty': 'Впишите все слова.',
  'qh.err.chars': 'Только буквы, без пробелов и цифр.',
  'qh.err.mixed': 'Все слова — на одном алфавите.',
  'qh.err.short': 'Слишком коротко: нужно хотя бы 3 буквы.',
  'qh.err.long': 'Слишком длинно: не больше 10 букв.',
  'qh.err.len': 'Слова должны быть одной длины.',
  'qh.err.same': 'Слова должны быть разными.',
  'qh.cover.setter': 'Передайте устройство: слова загадывает {name}',
  'qh.cover.setter.btn': 'это я, загадываю',
  'qh.cover.guesser': 'Слова загаданы! Передайте устройство: отгадывает {name}',
  'qh.cover.guesser.btn': 'начать отгадывать',
  'qh.wait.setup': '{name} загадывает слова…',

  'qh.st.setup': '{name} загадывает слова',
  'qh.st.cover': 'Передайте устройство',
  'qh.st.turn': '{name}: назовите букву',
  'qh.st.you': 'Ваш ход: назовите букву',
  'qh.st.them': '{name} отгадывает…',
  'qh.st.think': '{name} думает…',
  'qh.st.conflict': 'Две буквы в клетке — какую оставить?',
  'qh.st.conflict.them': '{name} выбирает, какую букву оставить…',
  'qh.st.watch': 'Ваши слова отгадывает {name}',

  'qh.res.won': 'Слово отгадано!',
  'qh.res.lost': 'Человечек повешен!',
  'qh.res.winner': 'Побеждает {name}',
  'qh.res.words': 'Были загаданы:',

  'qh.say.hit': ['Есть!', 'Есть буква!', 'Ага!', 'В точку!'],
  'qh.say.multi': ['Целых {k}!', 'Сразу {k}!', 'Ого, сразу несколько!'],
  'qh.say.miss': ['Мимо', 'Эх…', 'Не то', 'Хм'],
  'qh.say.setter.miss': ['Мимо!', 'Не угадано!', 'Хе-хе', 'Такой нет'],
  'qh.say.setter.hit': ['Ой', 'Эх, есть такая', 'Угу…'],
  'qh.say.conflict': ['Две буквы?!', 'Конфликт!', 'Какую же оставить…'],
  'qh.say.collapse.ok': ['Схлопнулось!', 'Выбрано!', 'Повезло!'],
  'qh.say.collapse.bad': ['Минус {k}!', 'Ой, ошибок +{k}', 'Ну и квантовость…'],
  'qh.say.setter.collapse': ['Хе-хе, не то слово', 'Мимо волны!', 'Квантовый сюрприз!'],
  'qh.say.set': ['Загадано!', 'Готово, гадай', 'Попробуй угадай'],
  'qh.say.win': ['Ура!', 'Отгадано!', 'Я гений'],
  'qh.say.setwin': ['Повешен!', 'Не отгадано!', 'Ха!'],
  'qh.say.lose': ['Реванш?', 'В следующий раз…', 'Ну и ладно'],

  'qh.h.how': 'Как играть',
  'qh.how': `
    <p><b>Что нужно:</b> двое — один загадывает, другой отгадывает. Потом меняются ролями.</p>
    <p><b>Цель отгадчика:</b> открыть слово целиком раньше, чем наберётся <b>8 ошибок</b> (тогда человечек повешен и выигрывает загадавший).</p>
    <ol>
      <li>Загадывающий тайком выбирает <b>два слова одинаковой длины</b>. На доске видны только пустые клетки — одни на оба слова.</li>
      <li>Отгадчик называет букву. Если её нет <b>ни в одном</b> слове — это ошибка. Если она есть хоть в одном — она встаёт во все свои клетки, из какого бы слова ни пришла.</li>
      <li>Рано или поздно в одну клетку попадут <b>две разные буквы</b>. Тогда отгадчик нажимает ту, которую оставить. Слово со второй буквой выбывает, и <b>все его буквы исчезают</b> с доски.</li>
      <li>Буквы, которые подходили только к выбывшему слову, задним числом становятся <b>ошибками</b> — это может стоить нескольких шагов к виселице сразу.</li>
      <li>Дальше — обычная виселица с одним словом. Открыто слово целиком — победа отгадчика.</li>
    </ol>
    <p>Открыть одно из слов полностью ещё до конфликта — тоже победа отгадчика.</p>`,
  'qh.h.tips': 'Хитрости',
  'qh.tips': `
    <ul>
      <li><b>Отгадчику:</b> пока слов два, частые буквы попадают почти всегда — но часть «попаданий» может потом обернуться ошибками. Не спешите радоваться.</li>
      <li>Когда приходится выбирать букву, прикиньте, какие из открытых букв, скорее всего, принадлежат тому же слову. Оставляйте то слово, которому принадлежит больше открытого.</li>
      <li><b>Загадывающему:</b> берите слова с <b>непохожими</b> буквами. Чем больше общих гласных отгадчик соберёт до конфликта, тем больнее будет выбор.</li>
      <li>Пары вроде «кошка / ложка», где слова отличаются одной буквой, почти не дают конфликтов — это подарок отгадчику.</li>
    </ul>
    <p class="tip"><b>Вариант посложнее:</b> загадайте <b>три</b> слова (включается в настройках). Первый конфликт уберёт одно слово, второй — ещё одно, и только тогда останется настоящее.</p>`,
  'qh.h.origin': 'Откуда игра',
  'qh.origin': `
    <p>Обычная виселица — старинная игра в слова на бумаге; в английских сборниках детских игр она описана ещё в конце XIX века, тогда под названием «Птицы, звери и рыбы».</p>
    <p>Квантовую версию придумал Авив Ньюман, а Бен Орлин включил её в свою книгу. Название — шутка над квантовой механикой: пока никто не «измерил», оба слова существуют одновременно, как частица в суперпозиции. Конфликт в одной клетке — это измерение: волновая функция схлопывается, и остаётся только одно слово.</p>`,
});

addStrings('en', {
  'qh.title': 'Quantum Hangman',
  'qh.tagline': 'hangman with two secret words at once',
  'qh.p0': 'Blue',
  'qh.p1': 'Red',
  'qh.cpu': 'Computer',
  'qh.role.set': 'sets words',
  'qh.role.guess': 'guesses',
  'qh.wins': ['win', 'wins'],
  'qh.again': 'next round',
  'qh.mode': 'Play:',
  'qh.mode.pvp': 'two players',
  'qh.mode.easy': 'vs computer (easy)',
  'qh.mode.normal': 'vs computer (normal)',
  'qh.mode.hard': 'vs computer (sneaky)',
  'qh.you': 'I:',
  'qh.you.alt': 'take turns',
  'qh.you.guess': 'always guess',
  'qh.you.set': 'always set words',
  'qh.nwords': 'Words:',
  'qh.nwords.2': 'two (as in the book)',
  'qh.nwords.3': 'three (harder)',
  'qh.len': 'Word length:',
  'qh.len.note': 'Length applies to the computer’s words and the “random” button; your own words can be anything from 3 to 10 letters.',
  'qh.online.note': 'You’re playing online: the room creator starts new rounds and picks the settings.',
  'qh.online.wait': 'Waiting for the other player…',
  'qh.online.waitnew': '{name} will start the next round',

  'qh.wrongbox': 'misses',
  'qh.yourwords': 'secret:',
  'qh.setup.title': '{name}, pick {n}',
  'qh.setup.n2': 'two words',
  'qh.setup.n3': 'three words',
  'qh.setup.ph': 'word {i}',
  'qh.setup.note': 'Same length, 3–10 letters, one alphabet.',
  'qh.setup.peek': '{name}, no peeking!',
  'qh.setup.rand': 'random',
  'qh.setup.ok': 'done!',
  'qh.err.empty': 'Fill in every word.',
  'qh.err.chars': 'Letters only — no spaces or digits.',
  'qh.err.mixed': 'Use one alphabet for all words.',
  'qh.err.short': 'Too short: at least 3 letters.',
  'qh.err.long': 'Too long: 10 letters at most.',
  'qh.err.len': 'The words must be the same length.',
  'qh.err.same': 'The words must be different.',
  'qh.cover.setter': 'Hand the device over: {name} picks the words',
  'qh.cover.setter.btn': 'it’s me, let me pick',
  'qh.cover.guesser': 'Words are set! Hand the device over: {name} guesses',
  'qh.cover.guesser.btn': 'start guessing',
  'qh.wait.setup': '{name} is picking words…',

  'qh.st.setup': '{name} is picking words',
  'qh.st.cover': 'Hand the device over',
  'qh.st.turn': '{name}: name a letter',
  'qh.st.you': 'Your turn: name a letter',
  'qh.st.them': '{name} is guessing…',
  'qh.st.think': '{name} is thinking…',
  'qh.st.conflict': 'Two letters clash — tap one to keep',
  'qh.st.conflict.them': '{name} is choosing which letter stays…',
  'qh.st.watch': '{name} is guessing your words',

  'qh.res.won': 'Word solved!',
  'qh.res.lost': 'Hanged!',
  'qh.res.winner': '{name} wins',
  'qh.res.words': 'The secret words:',

  'qh.say.hit': ['Got one!', 'Aha!', 'Yes!', 'Bingo'],
  'qh.say.multi': ['{k} of them!', '{k} at once!', 'Wow, {k}!'],
  'qh.say.miss': ['Missed', 'Ugh…', 'Nope', 'Hmm'],
  'qh.say.setter.miss': ['Nope!', 'Not there!', 'Heh', 'Missed!'],
  'qh.say.setter.hit': ['Oh', 'Hmm, that one’s in', 'Yeah…'],
  'qh.say.conflict': ['Two letters?!', 'A clash!', 'Which one…'],
  'qh.say.collapse.ok': ['Collapsed!', 'Picked!', 'Lucky!'],
  'qh.say.collapse.bad': ['Minus {k}!', 'Ouch, +{k} misses', 'So quantum…'],
  'qh.say.setter.collapse': ['Heh, wrong word', 'Wave collapsed!', 'Quantum surprise!'],
  'qh.say.set': ['All set!', 'Go ahead, guess', 'Good luck'],
  'qh.say.win': ['Hooray!', 'Solved!', 'I’m a genius'],
  'qh.say.setwin': ['Hanged!', 'Not solved!', 'Ha!'],
  'qh.say.lose': ['Rematch?', 'Next time…', 'Whatever'],

  'qh.h.how': 'How to play',
  'qh.how': `
    <p><b>You need:</b> two players — one sets the words, the other guesses. Then swap roles.</p>
    <p><b>The guesser’s goal:</b> reveal a whole word before making <b>8 misses</b> (then the little man is hanged and the setter wins).</p>
    <ol>
      <li>The setter secretly chooses <b>two words of the same length</b>. The board shows a single row of blanks shared by both.</li>
      <li>The guesser names a letter. If it’s in <b>neither</b> word, it’s a miss. If it’s in either one, it goes into every matching blank, whichever word it came from.</li>
      <li>Sooner or later two <b>different letters</b> land in the same blank. The guesser taps the one to keep. The word with the other letter is out, and <b>all its letters vanish</b> from the board.</li>
      <li>Letters that only fit the dropped word now count as <b>misses</b>, retroactively — that can cost several steps toward the gallows at once.</li>
      <li>From there it’s ordinary hangman with one word. Reveal it completely and the guesser wins.</li>
    </ol>
    <p>If the guesser fully reveals one of the words before any clash happens, that’s a win too.</p>`,
  'qh.h.tips': 'Tricks',
  'qh.tips': `
    <ul>
      <li><b>Guesser:</b> while two words are alive, common letters almost always hit — but some of those hits may later turn into misses. Don’t celebrate too early.</li>
      <li>When you must pick a letter, think about which revealed letters probably belong to the same word. Keep the word that owns more of what’s on the board.</li>
      <li><b>Setter:</b> choose words with <b>different</b> letters. The more shared vowels the guesser collects before the clash, the more painful the choice.</li>
      <li>Pairs like “cat / car” that differ in one letter barely clash at all — a gift to the guesser.</li>
    </ul>
    <p class="tip"><b>Harder variant:</b> set <b>three</b> words (switch it on in the settings). The first clash knocks out one word, the second clash another, and only then is the real word decided.</p>`,
  'qh.h.origin': 'Where it comes from',
  'qh.origin': `
    <p>Plain hangman is an old pencil-and-paper word game; English collections of children’s games described it already in the late 1800s, back then under the name “Birds, Beasts and Fishes.”</p>
    <p>The quantum version was suggested by Aviv Newman, and Ben Orlin included it in his book. The name pokes fun at quantum mechanics: until someone “measures,” both words exist at once, like a particle in superposition. A clash in one blank is the measurement — the wave function collapses and only one word remains.</p>`,
});
