class Termin {
  // Термин
  #word;

  // Определение
  #description;

  // Массив терминов, в которые входит текущий Термина
  #bigger;

  // Массив терминов, которые входят в текущий Термин
  #smaller;

  constructor(word, description) {
    this.#word = word;
    this.#description = description;
    this.#bigger = new Array();
    this.#smaller = new Array();
  }

  /**
   * @returns {String} Термин
   */
  get word() {
    return this.#word;
  }

  /**
   * @returns {String} Определение термина
   */
  get description() {
    return this.#description;
  }

  /**
   * @returns {Array<{termin: Termin, before: Number, after: Number}>} Массив объектов с Терминами, в которые входит текущий Термин 
   * _before_ - количество слов слева от текущего Термина, 
   * _after_ - колчиество слов справа от текущего термина
   */
  get bigger() {
    return this.#bigger;
  }
  /**
   * @returns {Array<{termin: Termin, before: Number, after: Number}>} Массив объектов с Терминами, которые входят в текущий Термин 
   * _before_ - количество слов слева до текущего Термина, 
   * _after_ - колчиество слов справа до текущего термина
   */
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
 * Ищет блок в структуре Asciidoctor.Document или Asciidoctor.Block Block с заданным идентификатором
 * 
 * @param {Asciidoctor.Document | Asciidoctor.Block} block
 * @param {String} blockId Идентификатор таблицы с определениями
 * @returns {Asciidoctor.Block}
 */
function blockById(block, blockId) {
  // Текущий блок существует
  if (block === undefined) {
    return;
  }
  // Это Блок, который нам нужен
  if (block.id === blockId) {
    return block;
  }
  // Есть ли у этого блока дети?
  if (block.blocks.length === 0) {
    return;
  } else {
    // Тогда идем по ним рекурсией
    for (let b of block.blocks) {
      let a = blockById(b, blockId);
      // Если вернулся не объект - значит нам не интересно
      if (a === undefined) {
        continue;
      }
      return a;
    }
  }
}

/**
 * Создает простой словарь по блоку с таблицей терминов
 *
 * @param {Asciidoctor.Block} block Asciidoctor.Block с таблицей в два столбца: Термин - Определение
 * @returns {{String: String}} Key<String>-Value<String> словарик с собранными Терминами
 */
function createDictionary(block) {
  const dictionary = {};
  block.rows.body.forEach((row) => {
    let word = row[0].text;
    let definition = row[1].text;
    dictionary[word] = definition;
  });

  return dictionary;
}

/**
 * Из простого словаря собирает массив Терминов
 *
 * @param {{string: string}} dictionary
 * @returns {Array<Termin>}
 */
function createArrayOfTermins(dictionary) {
  let terminsArray = new Array();
  for (let key in dictionary) {
    terminsArray.push(new Termin(key, dictionary[key]));
  }

  for (let i = 0; i < terminsArray.length; i++) {
    for (let j = 0; j < terminsArray.length; j++) {
      // Если это тот же термин, то скипаем
      if (terminsArray[i] === terminsArray[j]) continue;

      let iWords = terminsArray[i].word.split(" ");
      let jWords = terminsArray[j].word.split(" ");

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
        termin: terminsArray[j],
        before: k - iWords.length,
        after: jWords.length - k,
      };

      smallerT = {
        termin: terminsArray[i],
        before: k - iWords.length,
        after: jWords.length - k,
      };

      terminsArray[i].addBiggerTermin(
        biggerT.termin,
        biggerT.before,
        biggerT.after
      );
      terminsArray[j].addSmallerTremin(
        smallerT.termin,
        smallerT.before,
        smallerT.after
      );
    }
  }
  // Возвращаем массив только тех терминов, которые не имеют входящих в себя других терминов,
  // т.е. эти термины или сами лежат в тексте, или лежат те, в которые они входят
  return terminsArray.filter((t) => t.smaller.length === 0);
}

/**
 * Находит в списке слов words около найденного меньшего термина больший, в который он входит
 *
 * @param {{termin: Termin, before: Number, after: Number}} biggerTermin Объект термина
 * @param {{start: Number, end: Number}} smallerWordIndexes Индексы найденного малого слова в массиве words
 * @param {Array<String>} words Массив слов, в котором проиходится поиск
 *
 * @returns {{capturedTermin: Termin, startIndexOfTermin: Number, endIndexOfTermin: Number}}
 */
function checkBiggerTermins(biggerTermin, smallerWordIndexes, words) {
  let startTerminIndex = smallerWordIndexes.start - biggerTermin.before;
  let endTerminIndex = smallerWordIndexes.end + biggerTermin.after;
  let tIndex = 0;
  for (let i = startTerminIndex; i <= endTerminIndex; i++) {
    if (!words[i]) return;
    if (
      words[i].replace(/(^,)|(,$)/g, "") !==
      biggerTermin.termin.word.split(" ")[tIndex]
    ) {
      return;
    }
    tIndex++;
  }

  if (biggerTermin.termin.bigger.length !== 0) {
    for (let j = 0; j < biggerTermin.termin.bigger.length; j++) {
      let bigger = checkBiggerTermins(
        biggerTermin.termin.bigger[j],
        { start: startTerminIndex, end: endTerminIndex },
        words
      );

      if (bigger) return bigger;
    }
  }

  return {
    capturedTermin: biggerTermin.termin,
    startIndexOfTermin: startTerminIndex,
    endIndexOfTermin: endTerminIndex,
  };
}

/**
 * Проставляет <abbr/> теги определениям из таблицы "Термины и сокращения" (#tnc)
 *
 * @param {Asciidoctor.Document} doc Объект Документа ascidoctor.js
 * @param {String} output HTML документ в виде строки
 * @param {String} tableId Идентификатор таблицы с определениями
 * @returns {String} Строка с HTML документом, где заменены термины
 */
function setAbbrTagInHTML(doc, output, tableId) {
  // Находим таблицу с определениями
  let terminsTable = blockById(doc, tableId);
  if (terminsTable === undefined) {
    return output;
  }

  // Собираем из нее словарь
  var dictionary = createDictionary(terminsTable);

  // Собираем массив - "Умный словарь"
  var terminsDictionary = createArrayOfTermins(dictionary);

  // Из HTML строки получаем Document
  let parser = new DOMParser();
  let parsedOutput = parser.parseFromString(output, "text/html");

  // Селектор работает на все элементы типа Paragraph, которые не в таблице, из которой мы собираем термины
  parsedOutput.querySelectorAll(`p:not(table#${tableId} p)`).forEach((e) => {
    let words = e.innerText.split(" ");
    var lastReplacableIndexInInnerHTML = 0;
    for (let i = 0; i < words.length; i++) {
      for (let t = 0; t < terminsDictionary.length; t++) {
        let terminWords = terminsDictionary[t].word.split(" ");
        let firstCaptureResult = false;
        let iEnded = i;
        if (terminWords.length > 1) {
          for (let tw = 0; tw < terminWords.length; tw++) {
            if (terminWords[tw] !== words[iEnded].replace(/(^,)|(,$)/g, "")) {
              firstCaptureResult = false;
              break;
            }
            firstCaptureResult = true;
            iEnded++;
          }
        } else if (terminWords.length === 1) {
          if (words[i].replace(/(^,)|(,$)/g, "") === terminsDictionary[t].word) {
            firstCaptureResult = true;
          }
        } else {
          continue
        }

        if (firstCaptureResult) {
          var capturedTermin;
          let findBigger = false;
          if (terminsDictionary[t].bigger.length !== 0) {
            for (let k = 0; k < terminsDictionary[t].bigger.length; k++) {
              let fun = checkBiggerTermins(
                terminsDictionary[t].bigger[k],
                { start: i, end: iEnded },
                words
              );
              if (fun === undefined) continue;
              findBigger = true;
              capturedTermin = fun.capturedTermin;
              i = fun.endIndexOfTermin;
              break;
            }
          }
          if (!findBigger) {
            capturedTermin = terminsDictionary[t];
          }

          let firstWordIntermin = capturedTermin.word.split(" ")[0];
          let lastWordInTermin = capturedTermin.word.split(" ")[capturedTermin.word.split(" ").length - 1];
          // fIndex = Найти индекс первого слова термина в innerHTML начиная с lastReplacableIndexInInnerHTML
          let fIndex = e.innerHTML.indexOf(firstWordIntermin, lastReplacableIndexInInnerHTML);
          // lIndex = Найти индекс последнего слова термина в innerHTML + количество символов в последнем лове термина начиная с lastReplacableIndexInInnerHTML
          let lIndex = e.innerHTML.indexOf(lastWordInTermin, lastReplacableIndexInInnerHTML) + lastWordInTermin.length;
          // Вставка <abbr title="capturedTermin.description"> в fIndex и </abbr> в lIndex в innerHTML
          e.innerHTML = [e.innerHTML.slice(0, fIndex), `<abbr title="${capturedTermin.description}">`, e.innerHTML.slice(fIndex, lIndex), "</abbr>", e.innerHTML.slice(lIndex)].join("");
          // lastReplacableIndexInInnerHTML = lastIndexOf("</abbr>"), чтобы поиск следующего термина в Element был после последней вставки определения
          lastReplacableIndexInInnerHTML = e.innerHTML.lastIndexOf("</abbr>")
          break
        }
      }
    }
  });

  output = parsedOutput.documentElement.innerHTML;
  return output
}

// Проставляет по тексту <abbr> теги для обозначения терминов
function abbrPostprocessor(registry, tableId) {
  registry.postprocessor(function () {
    var self = this;
    self.process(function (doc, output) {
      let outputWithAbbr = setAbbrTagInHTML(doc, output, tableId);
      return outputWithAbbr;
    });
  });
}