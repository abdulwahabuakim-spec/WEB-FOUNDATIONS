let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report", category: "work" },
  { id: 4, text: "Revise JavaScript arrays and objects", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

function searchNotes(word) {
  const lowerWord = word.toLowerCase().trim();
  return notes.filter((note) => note.text.toLowerCase().includes(lowerWord));
}

function longestNote() {
  if (notes.length === 0) return null;
  let longest = notes[0];
  for (const note of notes) {
    if (note.text.length > longest.text.length) longest = note;
  }
  return longest;
}

function countByCategory() {
  const counts = {};
  for (const note of notes) {
    counts[note.category] = (counts[note.category] || 0) + 1;
  }
  return counts;
}

function getSummary() {
  const counts = countByCategory();
  const total = notes.length;
  if (total === 0) return "0 notes";
  const parts = [];
  for (const cat in counts) parts.push(`${counts[cat]} ${cat}`);
  return `${total} ${total === 1? "note" : "notes"}: ${parts.join(", ")}.`;
}

function isDuplicate(text) {
  const cleaned = text.trim().toLowerCase();
  return notes.some((n) => n.text.trim().toLowerCase() === cleaned);
}

function addNote(text, category) {
  const cleaned = text.trim();
  const valid = ["personal", "work", "study"];
  if (cleaned.length < 1 || cleaned.length > 200) {
    console.log(`❌ Not added - text must be 1-200 chars`);
    return false;
  }
  if (!valid.includes(category)) {
    console.log(`❌ Not added - category must be personal, work or study`);
    return false;
  }
  if (isDuplicate(text)) {
    console.log(`❌ Not added - duplicate: "${cleaned}"`);
    return false;
  }
  notes.push({ id: Date.now(), text: cleaned, category });
  console.log(`✅ Added: "${cleaned}"`);
  return true;
}

// Tests
console.log(countByCategory()); // {personal:2, study:2, work:1}
console.log(getSummary());
console.log(isDuplicate("buy milk and bread")); // true
console.log(addNote("Learn React", "study")); // true
console.log(getSummary()); // now 6 notes