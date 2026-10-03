import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'br.title': 'Вне строя',
  'br.tagline': 'выстройте список по убыванию — и не зарывайтесь',
  'br.rounds': 'Ответов у каждого:',
  'br.topic': 'Тема:',
  'br.topic.pick': 'на выбор судьи',
  'br.topic.random': 'случайная',
  'br.mode': 'Играем:',
  'br.mode.pvp': 'вдвоём',
  'br.mode.easy': 'с компьютером (простой)',
  'br.mode.normal': 'с компьютером (знаток)',
  'br.mode.hard': 'с компьютером (эрудит)',
  'br.again': 'ещё раз!',
  'br.p0': 'Синий',
  'br.p1': 'Красный',
  'br.cpu': 'Компьютер',
  'br.pts': ['очко', 'очка', 'очков'],
  'br.role.judge': 'судья',
  'br.role.guess': 'отвечает',
  'br.round': 'Ход {a} из {b}',
  'br.pick.head': 'Какой вопрос задать?',
  'br.pick.for': 'вопрос для: {name}',
  'br.items': ['пункт', 'пункта', 'пунктов'],
  'br.hint': 'Нажимайте по порядку: сначала самое большое. Можно пропускать — длина списка решаете вы.',
  'br.hint.wait': '{name} составляет список…',
  'br.lock': 'Готово: +{n}?',
  'br.lock0': 'выберите хоть один',
  'br.clear': 'сбросить',
  'br.next': 'дальше →',
  'br.finish': 'итоги →',
  'br.right': 'Всё верно! +{n} — {name}',
  'br.wrong': 'Вне строя! +1 судье — {name}',
  'br.unused': 'не вошли в список:',
  'br.status.pick': '{name} выбирает тему',
  'br.status.pick.you': 'Выберите тему для соперника',
  'br.status.guess': '{name}: составьте список',
  'br.status.guess.you': 'Ваш список!',
  'br.status.guess.them': '{name} составляет список…',
  'br.thinking': '{name} думает…',
  'br.online.wait': 'Ждём второго игрока…',
  'br.online.note': 'Сейчас идёт игра по сети: новую партию начинает и настройки меняет создатель комнаты.',
  'br.online.waitnew': 'Новую партию начнёт {name}',
  'br.nextstart': 'Первый ответ в следующей партии: {name}',
  'br.win': 'Побеждает {name}! {a} : {b}',
  'br.tie': 'Ничья! {a} : {b}',
  'br.say.pick': ['Держи задачку!', 'А вот это?', 'Хе-хе', 'Удачи!'],
  'br.say.risky': ['Рискну!', 'Ва-банк!', 'Была не была!'],
  'br.say.safe': ['Синица в руках', 'Без риска', 'Осторожно…'],
  'br.say.right': ['В точку!', 'Есть!', 'Как по нотам', 'Ура!'],
  'br.say.great': ['Энциклопедия!', 'Гений!', 'Все в строю!'],
  'br.say.wrong': ['Да ладно?!', 'Не может быть', 'Эх…', 'Перегнул'],
  'br.say.stumped': ['Попался!', 'Очко мне!', 'Хе-хе', 'Мимо!'],
  'br.say.ouch': ['Ого…', 'Ну ты даёшь', 'Хм'],
  'br.say.win': ['Ура!', 'Победа!', 'Я всё знаю'],
  'br.say.lose': ['Реванш?', 'Эх…', 'Пойду почитаю'],
  'br.h.how': 'Как играть',
  'br.how': `
    <p><b>Что нужно:</b> двое и немного эрудиции. Один отвечает, другой — судья; каждый ход роли меняются.</p>
    <p><b>Цель:</b> набрать больше очков, составляя списки без ошибок.</p>
    <ol>
      <li>Судья выбирает тему: набор предметов и признак, например «планеты — по массе».</li>
      <li>Отвечающий выписывает <b>сколько угодно</b> из этих предметов — по убыванию признака: сверху самый большой. Пропускать можно любые.</li>
      <li>Если в списке нет ни одной ошибки — отвечающий получает <b>1 очко за каждый пункт</b>.</li>
      <li>Если хоть где-то пункт оказался <b>больше</b> стоящего над ним — отвечающий получает 0, а судья <b>1 очко</b> за то, что поймал.</li>
      <li>Когда каждый ответил нужное число раз, побеждает тот, у кого больше очков.</li>
    </ol>
    <p>Нажимайте на пункты по порядку, повторное нажатие убирает пункт из списка.</p>`,
  'br.h.tips': 'Хитрости',
  'br.tips': `
    <ul>
      <li>Один пункт — гарантированное очко. Два наугад — уже 50 на 50. Каждый следующий шаг — ставка.</li>
      <li>Не обязательно брать соседей по рейтингу. Берите предметы, которые <b>сильно</b> отличаются: кит и кошку перепутать трудно, бегемота и жирафа — легко.</li>
      <li>Подумайте, что вы на самом деле знаете, а что только кажется. Сомневаетесь в паре — выбросьте одного из двух.</li>
      <li>Длинный список — красиво, но верный список из трёх лучше неверного из семи.</li>
    </ul>
    <p class="tip"><b>Сыграйте без компьютера.</b> В компании можно придумывать темы самим: за 10 минут до игры каждый готовит пару вопросов с понятным признаком («население», а не «популярность») и проверяет ответы в справочнике. Можно задавать и открытые темы вроде «любые страны мира» — тогда отвечающий сам решает, какие предметы назвать.</p>
    <p class="tip"><b>Для большой компании</b> судья один, а отвечают все остальные: каждый пишет свой список втайне, и судья получает очко за каждого, кого поймал.</p>`,
  'br.h.origin': 'Откуда игра',
  'br.origin': `
    <p>Это игра-викторина из короткого раздела в конце книги, родственница игры «Вне диапазона». Выигрывает здесь не самый начитанный, а тот, кто вовремя останавливается: знания помогают, но ещё важнее чувствовать, <i>где они заканчиваются</i>.</p>
    <p>Математика тут простая и коварная: семь предметов можно выстроить 5040 способами, и верный из них только один. Зато любой список из одного пункта всегда верен — вопрос лишь в том, когда остановиться. Ту же «жадность против осторожности» математики изучают в задачах об оптимальной остановке.</p>
    <p>Темы и цифры для компьютерной версии мы подобрали сами по открытым справочникам (значения округлены).</p>`,
});

addStrings('en', {
  'br.title': 'Breaking Rank',
  'br.tagline': 'rank them from biggest to smallest — and know when to stop',
  'br.rounds': 'Turns each:',
  'br.topic': 'Topic:',
  'br.topic.pick': 'judge’s choice',
  'br.topic.random': 'random',
  'br.mode': 'Play:',
  'br.mode.pvp': 'two players',
  'br.mode.easy': 'vs computer (easy)',
  'br.mode.normal': 'vs computer (buff)',
  'br.mode.hard': 'vs computer (scholar)',
  'br.again': 'again!',
  'br.p0': 'Blue',
  'br.p1': 'Red',
  'br.cpu': 'Computer',
  'br.pts': ['point', 'points'],
  'br.role.judge': 'judge',
  'br.role.guess': 'guessing',
  'br.round': 'Turn {a} of {b}',
  'br.pick.head': 'Which question?',
  'br.pick.for': 'the question is for {name}',
  'br.items': ['item', 'items'],
  'br.hint': 'Tap in order, biggest first. Skip whatever you like — you decide how long the list gets.',
  'br.hint.wait': '{name} is making a list…',
  'br.lock': 'Lock in: +{n}?',
  'br.lock0': 'pick at least one',
  'br.clear': 'clear',
  'br.next': 'next →',
  'br.finish': 'results →',
  'br.right': 'All correct! +{n} for {name}',
  'br.wrong': 'Broke rank! +1 for the judge, {name}',
  'br.unused': 'left out:',
  'br.status.pick': '{name} picks a topic',
  'br.status.pick.you': 'Pick a topic for your opponent',
  'br.status.guess': '{name}: make your list',
  'br.status.guess.you': 'Your list!',
  'br.status.guess.them': '{name} is making a list…',
  'br.thinking': '{name} is thinking…',
  'br.online.wait': 'Waiting for the other player…',
  'br.online.note': 'You’re playing online: the room creator starts new games and changes the settings.',
  'br.online.waitnew': '{name} will start the next game',
  'br.nextstart': 'Next game, {name} answers first',
  'br.win': '{name} wins! {a} : {b}',
  'br.tie': 'A tie! {a} : {b}',
  'br.say.pick': ['Try this one!', 'Good luck!', 'Heh heh', 'Here you go'],
  'br.say.risky': ['All in!', 'Feeling lucky!', 'Pretty sure…'],
  'br.say.safe': ['Safe and sound', 'No risk', 'Careful…'],
  'br.say.right': ['Knew it!', 'Yes!', 'Nailed it', 'Hooray!'],
  'br.say.great': ['Encyclopedia!', 'Genius!', 'All in line!'],
  'br.say.wrong': ['No way?!', 'Can’t be', 'Ugh…', 'One too far'],
  'br.say.stumped': ['Gotcha!', 'Point for me!', 'Heh', 'Nope!'],
  'br.say.ouch': ['Wow…', 'Show-off', 'Hmm'],
  'br.say.win': ['Hooray!', 'Victory!', 'Too easy!'],
  'br.say.lose': ['Rematch?', 'Next time…', 'To the library!'],
  'br.h.how': 'How to play',
  'br.how': `
    <p><b>You need:</b> two players and a bit of general knowledge. One guesses, the other judges; roles swap every turn.</p>
    <p><b>Goal:</b> score more points by making lists with no mistakes.</p>
    <ol>
      <li>The judge picks a topic: a group of items and a statistic, like “planets, by mass”.</li>
      <li>The guesser lists <b>as many</b> of those items as they dare, in decreasing order: biggest on top. Any item may be skipped.</li>
      <li>If the list has no mistakes, the guesser scores <b>1 point per item</b>.</li>
      <li>If anywhere an item is <b>bigger</b> than the one above it, the guesser scores 0 and the judge scores <b>1 point</b> for the catch.</li>
      <li>Once everyone has guessed the set number of times, the higher score wins.</li>
    </ol>
    <p>Tap items in order; tap a listed item again to take it off.</p>`,
  'br.h.tips': 'Tricks',
  'br.tips': `
    <ul>
      <li>One item is a guaranteed point. Two at random is already a coin flip. Every extra item is a bet.</li>
      <li>You don’t have to use neighbours in the ranking. Pick items that are <b>far apart</b>: a whale and a cat are hard to mix up, a hippo and a giraffe are not.</li>
      <li>Be honest about what you know versus what just feels familiar. Unsure about a pair? Drop one of them.</li>
      <li>A long list looks great, but a correct list of three beats a wrong list of seven.</li>
    </ul>
    <p class="tip"><b>Play it offline.</b> With friends you make up the topics yourselves: spend ten minutes before the game preparing questions with a clear statistic (“population”, not “popularity”) and checking the answers in a reference. Open-ended topics like “any country in the world” work too — then the guesser chooses which items to name.</p>
    <p class="tip"><b>For a bigger group</b> there is one judge and everyone else guesses: each writes a list in secret, and the judge scores a point for every guesser caught out.</p>`,
  'br.h.origin': 'Where it comes from',
  'br.origin': `
    <p>This trivia game comes from the short-games section at the end of the book, a cousin of Outrangeous. The winner is not the biggest know-it-all but whoever stops in time: knowledge helps, but sensing <i>where it runs out</i> helps more.</p>
    <p>The maths is simple and sneaky: seven items can be ordered in 5,040 ways, and only one of them is right. Yet any one-item list is always right — the only question is when to stop. Mathematicians study this same greed-versus-caution tension as “optimal stopping”.</p>
    <p>We picked the topics and figures for this computer version ourselves from open references (values are rounded).</p>`,
});
