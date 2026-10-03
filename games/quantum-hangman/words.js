// Word pools for the computer setter, the "random words" button and the computer guesser's reasoning.
// Flat lists; the engine groups them by length (4–7 letters are used). Uppercase, Ё folded into Е.
const EN = `
bear boat cake coin door duck fish frog game goat hand harp hill kite lamp leaf lion milk moon nest
park pear rain ring road rock rose salt ship shoe sock star tent tree wolf worm yarn king bell bird
corn drum farm gift iron lake mask nose oven pipe roof sand soup tail vase wave wind fork desk owl
apple bread chair cloud crown dance eagle flame ghost grape heart horse house juice knife lemon magic
mouse night ocean onion panda piano pizza plant queen river robot salad sheep skunk smile snake spoon
storm sugar table tiger toast train truck watch whale zebra beach candy dream field giant honey igloo
jelly koala lunch maple noise paint quilt sauce tooth brick climb frost lucky
animal banana basket bottle bridge button candle carrot castle cheese circle cookie dragon flower forest
garden guitar hammer island jacket kitten ladder letter monkey number orange parrot pencil pepper pirate
planet pocket rabbit rocket saddle school shadow spider square summer ticket tomato turtle violin wallet
window winter wizard yellow zipper puzzle mirror anchor beetle cactus donkey engine falcon
balloon blanket cabbage capital captain chicken crystal diamond dolphin factory feather giraffe harvest
holiday iceberg journey kitchen lantern library lobster machine mermaid monster morning mustard network
octopus padlock painter penguin picture popcorn pumpkin pyramid rainbow scooter seagull shelter soldier
spinach station sunrise teacher thunder tractor trumpet unicorn vampire volcano weather whistle cartoon
compass curtain
`;

const RU = `
вода гора луна роза рыба сова окно лист мост нота пила река сани слон снег торт утка флаг шарф шкаф
щука юбка яйцо ящик лиса коза зима игла каша кино кран лето лужа мука обед поле рука сеть стол стул
танк тигр трон урок хлеб цирк барс бант жаба звон змей ключ клад гриб утюг мышь овощ часы узор небо
книга птица сумка ветер волна дождь жираф зебра замок искра кошка лампа ложка пирог повар рояль сахар
совет танец тесто тыква улица фрукт хобот чашка шапка щенок ягода якорь арбуз банан вилка груша диван
дятел завод кефир клоун крыша лимон нитка озеро океан пакет песок пчела рынок ручка сокол слива стена
трава фокус халат хомяк цифра школа шарик белка пенал катер билет малыш
ананас апрель гитара дерево дракон звезда иголка карман кольцо корова космос куртка лебедь малина машина
монета облако овечка огурец павлин письмо погода ракета радуга собака стакан улитка фонарь футбол хоккей
цветок яблоко лошадь медуза мишень музыка остров гнездо глобус корона лагерь сердце солнце спичка тюлень
кролик лисица ворона барсук камень молоко бублик пряник сирень кактус колесо фонтан сундук улыбка рюкзак
бабочка ботинок верблюд зеркало капуста морковь подарок помидор самолет свисток тарелка тетрадь учебник
черника пингвин пустыня ромашка шоколад медведь кенгуру автобус барабан бегемот варенье дельфин журавль
игрушка калитка картина колокол копейка корабль магазин молоток паровоз планета подушка ракушка рисунок
телефон трактор тюльпан человек чемодан учитель хомячок
`;

const prep = (s) => [...new Set(s.trim().split(/\s+/).map((w) => w.toUpperCase().replace(/Ё/g, 'Е')))];

export const WORDS = { en: prep(EN), ru: prep(RU) };
