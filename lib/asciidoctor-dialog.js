class Termin {
  // Термин
  #termin;

  // Определение
  #description;

  // Массив терминов, в которое входит текущий
  #bigger;

  constructor(termin, description) {
    this.#termin = termin;
    this.#description = description;
    this.#bigger = new Array();
  }

  get termin() {
    return this.#termin;
  }

  get description() {
    return this.#description;
  }

  addBiggerTermin(termin, wordBefore, wordAfter) {
    var biggerTermin = {
      termin: termin,
      before: wordBefore,
      after: wordAfter,
    };
    this.#bigger.push(biggerTermin);
  }
}

// Ищет блок в структуре Asciidoctor.Block
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

// Создает словарь по блоку с таблицей терминов
// Метод рассчитан на двуколоночную таблицу, где первый столбец - термины, а второй - определения
function createDictionary(doc) {
  const dictionary = {};
  doc.rows.body.forEach((row) => {
    let term = row[0].text;
    let definition = row[1].text;
    dictionary[term] = definition;
  });

  return dictionary;
}

function createArrayOfTermins(dictionary) {
  let arr = new Array();
  // Проходим по словарю
  for (let i in dictionary) {
    let termin = new Termin(i, dictionary[i]);
    // Для каждого термина снова проходим по словарю, чтобы собрать термины, в которые входит текущий
    for (let j in dictionary) {
      // Если это тот же термин, то скипаем итерацию
      if (j === i) {
        continue;
      }
      let jWords = j.split(" ");
      for (let k = 0; k < jWords.length; k++) {
        if (jWords[k] === i) {
          let biggerTermin = {
            termin: new Termin(j, dictionary[j]),
            before: k,
            after: jWords.length - 1 - k,
          };
          termin.addBiggerTermin(
            biggerTermin.termin,
            biggerTermin.before,
            biggerTermin.after
          );
          break;
        }
      }
    }
    arr.push(termin);
  }
  return arr;
}

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

  // let outputWords = output.split(" ");
  // for (let i = 0; i < outputWords.length; i++) {
  //   for (let j = 0; j < arr.length; j++) {
  //     if (outputWords[i].includes(arr[j].termin)) {
  //       console.log(outputWords[i], i, arr[j]);
  //     }
  //   }
  // }

  let parser = new DOMParser();
  let parsedOutput = parser.parseFromString(output, "text/html");
  parsedOutput.querySelectorAll("p").forEach((e) => {
    e.innerHTML = e.innerHTML + " 1"
  })
  output = parsedOutput.documentElement.innerHTML;
  return output
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
