// script.js
const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

let ANSWERS = [];
let ALLOWED = [];

let secret = "";
let row = 0;
let col = 0;
let isOver = false;
const guesses = Array.from({ length: MAX_GUESSES }, () => Array(WORD_LENGTH).fill(""));

const gridEl = document.getElementById("grid");
const statusEl = document.getElementById("status");

// Popup elements
const popupEl = document.getElementById("popup");
const popupTextEl = document.getElementById("popupText");
const popupOkBtn = document.getElementById("popupOk");

let popupActive = false;

function setStatus(msg){
  statusEl.textContent = msg;
}

/* ---------- POPUP ---------- */
function showPopup(message, type = "warn"){
  popupTextEl.textContent = message;

  const card = popupEl.querySelector(".popup-card");
  card.classList.remove("warn","win","lose");
  card.classList.add(type, "flash");

  popupEl.classList.remove("hidden");
  popupActive = true;
  popupOkBtn.focus();
}

function hidePopup(){
  const card = popupEl.querySelector(".popup-card");
  card.classList.remove("flash","warn","win","lose");
  popupEl.classList.add("hidden");
  popupActive = false;
}

popupOkBtn.addEventListener("click", hidePopup);
window.addEventListener("keydown", (e) => {
  if (!popupActive) return;
  if (e.key === "Enter" || e.key === "Escape") hidePopup();
});

/* ---------- GRID ---------- */
function buildGrid(){
  gridEl.innerHTML = "";
  for (let r = 0; r < MAX_GUESSES; r++){
    const rowEl = document.createElement("div");
    rowEl.className = "row";
    for (let c = 0; c < WORD_LENGTH; c++){
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.id = `tile-${r}-${c}`;
      rowEl.appendChild(tile);
    }
    gridEl.appendChild(rowEl);
  }
}
buildGrid();

/* ---------- KEYBOARD ---------- */
const KB = [
  ["q","w","e","r","t","y","u","i","o","p"],
  ["a","s","d","f","g","h","j","k","l"],
  ["enter","z","x","c","v","b","n","m","back"]
];

function buildKeyboard(){
  KB.forEach((keys, idx) => {
    const rowEl = document.getElementById(`kb-row-${idx+1}`);
    rowEl.innerHTML = "";
    keys.forEach(k => {
      const btn = document.createElement("button");
      btn.className = "key" + ((k === "enter" || k === "back") ? " wide" : "");
      btn.textContent = (k === "back") ? "⌫" : k;
      btn.dataset.key = k;
      btn.addEventListener("click", () => handleKey(k));
      rowEl.appendChild(btn);
    });
  });
}
buildKeyboard();

function keyButtonsFor(letter){
  return Array.from(document.querySelectorAll(`.key[data-key="${letter.toLowerCase()}"]`));
}

/* ---------- WORD LIST PARSER (BULLETPROOF) ---------- */
function parseWordFile(text){
  // Extract ANY 5-letter alphabetic words from any format (CSV/JSON/newlines)
  const matches = text.match(/[a-zA-Z]{5}/g) || [];
  return matches.map(w => w.toUpperCase());
}

/* ---------- TILE UI ---------- */
function updateTile(r, c){
  const tile = document.getElementById(`tile-${r}-${c}`);
  const letter = guesses[r][c];
  tile.textContent = letter;

  if (letter) {
    tile.classList.add("filled", "pop");
    tile.addEventListener("animationend", () => tile.classList.remove("pop"), { once: true });
  } else {
    tile.classList.remove("filled");
  }
}

function currentGuess(){
  return guesses[row].join("");
}

/* ---------- SCORING ---------- */
function scoreGuess(guess, answer){
  const result = Array(WORD_LENGTH).fill("wrong");
  const answerArr = answer.split("");

  // correct
  for (let i = 0; i < WORD_LENGTH; i++){
    if (guess[i] === answerArr[i]){
      result[i] = "correct";
      answerArr[i] = null;
    }
  }
  // present
  for (let i = 0; i < WORD_LENGTH; i++){
    if (result[i] === "correct") continue;
    const idx = answerArr.indexOf(guess[i]);
    if (idx !== -1){
      result[i] = "present";
      answerArr[idx] = null;
    }
  }
  return result;
}

function updateKeyboardColor(letter, state){
  const buttons = keyButtonsFor(letter.toLowerCase());
  buttons.forEach(btn => {
    const c = btn.classList;
    if (state === "correct") {
      c.remove("present","wrong");
      c.add("correct");
    } else if (state === "present") {
      if (!c.contains("correct")) {
        c.remove("wrong");
        c.add("present");
      }
    } else {
      if (!c.contains("correct") && !c.contains("present")) {
        c.add("wrong");
      }
    }
  });
}

function paintResultsFlip(r, guess, result){
  for (let i = 0; i < WORD_LENGTH; i++){
    const tile = document.getElementById(`tile-${r}-${i}`);

    setTimeout(() => {
      tile.classList.add("flip");

      setTimeout(() => {
        tile.classList.add(result[i]);
        updateKeyboardColor(guess[i], result[i]);
      }, 300);

      tile.addEventListener("animationend", () => tile.classList.remove("flip"), { once: true });
    }, i * 180);
  }
}

/* ---------- INPUT ---------- */
function addLetter(ch){
  if (isOver || popupActive) return;
  if (col >= WORD_LENGTH) return;
  guesses[row][col] = ch.toUpperCase();
  updateTile(row, col);
  col++;
}

function backspace(){
  if (isOver || popupActive) return;
  if (col <= 0) return;
  col--;
  guesses[row][col] = "";
  updateTile(row, col);
}

function submit(){
  if (isOver || popupActive) return;

  if (col < WORD_LENGTH){
    showPopup("❗ Not enough letters! Try a 5-letter word.", "warn");
    return;
  }

  const guess = currentGuess().toUpperCase();

  // check allowed
  if (!ALLOWED.includes(guess)){
    showPopup("📚 Not in the word list! Try another word.", "warn");
    return;
  }

  const result = scoreGuess(guess, secret);
  paintResultsFlip(row, guess, result);

  if (guess === secret){
    setTimeout(() => {
      showPopup("🎉 YOU WIN! 🎉 Refresh to play again!", "win");
    }, 1200);
    isOver = true;
    return;
  }

  row++;
  col = 0;

  if (row >= MAX_GUESSES){
    setTimeout(() => {
      showPopup(`😢 Game over! The word was ${secret}`, "lose");
    }, 1200);
    isOver = true;
    return;
  }
}

function handleKey(key){
  if (popupActive) return;
  if (key === "enter") return submit();
  if (key === "back") return backspace();
  if (/^[a-z]$/i.test(key)) return addLetter(key);
}

window.addEventListener("keydown", (e) => {
  if (popupActive) return;
  if (isOver) return;

  if (e.key === "Enter") return submit();
  if (e.key === "Backspace") return backspace();

  const k = e.key.toLowerCase();
  if (k.length === 1 && k >= "a" && k <= "z") addLetter(k);
});

/* ---------- LOAD WORD LISTS ---------- */
async function loadWordLists(){
  const [answersText, allowedText] = await Promise.all([
    fetch("answers.txt").then(r => r.text()),
    fetch("allowed.txt").then(r => r.text()),
  ]);

  ANSWERS = parseWordFile(answersText);
  const allowedFromFile = parseWordFile(allowedText);

  // allowed should include answers too
  const set = new Set([...allowedFromFile, ...ANSWERS]);
  ALLOWED = Array.from(set);

  // pick secret from ANSWERS
  secret = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];

  console.log("Answers:", ANSWERS.length, "Allowed:", ALLOWED.length);
  console.log("Has GIVEN?", ALLOWED.includes("GIVEN"));

  setStatus("Type a 5-letter word");
}

loadWordLists().catch(() => {
  showPopup("Couldn't load word lists. Use Live Server (fetch needs a local server).", "warn");
});
