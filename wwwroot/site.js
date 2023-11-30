const { DateTime } = luxon;


window.onload = function () {
  navToNotes();
}

function toogleSideBar() {
  $("#sideBarContainer").toggleClass("collapse");
}

function navToNotes() {
  $("#mainContainer").load("notes.html", function () {
    loadAllNotes();
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
  const createdAt = DateTime.now().toSeconds();

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

function loadAllNotes() {
  openDatabase(
    (event) => _loadAllNotes(event.target.result),
    (event) => { }
  );
}

function _loadAllNotes(db) {
  const request = db
    .transaction(NOTES_OBJECT_STORE_NAME, TRANACTION_TYPE_READ_ONLY)
    .objectStore(NOTES_OBJECT_STORE_NAME)
    .getAll();

  request.onsuccess = (event) => {
    console.log("Notes loaded.");    

    const notes = event.target.result;

    const notesList = $("#notesList");

    for (var i = 0; i < notes.length; i++){
      const note = notes[i];
      notesList.append(createNoteListElement(note));
    }

    db.close();
  };

  request.onerror = (event) => {
    console.log("Note loading failed.");
    db.close();
    alert("Failed to load note.");
  }
}


/////////////////////////////////////////////////////// Database utility
const DATABASE_NAME = "GeoNotesDatabase";
const DATABASE_VERSION = 3;
const NOTES_OBJECT_STORE_NAME = "Notes";
const TRANACTION_TYPE_READ_WRITE = "readwrite";
const TRANACTION_TYPE_READ_ONLY = "readonly";

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
///////////////////////////////////////////////////////////////////////////////// Timestamp utility


/////////////////////////////////////////////////////////////////////////////// Creation of note html

function createNoteListElement(note) {
  const noteIcon = createNoteIcon(note.title.charAt(0));
  const noteTextDiv = createNoteTextDiv(note);
  const noteDeleteButton = createDeleteButton();

  const wrapperDiv = $("<div></div>", {
    "class": "flex items-center bg-white border rounded-sm overflow-hidden shadow"
  });

  const listItemElement = $("<li></li>");

  return listItemElement
    .append(wrapperDiv
      .append(noteIcon)
      .append(noteTextDiv)
      .append(noteDeleteButton));
}

function createNoteIcon(iconCharacter) {
  const spanElement = $("<span></span>", {
    "class": "text-7xl text-white",
    "text": iconCharacter
  });

  const wrapperDiv = $("<div></div>", {
    "class": "flex-grow-0 flex-shrink-0 flex justify-center items-center w-20 h-20 bg-green-400"
  });

  return wrapperDiv.append(spanElement);
}

function createNoteTextDiv(note) {
  const contentSpanElement = $("<span></span>", {
    "class": "text-lg truncate tracking-wider min-w-0",
    "text": note.content
  });

  const titleSpanElement = $("<span></span>", {
    "class": "flex-grow-0 flex-shrink-0 text-2xl",
    "text": note.title
  });

  const expanderElement = $("<div></div>", {
    "class": "flex-grow flex-shrink"
  });

  const createdAtSpanElement = $("<span></span>", {
    "class": "flex-grow-0 flex-shrink-0 text-md",
    "text": DateTime.fromSeconds(note.createdAt).toFormat('MM/dd/yyyy h:mm a')
  });

  const titleLineWrapperDiv = $("<div></div>", {
    "class": "flex flex-row items-center"
  });

  const linebreakParagraph = $("<p></p>");

  const wrapperDiv = $("<div></div>", {
    "class": "flex-grow flex-shrink px-4 text-gray-700 min-w-0 overflow-hidden"
  });

  return wrapperDiv
    .append(titleLineWrapperDiv
      .append(titleSpanElement)
      .append(expanderElement)
      .append(createdAtSpanElement))
    .append(linebreakParagraph)
    .append(contentSpanElement);
}

function createDeleteButton() {
  const iconElement = $("<i></i>", {
    "class": "bi bi-trash-fill text-white text-2xl"
  });

  const buttonElement = $("<button></button>", {
    "class": "bg-red-600 w-12 h-12 rounded-md shadow"
  });

  const wrapperDiv = $("<div></div>", {
    "class": "flex-grow-0 flex-shrink-0 self-stretch flex items-center px-3"
  });

  return wrapperDiv
    .append(buttonElement
      .append(iconElement));
}