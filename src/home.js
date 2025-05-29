// Handles journal entry creation for Home page
const startBtn = document.getElementById('start-journal-btn');
const homeJournalList = document.getElementById('home-journal-list');

function getFormattedDateTime() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const date = now.toLocaleDateString(undefined, options);
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${date} | ${time}`;
}

function createHomeJournalEntry() {
  const entryDiv = document.createElement('div');
  entryDiv.className = 'journal-entry glass';
  const timestamp = document.createElement('div');
  timestamp.className = 'timestamp';
  timestamp.textContent = getFormattedDateTime();
  const textarea = document.createElement('textarea');
  textarea.className = 'journal-text';
  textarea.placeholder = 'Write your thoughts here...';
  entryDiv.appendChild(timestamp);
  entryDiv.appendChild(textarea);
  homeJournalList.prepend(entryDiv);
}

if (startBtn) {
  startBtn.addEventListener('click', createHomeJournalEntry);
}
