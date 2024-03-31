// Ищет блок в структуре Asciidoctor.Block 
function blockById(block) {
  // Текущий блок существует
  if (block === undefined) {
    return
  }
  // Это Блок, который нам нужен
  if (block.id == "tnc") {
    return block;
  }
  // Есть ли у этого блока дети?
  if (block.blocks.length == 0) {
    return
  } else {
    // Тогда идем по ним рекурсией
    for (let b of block.blocks) {
      let a = blockById(b);
      // Если вернулся не объект - значит нам не интересно
      if (a === undefined) {
        continue
      } 
      return a
    }
  }
}

// Создает словарь по блоку с таблицей терминов
// Метод рассчитан на двуколоночную таблицу, где первый столбец - термины, а второй - определения
function createDictionary(doc) {
  dictionary = {};
  doc.rows.body.forEach((row) => {
    let term = row[0].text;
    let definition = row[1].text;
    dictionary[term] = definition;
  });

  return dictionary;
}

// TODO: Необходимо сделать так, чтобы вхождение меньшего термина в большее не влияло на работу "Кошелек" -x-> "Кошелек Заблокированый"

// Проставляет по тексту <abbr> теги для обозначения терминов
function tncPostprocessor(registry) {
  registry.postprocessor(function () {
    var self = this;
    self.process(function (doc, output) {

      // Находим таблицу с определениями
      tab = blockById(doc);
      if (tab === undefined) {
        return output;
      }

      // Собираем из нее словарь
      dict = createDictionary(tab);

      // Разделяем output на 3 части - до таблицы, таблицу, после таблицы, чтобы регуляркой не обернуть в <abbr> определения в самой таблице
      tableFirstIndex = output.indexOf("id=\"tnc\"") // Индекс начала таблицы определения
      tableLastIndex = output.indexOf("</table>", tableFirstIndex+1) // Индекс окончания таблицы отпределений

      beforeTableOutput = output.substring(0, tableFirstIndex); // output до таблицы
      tableOutput = output.substring(tableFirstIndex, tableLastIndex); // output самой таблицы
      afterTableOutput = output.substring(tableLastIndex); // output самой таблицы

      // Для каждого определения через регулярку прогоняем output
      for (let key in dict) {
        var regex = new RegExp(key,"g");
        title = "<abbr title=\""+dict[key]+"\">"+key+"</abbr>";
        console.log(regex, title)
        // output = output.replace(regex, title);
        beforeTableOutput = beforeTableOutput.replace(regex, title);
        afterTableOutput = afterTableOutput.replace(regex, title);
      }
      // return output;
      return beforeTableOutput + tableOutput + afterTableOutput
    });
  });
}
