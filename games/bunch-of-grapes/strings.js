import { addStrings } from '../../shared/i18n.js';

addStrings('ru', {
  'grp.title': 'Гроздь винограда',
  'grp.tagline': 'две голодные мухи и одна гроздь — кому не хватит места?',
  'grp.size': 'Гроздь:',
  'grp.size.small': 'маленькая',
  'grp.size.medium': 'средняя',
  'grp.size.large': 'большая',
  'grp.mode': 'Играем:',
  'grp.mode.pvp': 'вдвоём',
  'grp.mode.easy': 'с компьютером (простой)',
  'grp.mode.normal': 'с компьютером (обычный)',
  'grp.mode.hard': 'с компьютером (сильный)',
  'grp.again': 'ещё раз!',
  'grp.p0': 'Синий',
  'grp.p1': 'Красный',
  'grp.cpu': 'Компьютер',
  'grp.grapes': ['виноградина', 'виноградины', 'виноградин'],
  'grp.nofly': 'ещё в полёте',
  'grp.place': '{name}: куда сядет муха?',
  'grp.place.you': 'Посадите свою муху на виноградину',
  'grp.place.them': '{name} выбирает виноградину…',
  'grp.turn': 'Ходит {name}',
  'grp.thinking': '{name} думает…',
  'grp.turn.you': 'Ваш ход',
  'grp.turn.them': 'Ходит {name}…',
  'grp.online.wait': 'Ждём второго игрока…',
  'grp.online.note': 'Сейчас идёт игра по сети: новую гроздь выбирает и партию начинает создатель комнаты.',
  'grp.online.waitnew': 'Новую партию начнёт {name}',
  'grp.win': 'Побеждает {name}!',
  'grp.stuck': 'Второй мухе некуда лететь',
  'grp.say.place': ['Ням!', 'Здесь вкусно', 'Моё место', 'Тут сяду'],
  'grp.say.cut': ['Это всё моё!', 'Отрезано!', 'Делим гроздь!', 'Моя половина!'],
  'grp.say.good': ['Хе-хе', 'Неплохо', 'Подвинься!', 'Вкуснятина'],
  'grp.say.squeeze': ['Попалась!', 'Тесно тебе?', 'Куда теперь?'],
  'grp.say.tight': ['Тесновато…', 'Ой-ой', 'Хм…', 'Куда же…'],
  'grp.say.oops': ['Ой', 'Кажется, зря', 'Тесно…', 'Эх'],
  'grp.say.win': ['Ура!', 'Сытая победа!', 'Вот это обед'],
  'grp.say.lose': ['Реванш?', 'Мало еды!', 'В следующий раз…'],
  'grp.h.how': 'Как играть',
  'grp.how': `
    <p><b>Что нужно:</b> двое и нарисованная гроздь винограда. Виноградины разного размера, и видно, какие из них касаются друг друга.</p>
    <p><b>Цель:</b> не остаться запертым — пусть первой некуда будет лететь мухе соперника.</p>
    <ol>
      <li>Сначала каждый по очереди сажает свою <b>муху</b> на любую виноградину.</li>
      <li>Кто посадил муху <b>вторым</b>, тот <b>ходит первым</b>.</li>
      <li>Ход: муха <b>съедает</b> виноградину, на которой сидит (она закрашивается вашим цветом), и перелетает на <b>соседнюю</b> — ту, что делит с ней границу. Нельзя садиться на съеденную виноградину и на муху соперника.</li>
      <li>Кому некуда перелететь — тот <b>проиграл</b>.</li>
    </ol>
    <p class="tip">Нажмите на подсвеченную виноградину рядом со своей мухой — туда она и полетит.</p>`,
  'grp.h.tips': 'Хитрости',
  'grp.tips': `
    <ul>
      <li>Главное — не еда, а <b>простор</b>. Считайте не съеденное, а то, что ещё можно съесть.</li>
      <li>Цепочка съеденных виноградин — это стена. Постарайтесь провести её так, чтобы <b>отрезать</b> сопернику меньший кусок грозди, а себе оставить больший.</li>
      <li>Когда мухи разделены, игра превращается в пасьянс: доедайте свой кусок <b>змейкой</b>, вдоль краёв, не оставляя за спиной недоеденных виноградин.</li>
      <li>Узкие перешейки и тупички опасны: залетите туда — и выход может закрыться.</li>
      <li>Размер обманчив: крупная виноградина часто граничит с большим числом соседей, мелкая — с двумя-тремя.</li>
    </ul>
    <p class="tip"><b>Вариант:</b> нарисуйте гроздь на бумаге сами — разной формы и с разными «дырками». Чем неправильнее гроздь, тем больше сюрпризов.</p>`,
  'grp.h.origin': 'Откуда игра',
  'grp.origin': `
    <p>Игру придумал бельгийский художник и автор настольных игр <b>Вальтер Йорис</b> — он собрал целую коллекцию игр для карандаша и бумаги. Здесь он превратил обычное «кто кого запрёт» в раскраску: к концу партии лист выглядит как узор из цветных ягод.</p>
    <p>Математически это родственник «Трона» со световыми мотоциклами и игры «Изоляция»: оба игрока оставляют за собой непроходимый след. Но на неровной грозди глаз плохо оценивает, где больше места, — поэтому партии полны неожиданностей.</p>`,
});

addStrings('en', {
  'grp.title': 'Bunch of Grapes',
  'grp.tagline': 'two hungry flies, one bunch — who runs out of room first?',
  'grp.size': 'Bunch:',
  'grp.size.small': 'small',
  'grp.size.medium': 'medium',
  'grp.size.large': 'large',
  'grp.mode': 'Play:',
  'grp.mode.pvp': 'two players',
  'grp.mode.easy': 'vs computer (easy)',
  'grp.mode.normal': 'vs computer (normal)',
  'grp.mode.hard': 'vs computer (strong)',
  'grp.again': 'again!',
  'grp.p0': 'Blue',
  'grp.p1': 'Red',
  'grp.cpu': 'Computer',
  'grp.grapes': ['grape', 'grapes'],
  'grp.nofly': 'still flying',
  'grp.place': '{name}: where will your fly land?',
  'grp.place.you': 'Land your fly on a grape',
  'grp.place.them': '{name} is picking a grape…',
  'grp.turn': '{name} to move',
  'grp.thinking': '{name} is thinking…',
  'grp.turn.you': 'Your move',
  'grp.turn.them': '{name} is moving…',
  'grp.online.wait': 'Waiting for the other player…',
  'grp.online.note': 'You’re playing online: the room creator picks the bunch and starts new games.',
  'grp.online.waitnew': '{name} will start the next game',
  'grp.win': '{name} wins!',
  'grp.stuck': 'The other fly has nowhere to go',
  'grp.say.place': ['Yum!', 'Looks tasty', 'My spot', 'I’ll sit here'],
  'grp.say.cut': ['All mine!', 'Cut off!', 'Split it!', 'My half!'],
  'grp.say.good': ['Heh', 'Not bad', 'Scoot over!', 'Delicious'],
  'grp.say.squeeze': ['Gotcha!', 'Cramped?', 'Where to now?'],
  'grp.say.tight': ['Bit tight…', 'Uh-oh', 'Hmm…', 'Where now…'],
  'grp.say.oops': ['Oops', 'Uh-oh', 'Not much room', 'Ugh'],
  'grp.say.win': ['Hooray!', 'A tasty win!', 'What a lunch'],
  'grp.say.lose': ['Rematch?', 'Still hungry', 'Next time…'],
  'grp.h.how': 'How to play',
  'grp.how': `
    <p><b>You need:</b> two players and a drawn bunch of grapes. The grapes come in different sizes, and you can see which ones touch.</p>
    <p><b>Goal:</b> don’t get boxed in — make your opponent’s fly the first with nowhere to go.</p>
    <ol>
      <li>First, each player in turn lands their <b>fly</b> on any grape.</li>
      <li>Whoever placed their fly <b>second</b> <b>moves first</b>.</li>
      <li>On your move your fly <b>eats</b> the grape it sits on (it gets colored in your color) and hops to a <b>neighboring</b> grape — one that shares a border with it. You can’t land on an eaten grape or on the other fly.</li>
      <li>If your fly has nowhere to hop, you <b>lose</b>.</li>
    </ol>
    <p class="tip">Tap a highlighted grape next to your fly — that’s where it will hop.</p>`,
  'grp.h.tips': 'Tricks',
  'grp.tips': `
    <ul>
      <li>It’s not about eating, it’s about <b>room</b>. Count what’s still left to eat, not what you’ve eaten.</li>
      <li>A trail of eaten grapes is a wall. Try to lay it so that it <b>cuts off</b> a smaller part of the bunch for your opponent and leaves the bigger part to you.</li>
      <li>Once the flies are separated it’s solitaire: eat your part in a <b>snake</b> along the edges, leaving no uneaten grapes behind you.</li>
      <li>Narrow necks and dead ends are traps: fly in and the exit may close behind you.</li>
      <li>Size deceives: a big grape usually borders many neighbors, a small one only two or three.</li>
    </ul>
    <p class="tip"><b>Variant:</b> draw your own bunch on paper — odd shapes, holes and all. The more irregular the bunch, the more surprises.</p>`,
  'grp.h.origin': 'Where it comes from',
  'grp.origin': `
    <p>The game was invented by the Belgian artist and game designer <b>Walter Joris</b>, who put together a whole collection of pencil-and-paper games. Here he turned a plain “who gets boxed in” contest into a coloring page: by the end the sheet looks like a pattern of colorful berries.</p>
    <p>Mathematically it’s a cousin of the light-cycle game from <i>Tron</i> and of the game Isolation: both players leave an impassable trail behind them. But on a lumpy bunch the eye is bad at judging where there’s more room — which is why games are full of surprises.</p>`,
});
