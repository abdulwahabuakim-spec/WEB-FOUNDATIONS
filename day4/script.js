const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");

const DRAFT_KEY = "note-draft";
const THEME_KEY = "theme";

function updateCounts() {
  const text = noteText.value;
  const chars = text.length;

  // Word count: trim, split by spaces, filter empty
  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

  charCount.textContent = `${chars} / 200 characters`;
  wordCount.textContent = `${words} words`;

  // Reset classes
  charCount.classList.remove("warning", "over");

  if (chars > 200) {
    charCount.classList.add("over");
  } else if (chars > 180) {
    charCount.classList.add("warning");
  }
}

function saveDraft() {
  localStorage.setItem(DRAFT_KEY, noteText.value);
}

function clearAll() {
  noteText.value = "";
  localStorage.removeItem(DRAFT_KEY);
  updateCounts();
  noteText.focus();
}

// 1. Live input: update + save draft
noteText.addEventListener("input", () => {
  updateCounts();
  saveDraft();
});

// 2. Escape key clears inside textarea
noteText.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    clearAll();
  }
});

// 3. Clear button
clearBtn.addEventListener("click", clearAll);

// 4. Theme toggle
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
});

// 5. On page load: restore draft + theme
const savedDraft = localStorage.getItem(DRAFT_KEY);
if (savedDraft) {
  noteText.value = savedDraft;
}

const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme === "dark") {
  document.body.classList.add("dark");
  themeToggle.textContent = "Light mode";
} else {
  themeToggle.textContent = "Dark mode";
}

updateCounts();