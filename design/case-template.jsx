// Шаблон эскиза кейса vsetak.studio.
// Одна полоса = один экран сайта 1440×900 px, сетка страницы кейса: 12 колонок,
// поля 32 px, средник 20 px. Имя фрейма (панель Layers) = тип блока из app/cases.ts.
#target indesign

(function () {
  var W = 1440, H = 900;
  var ML = 32, MR = 32, MT = 24, MB = 24;
  var COLS = 12, GUT = 20;
  var colW = (W - ML - MR - GUT * (COLS - 1)) / COLS;

  function colX(col) { return ML + (col - 1) * (colW + GUT); }
  function spanW(span) { return span * colW + (span - 1) * GUT; }

  var doc = app.documents.add();
  doc.viewPreferences.horizontalMeasurementUnits = MeasurementUnits.PIXELS;
  doc.viewPreferences.verticalMeasurementUnits = MeasurementUnits.PIXELS;
  doc.viewPreferences.rulerOrigin = RulerOrigin.PAGE_ORIGIN;

  try { doc.documentPreferences.intent = DocumentIntentOptions.WEB_INTENT; } catch (e) {}
  doc.documentPreferences.facingPages = false;
  doc.documentPreferences.pageWidth = W;
  doc.documentPreferences.pageHeight = H;
  doc.documentPreferences.pagesPerDocument = 4;

  var margins = {
    top: MT, bottom: MB, left: ML, right: MR,
    columnCount: COLS, columnGutter: GUT
  };
  doc.masterSpreads[0].pages.everyItem().marginPreferences.properties = margins;
  doc.pages.everyItem().marginPreferences.properties = margins;

  function rgb(name, values) {
    var c = doc.colors.itemByName(name);
    if (c.isValid) return c;
    return doc.colors.add({
      name: name, model: ColorModel.PROCESS, space: ColorSpace.RGB, colorValue: values
    });
  }
  var paper = rgb("vsetak Бумага", [249, 249, 248]);
  var block = rgb("vsetak Блок", [240, 239, 236]);
  var muted = rgb("vsetak Подпись", [104, 102, 95]);
  var ink = rgb("vsetak Чернила", [24, 24, 21]);
  var none = doc.swatches.itemByName("None");

  function font(names) {
    for (var i = 0; i < names.length; i++) {
      if (app.fonts.itemByName(names[i]).isValid) return names[i];
    }
    return null;
  }
  var sans = font(["Inter\tMedium", "Inter\tRegular", "Helvetica Neue\tMedium", "Helvetica Neue\tRegular"]);
  var serif = font(["Source Serif 4\tRegular", "Source Serif Pro\tRegular", "Times New Roman\tRegular"]);

  var blocksLayer = doc.layers[0];
  blocksLayer.name = "Блоки";
  var hintsLayer = doc.layers.add({ name: "Подсказки", printable: false });

  doc.pages.everyItem().appliedMaster = doc.masterSpreads[0];

  function label(page, text, x, y, w, size, color, face) {
    var t = page.textFrames.add({
      itemLayer: hintsLayer,
      geometricBounds: [y, x, y + size * 3, x + w],
      contents: text
    });
    var story = t.texts[0];
    story.pointSize = size;
    story.fillColor = color || muted;
    if (face) story.appliedFont = face;
    return t;
  }

  // Фрейм-блок: имя и Script Label = тип блока, по ним эскиз читается обратно.
  function box(page, name, col, span, y, h, caption) {
    var x = colX(col), w = spanW(span);
    var r = page.rectangles.add({
      itemLayer: blocksLayer,
      geometricBounds: [y, x, y + h, x + w],
      fillColor: block,
      strokeColor: none,
      strokeWeight: 0
    });
    r.name = name;
    r.label = name;
    if (caption) label(page, caption, x + 12, y + 10, Math.max(w - 24, 60), 11, muted, sans);
    return r;
  }

  var p = doc.pages;

  // Полоса 1 — стандартный порядок кейса
  label(p[0], "Шаблон кейса vsetak.studio · 1 полоса = 1 экран 1440×900 · имя фрейма = тип блока", ML, 4, spanW(12), 10, muted, sans);
  box(p[0], "hero", 1, 7, 60, 110, "hero · заголовок кейса (колонки 1–7)");
  box(p[0], "hero", 8, 5, 60, 110, "hero · лид (колонки 8–12)");
  box(p[0], "facts", 1, 2, 190, 50, "facts · клиент (1–2)");
  box(p[0], "facts", 3, 1, 190, 50, "год (3)");
  box(p[0], "facts", 4, 5, 190, 50, "роль в одну строку (4–8)");
  box(p[0], "facts", 9, 4, 190, 50, "статус · ссылка");
  box(p[0], "gallery", 1, 12, 260, 380, "gallery · листалка: картинки, видео, лендинг");
  box(p[0], "sections", 1, 3, 670, 150, "sections · заголовок (1–3)");
  box(p[0], "sections", 4, 7, 670, 150, "sections · Задача / Решение / Результат (колонки 4–10)");

  // Полоса 2 — медиа
  box(p[1], "media-full", 1, 12, 40, 300, "media · full — вся ширина");
  box(p[1], "media-wide", 4, 9, 370, 220, "media · wide — колонки 4–12");
  box(p[1], "grid-2", 1, 6, 620, 180, "grid · 2 колонки");
  box(p[1], "grid-2", 7, 6, 620, 180, "grid · 2 колонки");

  // Полоса 3 — сетка из трёх, текст, цитата, лендинг
  box(p[2], "grid-3", 1, 4, 40, 200, "grid · 3 колонки");
  box(p[2], "grid-3", 5, 4, 40, 200, "grid · 3 колонки");
  box(p[2], "grid-3", 9, 4, 40, 200, "grid · 3 колонки");
  box(p[2], "text", 4, 7, 280, 120, "text · абзац с необязательным заголовком (колонки 4–10)");
  box(p[2], "quote", 4, 7, 430, 120, "quote · цитата и автор (колонки 4–10)");
  box(p[2], "divider", 1, 12, 590, 1, null);
  box(p[2], "media-embed", 1, 12, 620, 240, "media · embed — лендинг в iframe, ссылка в Script Label");

  // Полоса 4 — пустой экран под эскиз
  label(p[3], "Экран кейса — дублируйте полосу и собирайте из блоков выше", ML, 4, spanW(12), 10, muted, sans);

  if (serif) {
    try { doc.paragraphStyles.add({ name: "Кейс · заголовок", appliedFont: serif, pointSize: 62, leading: 60, fillColor: ink }); } catch (e) {}
    try { doc.paragraphStyles.add({ name: "Кейс · текст", appliedFont: serif, pointSize: 21, leading: 29, fillColor: ink }); } catch (e) {}
  }
  if (sans) {
    try { doc.paragraphStyles.add({ name: "Кейс · подпись", appliedFont: sans, pointSize: 11, leading: 16, fillColor: muted, capitalization: Capitalization.ALL_CAPS, tracking: 80 }); } catch (e) {}
  }

  var target = File("~/Documents/_Porfolio/_Сборка портфолио/Шаблон кейса vsetak.indd");
  if (!target.exists) doc.save(target);
})();
