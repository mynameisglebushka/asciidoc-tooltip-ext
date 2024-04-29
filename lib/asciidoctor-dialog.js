// const { Asciidoctor } = require("asciidoctor");

class Termin {
  // Термин
  #termin;

  // Определение
  #description;

  // Массив терминов, в которое входит текущий
  #bigger;

  // Массив терминов, которые входят в текущий
  #smaller;

  constructor(termin, description) {
    this.#termin = termin;
    this.#description = description;
    this.#bigger = new Array();
    this.#smaller = new Array();
  }

  /**
   * @returns {String}
   */
  get termin() {
    return this.#termin;
  }

  get description() {
    return this.#description;
  }

  get bigger() {
    return this.#bigger;
  }

  get smaller() {
    return this.#smaller;
  }

  addBiggerTermin(termin, wordBefore, wordAfter) {
    var biggerTermin = {
      termin: termin,
      before: wordBefore,
      after: wordAfter,
    };
    this.#bigger.push(biggerTermin);
  }

  addSmallerTremin(termin, wordBefore, wordAfter) {
    var smallerTermin = {
      termin: termin,
      before: wordBefore,
      after: wordAfter,
    };
    this.#smaller.push(smallerTermin);
  }
}

/**
 * Ищет блок в структуре Asciidoctor.Document
 * @param {Asciidoctor.Document | Asciidoctor.Block} block
 * @returns {Asciidoctor.Block}
 */
function blockById(block) {
  // Текущий блок существует
  if (block === undefined) {
    return;
  }
  // Это Блок, который нам нужен
  if (block.id == "tnc") {
    return block;
  }
  // Есть ли у этого блока дети?
  if (block.blocks.length == 0) {
    return;
  } else {
    // Тогда идем по ним рекурсией
    for (let b of block.blocks) {
      let a = blockById(b);
      // Если вернулся не объект - значит нам не интересно
      if (a === undefined) {
        continue;
      }
      return a;
    }
  }
}

/**
 * Создает словарь по блоку с таблицей терминов
 *
 * @param {Asciidoctor.Block} block Asciidoctor.Block с таблицей в два столбца: Термин - Определение
 * @returns {{string: string}} Key<String>-Value<String> словарик с собранными Терминами
 */
function createDictionary(block) {
  const dictionary = {};
  block.rows.body.forEach((row) => {
    let term = row[0].text;
    let definition = row[1].text;
    dictionary[term] = definition;
  });

  return dictionary;
}

/**
 * Из словарика собирает массив Терминов
 *
 * @param {{string: string}} dictionary
 * @returns {Array<Termin>}
 */
function createArrayOfTermins(dictionary) {
  let array = new Array();
  for (let key in dictionary) {
    array.push(new Termin(key, dictionary[key]));
  }

  for (let i = 0; i < array.length; i++) {
    for (let j = 0; j < array.length; j++) {
      // Если это тот же термин, то скипаем
      if (array[i] === array[j]) continue;

      let iWords = array[i].termin.split(" ");
      let jWords = array[j].termin.split(" ");

      // Если в I Термине больше слов, чем в J Термине, вхождения быть не может
      if (iWords.length > jWords.length) continue;

      let k = 0;
      let m = 0;
      let result = false;
      while (true) {
        if (!jWords[k] || !iWords[m]) break;

        if (jWords[k] != iWords[m]) {
          if (result === true) {
            result = false;
            break;
          }
          k++;
          continue;
        }

        m++;
        k++;
        result = true;
      }

      if (result === false) continue;

      // k - это индекс последнего слова I в J плюс единица
      // k-iWord.lengh - это последний индекс в J перед словом I
      // k-iWord.lengh - это длина массива J перед словом I
      // jWord.lengh-k - это длина массива J после слова I

      biggerT = {
        termin: array[j],
        before: k - iWords.length,
        after: jWords.length - k,
      };

      smallerT = {
        termin: array[i],
        before: k - iWords.length,
        after: jWords.length - k,
      };

      array[i].addBiggerTermin(biggerT.termin, biggerT.before, biggerT.after);
      array[j].addSmallerTremin(
        smallerT.termin,
        smallerT.before,
        smallerT.after
      );
    }
  }
  // Возвращаем массив только тех терминов, которые не имеют входящих в себя других терминов,
  // т.е. эти термины или сами лежат в тексте, или лежат те, в которые они входят
  return array.filter((t) => t.smaller.length === 0);
}

/**
 * Поиск термина в HTMLElement
 * @param {Array<Termin>} termins
 * @param {HTMLElement} element
 */
function findTerminInElement(termins, element) {
  let words = element.innerText.split(" ");
  for (let i = 0; i < words.length; i++) {
    for (let t = 0; t < termins.length; t++) {
      if (termins[t].termin.split(" ")[0] === words[i]) {
        words[i] = words[i].toUpperCase();
      }
    }
  }
}

/**
 *
 * @param {{termin: Termin, before: Number, after: Number}} termin
 * @param {{start: Number, end: Number}} smallerWordIndexes Индексы найденного малого слова в массиве words
 * @param {Array<String>} words
 *
 * @returns {{capturedTermin: Termin, startIndexOfTermin: Number, endIndexOfTermin: Number}}
 */
function checkBiggerTermins(termin, smallerWordIndexes, words) {
  let startTerminIndex = smallerWordIndexes.start - termin.before;
  let endTerminIndex = smallerWordIndexes.end + termin.after;
  let tIndex = 0;
  for (let i = startTerminIndex; i <= endTerminIndex; i++) {
    if (!words[i]) return;
    if (
      words[i].replace(/(^,)|(,$)/g, "") !==
      termin.termin.termin.split(" ")[tIndex]
    ) {
      return;
    }
    tIndex++;
  }

  if (termin.termin.bigger.length !== 0) {
    for (let j = 0; j < termin.termin.bigger.length; j++) {
      let bigger = checkBiggerTermins(
        termin.termin.bigger[j],
        { start: startTerminIndex, end: endTerminIndex },
        words
      );

      if (bigger) return bigger;
    }
  }

  return {
    capturedTermin: termin.termin,
    startIndexOfTermin: startTerminIndex,
    endIndexOfTermin: endTerminIndex,
  };
}

/**
 * Проставляет <abbr/> теги определениям из таблицы "Термины и сокращения"
 *
 * @param {Asciidoctor.Document} doc Объект Документа ascidoctor.js
 * @param {String} output HTML документ в виде строки
 * @returns {String} Строка с HTML документом, где заменены термины
 */
function replaceBySplitString(doc, output) {
  // Находим таблицу с определениями
  let tab = blockById(doc);
  if (tab === undefined) {
    return output;
  }

  // Собираем из нее словарь
  var dict = createDictionary(tab);

  // Собираем массив - "Умный словарь"
  var arr = createArrayOfTermins(dict);
  console.log(arr);

  let parser = new DOMParser();
  // let parsedOutput = parser.parseFromString(output, "text/html");

  // Разделяем output на 3 части - до таблицы, таблицу, после таблицы, чтобы регуляркой не обернуть в <abbr> определения в самой таблице
  const tableFirstIndex = output.indexOf('id="tnc"'); // Индекс начала таблицы определения
  const tableLastIndex = output.indexOf("</table>", tableFirstIndex + 1); // Индекс окончания таблицы отпределений

  const beforeTableOutput = output.substring(0, tableFirstIndex); // output до таблицы
  const tableOutput = output.substring(tableFirstIndex, tableLastIndex); // output самой таблицы
  const afterTableOutput = output.substring(tableLastIndex); // output самой таблицы

  let parsedOutput = parser.parseFromString(afterTableOutput, "text/html");

  parsedOutput.querySelectorAll("p").forEach((e) => {
    let words = e.innerText.split(" ");
    for (let i = 0; i < words.length; i++) {
      for (let t = 0; t < arr.length; t++) {
        // TODO: Доработать поиск, когда первый термин состоит из нескольки слов
        if (words[i].replace(/(^,)|(,$)/g, "") === arr[t].termin) {
          let findBigger = false;
          if (arr[t].bigger.length !== 0) {
            for (let k = 0; k < arr[t].bigger.length; k++) {
              let fun = checkBiggerTermins(
                arr[t].bigger[k],
                { start: i, end: i },
                words
              );
              if (fun === undefined) continue;
              console.log(
                `Нашел ${fun.capturedTermin.termin} от ${fun.startIndexOfTermin} до ${fun.endIndexOfTermin}`
              );
              findBigger = true;
              break;
            }
          }
          if (!findBigger) console.log(`Нашел ${arr[t].termin} в ${words}`);
        }
      }
    }
  });

  // const treeWalker = document.createTreeWalker(
  //   parsedOutput,
  //   NodeFilter.SHOW_TEXT,
  // );
  // while (treeWalker.nextNode()) {
  //   const node = treeWalker.currentNode;
  //   node.data = node.data.toUpperCase();
  // }

  output = parsedOutput.documentElement.innerHTML;
  return "".concat(beforeTableOutput, tableOutput, afterTableOutput);
}

function replaceByRegExp(doc, output) {
  // Находим таблицу с определениями
  let tab = blockById(doc);
  if (tab === undefined) {
    return output;
  }

  // Собираем из нее словарь
  var dict = createDictionary(tab);

  // Разделяем output на 3 части - до таблицы, таблицу, после таблицы, чтобы регуляркой не обернуть в <abbr> определения в самой таблице
  const tableFirstIndex = output.indexOf('id="tnc"'); // Индекс начала таблицы определения
  const tableLastIndex = output.indexOf("</table>", tableFirstIndex + 1); // Индекс окончания таблицы отпределений

  beforeTableOutput = output.substring(0, tableFirstIndex); // output до таблицы
  tableOutput = output.substring(tableFirstIndex, tableLastIndex); // output самой таблицы
  afterTableOutput = output.substring(tableLastIndex); // output самой таблицы

  // Для каждого определения через регулярку прогоняем output
  for (let key in dict) {
    var regex = new RegExp(key, "g");
    title = '<abbr title="' + dict[key] + '">' + key + "</abbr>";
    console.log(regex, title);
    // output = output.replace(regex, title);
    beforeTableOutput = beforeTableOutput.replace(regex, title);
    afterTableOutput = afterTableOutput.replace(regex, title);
  }
  // return output;
  return beforeTableOutput + tableOutput + afterTableOutput;
}

// TODO: Необходимо сделать так, чтобы вхождение меньшего термина в большее не влияло на работу "Кошелек" -x-> "Кошелек Заблокированый"

// Проставляет по тексту <abbr> теги для обозначения терминов
function tncPostprocessor(registry) {
  registry.postprocessor(function () {
    var self = this;
    self.process(function (doc, output) {
      let o = replaceBySplitString(doc, output);
      return o;
    });
  });
}
