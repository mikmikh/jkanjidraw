import { matchStroke } from "./lib/kanji.js";
import { classifyStroke, JStrokeControls } from "./lib/strokes.js";

// SELECTORS
const referenceIdxEl = document.querySelector("#reference-idx");
const referenceKanjiEl = document.querySelector("#reference-kanji");
const referenceKunEl = document.querySelector("#reference-kun");
const referenceOnEl = document.querySelector("#reference-on");
const referenceDescriptionEl = document.querySelector("#reference-description");
const referenceImgEl = document.querySelector("#reference-img");
const canvasEl = document.querySelector("#canvas");
const outputEl = document.querySelector("#output");
const btnNext = document.querySelector("#btn-next");
btnNext.addEventListener("click", () => changeKanji(1));
const btnPrev = document.querySelector("#btn-prev");
btnPrev.addEventListener("click", () => changeKanji(-1));
const btnClear = document.querySelector("#btn-clear");
btnClear.addEventListener("click", () => resetKanji());
const ctx = canvasEl.getContext("2d");
const strokeControls = new JStrokeControls(canvasEl);
strokeControls.activate();
const rect = canvasEl.getBoundingClientRect();

const CONTEXT = {
  grades: ["g1", "g2", "g3"],
  grade: 0,
  grade2kanjis: {},
  kanji: 0,
  si: 0,
  prevPoint: null,
};
strokeControls.onStart = (p) => {
  CONTEXT.prevPoint = p;
  outputEl.innerHTML = "";
};
strokeControls.onMove = (p) => {
  if (!CONTEXT.prevPoint) {
    return;
  }
  drawLine(CONTEXT.prevPoint, p);
  CONTEXT.prevPoint = p;
};
strokeControls.onEnd = () => {
  CONTEXT.prevPoint = null;
};
function changeKanji(offset = 1) {
  const { kanji: ki, grade: gi, grades, grade2kanjis } = CONTEXT;
  const grade = grades[gi];
  const kanjis = grade2kanjis[grade];

  CONTEXT.kanji = Math.min(kanjis.length - 1, Math.max(0, ki + offset));
  selectKanjiEl.value = CONTEXT.kanji;
  renderKanji();
}
function normalizePos(p) {
  return {
    x: p.x * rect.width,
    y: p.y * rect.height,
  };
}
function drawLine(p0, p1) {
  p0 = normalizePos(p0);
  p1 = normalizePos(p1);
  ctx.save();
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#BC002D";
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.stroke();
  ctx.closePath();
  ctx.restore();
}

function drawPoints(points, ctx) {
  ctx.save();

  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#333";

  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const pos = points[i];
    if (i === 0) {
      ctx.moveTo(pos.x, pos.y);
    } else {
      ctx.lineTo(pos.x, pos.y);
    }
  }
  ctx.stroke();

  ctx.closePath();

  ctx.restore();
}

// Loaders
async function loadJson(url) {
  const resp = await fetch(url);
  const data = await resp.json();
  return data;
}
async function loadText(url) {
  const resp = await fetch(url);
  const data = await resp.text();
  return data;
}
async function loadGradeData(grade) {
  const url = `../assets/${grade}/data.json`;
  return loadJson(url);
}
async function loadKanjiSvg(grade, kanji) {
  const url = `../assets/${grade}/${kanji}.svg`;
  return loadText(url);
}

// render
const selectKanjiEl = document.getElementById("select-kanji");
const selectGradesEl = document.getElementById("select-grade");

function initGradesSelect() {
  const { grades } = CONTEXT;
  selectGradesEl.innerHTML = "";
  selectGradesEl.value = 0;
  const grade_descriptions = ["easy", "medium", "hard"];
  grades.forEach((grade, gi) => {
    const option = document.createElement("option");
    option.value = gi;
    option.textContent = `${gi + 1}` + (gi <= grade_descriptions.length ? ` ${grade_descriptions[gi]}` : '');
    if (gi == 0) {
      option.selected = true;
    }
    selectGradesEl.append(option);
  });
}
async function initKanjiSelect() {
  const { grade, grades, grade2kanjis } = CONTEXT;
  const kanjis = grade2kanjis[grades[grade]];
  selectKanjiEl.innerHTML = "";
  selectKanjiEl.value = 0;
  kanjis.forEach((kanji, ki) => {
    const option = document.createElement("option");
    option.value = ki;
    option.textContent = kanji.kanji + " - " + kanji.meaning.slice(0, 16);
    if (ki == 0) {
      option.selected = true;
    }
    selectKanjiEl.append(option);
  });
}
// event listeners
selectGradesEl.addEventListener("change", () => {
  const gi = selectGradesEl.value;
  CONTEXT.grade = gi;
  initKanjiSelect();
  renderKanji();
});
selectKanjiEl.addEventListener("change", () => {
  const ki = selectKanjiEl.value;
  CONTEXT.kanji = ki;
  renderKanji();
  renderKanji();
});

async function loadData() {
  const { grades, grade2kanjis } = CONTEXT;
  const datas = await Promise.all(grades.map((grade) => loadGradeData(grade)));
  datas.forEach((data, di) => {
    grade2kanjis[grades[di]] = data;
  });
}

async function renderKanji() {
  const { kanji: ki, grade: gi, grades, grade2kanjis } = CONTEXT;
  const grade = grades[gi];
  const kanji = grade2kanjis[grade][ki];

  referenceIdxEl.textContent = `[${ki + 1}/${grade2kanjis[grade].length}]`;
  referenceKanjiEl.textContent = kanji.kanji;
  referenceKunEl.innerHTML = kanji.kun;
  referenceOnEl.innerHTML = kanji.on;
  referenceDescriptionEl.innerHTML = kanji.meaning;
  referenceImgEl.innerHTML = "";
  try {
    const svgText = await loadKanjiSvg(grade, kanji.kanji);
    referenceImgEl.innerHTML = svgText;
  } catch {
    referenceImgEl.innerHTML = "";
  }
  resetKanji();
}
function resetKanji() {
  CONTEXT.si = 0;
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
}
strokeControls.onStroke = (data) => {
  const { kanji: ki, grade: gi, grades, grade2kanjis } = CONTEXT;
  const grade = grades[gi];
  const kanji = grade2kanjis[grade][ki];

  const npoints = data.points.map((p) => normalizePos(p));
  drawPoints(npoints, ctx);
  outputEl.textContent = classifyStroke(data);

  const directions = data.directions;
  const reference = kanji.directions[CONTEXT.si];
  const matched = matchStroke(directions, reference);
  console.log("directions", directions);
  console.log("reference", reference);
  console.log("matched", matched);
  if (!matched) {
    resetKanji();
    return;
  }
  CONTEXT.si++;
  if (CONTEXT.si >= kanji.directions.length) {
    alert("Correct!");
    CONTEXT.si = 0;
  }
};

async function main() {
  await loadData();
  initGradesSelect();
  initKanjiSelect();
  renderKanji();
}

main();
