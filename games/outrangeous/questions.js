// Question deck for Outrangeous (our own questions, RU + EN).
//   a    — the true answer
//   log  — typical human uncertainty as a spread in log10 units (for counts, sizes, big numbers)
//   sd   — typical uncertainty as an absolute spread (for years, temperatures)
//   neg  — the answer may be negative (the input shows a ± key)
//   dice — [count, sides]: the answer is rolled when the game starts
// The AI bots "know" each answer only up to a random error of about this size.
export const QUESTIONS = [
  // --- years ---
  { id: 'wall', a: 1989, sd: 10, ru: 'В каком году пала Берлинская стена?', en: 'In what year did the Berlin Wall fall?' },
  { id: 'gagarin', a: 1961, sd: 8, ru: 'В каком году Юрий Гагарин полетел в космос?', en: 'In what year did Yuri Gagarin fly to space?' },
  { id: 'titanic', a: 1912, sd: 18, ru: 'В каком году затонул «Титаник»?', en: 'In what year did the Titanic sink?' },
  { id: 'columbus', a: 1492, sd: 40, ru: 'В каком году Колумб впервые доплыл до Америки?', en: 'In what year did Columbus first reach the Americas?' },
  { id: 'moon', a: 1969, sd: 6, ru: 'В каком году люди впервые высадились на Луну?', en: 'In what year did people first land on the Moon?' },
  { id: 'eiffel', a: 1889, sd: 25, ru: 'В каком году открылась Эйфелева башня?', en: 'In what year did the Eiffel Tower open?' },
  { id: 'iphone', a: 2007, sd: 3, ru: 'В каком году вышел первый iPhone?', en: 'In what year did the first iPhone come out?' },
  { id: 'spb', a: 1703, sd: 40, ru: 'В каком году основан Санкт-Петербург?', en: 'In what year was Saint Petersburg founded?' },
  { id: 'web', a: 1991, sd: 7, ru: 'В каком году заработал самый первый веб-сайт?', en: 'In what year did the very first website go online?' },
  { id: 'pushkin', a: 1799, sd: 30, ru: 'В каком году родился Александр Пушкин?', en: 'In what year was the poet Alexander Pushkin born?' },
  { id: 'shakespeare', a: 1564, sd: 40, ru: 'В каком году родился Уильям Шекспир?', en: 'In what year was William Shakespeare born?' },
  { id: 'galileo', a: 1564, sd: 40, ru: 'В каком году родился Галилео Галилей?', en: 'In what year was Galileo Galilei born?' },
  { id: 'principia', a: 1687, sd: 40, ru: 'В каком году Ньютон издал «Математические начала натуральной философии»?', en: 'In what year did Newton publish his Principia?' },
  { id: 'mendeleev', a: 1869, sd: 30, ru: 'В каком году Менделеев представил периодическую таблицу?', en: 'In what year did Mendeleev present his periodic table?' },
  { id: 'darwin', a: 1859, sd: 30, ru: 'В каком году вышло «Происхождение видов» Дарвина?', en: 'In what year was Darwin’s “On the Origin of Species” published?' },
  { id: 'olympics', a: 1896, sd: 25, ru: 'В каком году прошли первые современные Олимпийские игры?', en: 'In what year were the first modern Olympic Games held?' },
  { id: 'alice', a: 1865, sd: 30, ru: 'В каком году вышла «Алиса в Стране чудес»?', en: 'In what year was “Alice’s Adventures in Wonderland” published?' },
  { id: 'quixote', a: 1605, sd: 40, ru: 'В каком году вышла первая часть «Дон Кихота»?', en: 'In what year was the first part of “Don Quixote” published?' },
  { id: 'tolstoy', a: 1828, sd: 30, ru: 'В каком году родился Лев Толстой?', en: 'In what year was Leo Tolstoy born?' },
  { id: 'rubik', a: 1974, sd: 10, ru: 'В каком году Эрнё Рубик изобрёл свой кубик?', en: 'In what year did Ernő Rubik invent his cube?' },
  { id: 'tetris', a: 1984, sd: 7, ru: 'В каком году Алексей Пажитнов создал «Тетрис»?', en: 'In what year did Alexey Pajitnov create Tetris?' },
  { id: 'tchaikovsky', a: 1840, sd: 35, ru: 'В каком году родился Пётр Чайковский?', en: 'In what year was the composer Tchaikovsky born?' },

  // --- science & nature ---
  { id: 'everest', a: 8849, log: 0.12, ru: 'Высота Эвереста в метрах (по замеру 2020 года)?', en: 'Height of Mount Everest in metres (2020 survey)?' },
  { id: 'elbrus', a: 5642, log: 0.15, ru: 'Высота Эльбруса в метрах?', en: 'Height of Mount Elbrus in metres?' },
  { id: 'baikal', a: 1642, log: 0.25, ru: 'Наибольшая глубина Байкала в метрах?', en: 'Maximum depth of Lake Baikal in metres?' },
  { id: 'bones', a: 206, log: 0.25, ru: 'Сколько костей в скелете взрослого человека?', en: 'How many bones are in an adult human skeleton?' },
  { id: 'handbones', a: 27, log: 0.25, ru: 'Сколько костей в одной кисти человека вместе с запястьем?', en: 'How many bones are in one human hand, wrist included?' },
  { id: 'teeth', a: 32, log: 0.12, ru: 'Сколько зубов в полном наборе у взрослого (с зубами мудрости)?', en: 'How many teeth in a full adult set (wisdom teeth included)?' },
  { id: 'chromosomes', a: 46, log: 0.25, ru: 'Сколько хромосом в обычной клетке человека?', en: 'How many chromosomes are in a typical human cell?' },
  { id: 'octopus', a: 3, log: 0.3, ru: 'Сколько сердец у осьминога?', en: 'How many hearts does an octopus have?' },
  { id: 'marsmoons', a: 2, log: 0.35, ru: 'Сколько естественных спутников у Марса?', en: 'How many natural moons does Mars have?' },
  { id: 'marsyear', a: 687, log: 0.3, ru: 'Сколько земных суток длится год на Марсе?', en: 'How many Earth days long is a year on Mars?' },
  { id: 'lunarmonth', a: 27, log: 0.15, ru: 'За сколько суток Луна делает оборот вокруг Земли (относительно звёзд, округлите)?', en: 'How many days does the Moon take to orbit Earth (relative to the stars, rounded)?' },
  { id: 'elements', a: 118, log: 0.15, ru: 'Сколько химических элементов в таблице Менделеева (на сегодня)?', en: 'How many chemical elements are in the periodic table today?' },
  { id: 'gold', a: 79, log: 0.25, ru: 'Атомный номер золота?', en: 'What is the atomic number of gold?' },
  { id: 'light', a: 299792, log: 0.3, ru: 'Скорость света в километрах в секунду (округлите до целого)?', en: 'Speed of light in kilometres per second (to the nearest whole number)?' },
  { id: 'sound', a: 343, log: 0.25, ru: 'Скорость звука в воздухе при 20 °C, метров в секунду?', en: 'Speed of sound in air at 20 °C, metres per second?' },
  { id: 'sunlight', a: 499, log: 0.25, ru: 'Сколько секунд летит свет от Солнца до Земли?', en: 'How many seconds does sunlight take to reach Earth?' },
  { id: 'sundist', a: 150, log: 0.3, ru: 'Расстояние от Земли до Солнца в миллионах километров?', en: 'Distance from Earth to the Sun in millions of kilometres?' },
  { id: 'earthd', a: 12742, log: 0.25, ru: 'Диаметр Земли в километрах?', en: 'Diameter of the Earth in kilometres?' },
  { id: 'moonmass', a: 81, log: 0.35, ru: 'Во сколько раз Земля тяжелее Луны (округлите)?', en: 'How many times heavier is the Earth than the Moon (rounded)?' },
  { id: 'abszero', a: -273, sd: 60, neg: true, ru: 'Абсолютный ноль в градусах Цельсия (округлите до целого)?', en: 'Absolute zero in degrees Celsius (to the nearest degree)?' },
  { id: 'mercury', a: -39, sd: 40, neg: true, ru: 'При какой температуре замерзает ртуть, °C (округлите)?', en: 'At what temperature does mercury freeze, °C (rounded)?' },
  { id: 'iron', a: 1538, log: 0.2, ru: 'Температура плавления железа, °C?', en: 'Melting point of iron, °C?' },
  { id: 'boilf', a: 212, sd: 40, ru: 'При скольких градусах Фаренгейта кипит вода (на уровне моря)?', en: 'At how many degrees Fahrenheit does water boil (at sea level)?' },

  // --- the world ---
  { id: 'un', a: 193, log: 0.15, ru: 'Сколько государств — членов ООН?', en: 'How many member states does the United Nations have?' },
  { id: 'africa', a: 54, log: 0.18, ru: 'Сколько стран Африки входят в ООН?', en: 'How many African countries are UN members?' },
  { id: 'eu', a: 27, log: 0.15, ru: 'Сколько стран в Евросоюзе?', en: 'How many countries are in the European Union?' },
  { id: 'tz', a: 11, log: 0.2, ru: 'Сколько часовых поясов в России?', en: 'How many time zones does Russia have?' },
  { id: 'usflag', a: 50, log: 0.15, ru: 'Сколько звёзд на флаге США?', en: 'How many stars are on the US flag?' },
  { id: 'marathon', a: 42195, log: 0.1, ru: 'Длина марафона в метрах?', en: 'Length of a marathon in metres?' },
  { id: 'mile', a: 160934, log: 0.3, ru: 'Сколько сантиметров в сухопутной миле (округлите)?', en: 'How many centimetres are in a mile (rounded)?' },
  { id: 'burj', a: 828, log: 0.2, ru: 'Высота небоскрёба Бурдж-Халифа в метрах?', en: 'Height of the Burj Khalifa in metres?' },
  { id: 'ostankino', a: 540, log: 0.2, ru: 'Высота Останкинской телебашни в метрах?', en: 'Height of the Ostankino TV tower in Moscow, in metres?' },

  // --- culture & games ---
  { id: 'piano', a: 88, log: 0.2, ru: 'Сколько клавиш у обычного фортепиано?', en: 'How many keys are on a standard piano?' },
  { id: 'beethoven', a: 9, log: 0.25, ru: 'Сколько симфоний завершил Бетховен?', en: 'How many symphonies did Beethoven complete?' },
  { id: 'rugby', a: 15, log: 0.2, ru: 'Сколько игроков одной команды одновременно на поле в классическом регби (не в регби-7)?', en: 'How many players per team are on the field in rugby union?' },
  { id: 'go', a: 361, log: 0.25, ru: 'Сколько пересечений на стандартной доске для го?', en: 'How many intersections are on a standard Go board?' },
  { id: 'deck', a: 52, log: 0.12, ru: 'Сколько карт в стандартной колоде без джокеров?', en: 'How many cards are in a standard deck, no jokers?' },
  { id: 'monopoly', a: 40, log: 0.2, ru: 'Сколько клеток по краю поля «Монополии»?', en: 'How many spaces are around a Monopoly board?' },
  { id: 'football', a: 32, log: 0.25, ru: 'Из скольких лоскутов сшит классический футбольный мяч (пятиугольники + шестиугольники)?', en: 'How many panels make a classic soccer ball (pentagons + hexagons)?' },
  { id: 'braille', a: 6, log: 0.2, ru: 'Сколько точек в одной клетке шрифта Брайля?', en: 'How many dots are in one Braille cell?' },
  { id: 'chessmoves', a: 20, log: 0.25, ru: 'Сколько разных первых ходов есть у белых в шахматах?', en: 'How many different first moves does White have in chess?' },
  { id: 'roulette', a: 666, log: 0.3, ru: 'Сумма всех чисел на колесе рулетки (от 0 до 36)?', en: 'Sum of all numbers on a roulette wheel (0 to 36)?' },

  // --- maths you could work out (if you had time) ---
  { id: 'pips', a: 21, log: 0.2, ru: 'Сколько всего точек на обычном игральном кубике?', en: 'How many pips are there in total on a standard die?' },
  { id: 'sum100', a: 5050, log: 0.3, ru: 'Сумма всех чисел от 1 до 100?', en: 'The sum of all whole numbers from 1 to 100?' },
  { id: 'weekmin', a: 10080, log: 0.25, ru: 'Сколько минут в неделе?', en: 'How many minutes are in a week?' },
  { id: 'daysec', a: 86400, log: 0.25, ru: 'Сколько секунд в сутках?', en: 'How many seconds are in a day?' },
  { id: 'yearhours', a: 8760, log: 0.25, ru: 'Сколько часов в невисокосном году?', en: 'How many hours are in a non-leap year?' },
  { id: 'chesssq', a: 204, log: 0.35, ru: 'Сколько всего квадратов любого размера на шахматной доске?', en: 'How many squares of any size are on a chessboard?' },
  { id: 'icosa', a: 30, log: 0.3, ru: 'Сколько рёбер у икосаэдра (20 треугольных граней)?', en: 'How many edges does an icosahedron (20 triangular faces) have?' },
  { id: 'decagon', a: 35, log: 0.3, ru: 'Сколько диагоналей у десятиугольника?', en: 'How many diagonals does a decagon have?' },
  { id: 'pow20', a: 1048576, log: 0.4, ru: 'Сколько будет 2 в 20-й степени?', en: 'What is 2 to the 20th power?' },
  { id: 'fact10', a: 3628800, log: 0.6, ru: 'Сколько будет 10! (произведение чисел от 1 до 10)?', en: 'What is 10! (the product of 1 through 10)?' },
  { id: 'digits2100', a: 31, log: 0.25, ru: 'Сколько цифр в числе 2¹⁰⁰?', en: 'How many digits does 2¹⁰⁰ have?' },
  { id: 'hexangles', a: 720, log: 0.2, ru: 'Сумма внутренних углов шестиугольника в градусах?', en: 'Sum of the interior angles of a hexagon, in degrees?' },
  { id: 'primes100', a: 25, log: 0.25, ru: 'Сколько простых чисел меньше 100?', en: 'How many prime numbers are below 100?' },
  { id: 'squares1000', a: 31, log: 0.3, ru: 'Сколько точных квадратов (1, 4, 9, …) меньше 1000?', en: 'How many perfect squares (1, 4, 9, …) are below 1000?' },
  { id: 'e10', a: 22026, log: 0.45, ru: 'Чему равно e¹⁰ (округлите до целого)?', en: 'What is e¹⁰ (rounded to a whole number)?' },
  { id: 'pizza', a: 56, log: 0.3, ru: 'На сколько кусков максимум можно разрезать блин 10 прямыми разрезами?', en: 'At most how many pieces can 10 straight cuts make of a pancake?' },
  { id: 'handshakes', a: 190, log: 0.3, ru: '20 человек пожали руки каждый каждому. Сколько было рукопожатий?', en: '20 people all shake hands with each other once. How many handshakes?' },
  { id: 'clock', a: 11, log: 0.2, ru: 'Сколько раз за 12 часов (от полудня до полуночи, не считая полночь) совпадают часовая и минутная стрелки?', en: 'How many times do the hour and minute hands meet in 12 hours (noon included, midnight not)?' },
  { id: 'poker', a: 2598960, log: 0.6, ru: 'Сколькими способами можно взять 5 карт из колоды в 52 карты?', en: 'In how many ways can you pick 5 cards from a 52-card deck?' },

  // --- dice: nobody knows, everyone can reason ---
  { id: 'd10', dice: [1, 10], ru: 'Бросаем десятигранный кубик (числа от 1 до 10). Что выпадет?', en: 'We roll a ten-sided die (numbers 1 to 10). What will come up?' },
  { id: 'd20', dice: [1, 20], ru: 'Бросаем двадцатигранный кубик (от 1 до 20). Что выпадет?', en: 'We roll a twenty-sided die (1 to 20). What will come up?' },
  { id: '2d6', dice: [2, 6], ru: 'Бросаем два обычных кубика. Какой будет сумма?', en: 'We roll two ordinary dice. What will the total be?' },
  { id: '3d6', dice: [3, 6], ru: 'Бросаем три обычных кубика. Какой будет сумма?', en: 'We roll three ordinary dice. What will the total be?' },
];

export const BY_ID = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
