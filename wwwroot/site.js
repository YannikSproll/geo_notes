
window.onload = function () {
  navToNotes();
}

function toogleSideBar() {
  $("#sideBarContainer").toggleClass("collapse");
}

function navToNotes() {
  $("#mainContainer").load("notes.html", function() {
    const notesList = $("#notesList");

    

  });

  $("#notesNavAnchor").addClass("bg-gray-200");
  $("#remindersNavAnchor").removeClass("bg-gray-200");
  $("#settingsNavAnchor").removeClass("bg-gray-200");
}

function navToReminders() {
  $("#mainContainer").load("reminders.html");

  $("#notesNavAnchor").removeClass("bg-gray-200");
  $("#remindersNavAnchor").addClass("bg-gray-200");
  $("#settingsNavAnchor").removeClass("bg-gray-200");
}

function navToSettings() {
  $("#mainContainer").load("settings.html");

  $("#notesNavAnchor").removeClass("bg-gray-200");
  $("#remindersNavAnchor").removeClass("bg-gray-200");
  $("#settingsNavAnchor").addClass("bg-gray-200");
}

function navToAddNote() {
  $("#mainContainer").load("add_note.html");

  $("#notesNavAnchor").addClass("bg-gray-200");
  $("#remindersNavAnchor").removeClass("bg-gray-200");
  $("#settingsNavAnchor").removeClass("bg-gray-200");
}

class Note {
  constructor(title, content, createdAt) {
    this.title = title;
    this.content = content;
    this.createdAt = createdAt;
  }
}

function addNote() {
  const title = $("#addNoteTitleInput").val();
  const content = $("#addNodeContentTextArea").val();
  const createdAt = getTimestampInSeconds();

  // TODO: validate
  const note = new Note(
    title,
    content,
    createdAt
  );

  openDatabase(
    (event) => saveNote(event.target.result, note),
    function onError(event) {
      //TODO: Handle
      event.target.result.close();
    }
  );
}

function saveNote(db, note) {
  const request = db
    .transaction(NOTES_OBJECT_STORE_NAME, TRANACTION_TYPE_READ_WRITE)
    .objectStore(NOTES_OBJECT_STORE_NAME)
    .add(note);

  request.onsuccess = (event) => {
    console.log("Note saved");
    db.close();
    navToNotes();
  };

  request.onerror = (event) => {
    console.log("Note saving failed.");
    db.close();
    alert("Failed to save note.");
  };
}

const DATABASE_NAME = "GeoNotesDatabase";
const DATABASE_VERSION = 3;
const NOTES_OBJECT_STORE_NAME = "Notes";
const TRANACTION_TYPE_READ_WRITE = "readwrite";

function openDatabase(onSuccess, onError) {
  const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

  request.onerror = (event) => {
    console.log("Failed to open database " + DATABASE_NAME + ".");
    onError(event);
  };

  request.onsuccess = (event) => {
    console.log("Database " + DATABASE_NAME + "opened.");
    onSuccess(event);
  };

  request.onupgradeneeded = createObjectStores;
}

function createObjectStores(event) {
  const db = event.target.result;

  // Create an objectStore for this database
  const objectStore = db.createObjectStore(NOTES_OBJECT_STORE_NAME, { autoIncrement: true });
  console.log("ObjectStore " + NOTES_OBJECT_STORE_NAME + " created.");
}

function getTimestampInSeconds() {
  return Math.floor(Date.now() / 1000);
}