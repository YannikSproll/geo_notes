// import { v4 as uuidv4 } from 'uuid';
const { DateTime } = luxon;

const IS_SIDEBAR_OPEN_LOCAL_STORAGE_KEY = "isSideBarOpen";
const SIDEBAR_OPEN = "open";
const SIDEBAR_CLOSE = "closed";

const MAIN_CONTAINER_STATE_LOCAL_STORAGE_KEY = "mainContainerState";
const HOME_MAIN_CONTAINER_STATE = "home";
const NOTES_MAIN_CONTAINER_STATE = "notes";
const ADD_NOTE_MAIN_CONTAINER_STATE = "add_note";

window.onload = function () {
  loadSideBarState();
  loadMainContainerState();
}

function loadMainContainerState() {
  const storedMainContainerState = window.localStorage.getItem(MAIN_CONTAINER_STATE_LOCAL_STORAGE_KEY);

  if (storedMainContainerState == null) {
    navToHome();
    return;
  }

  if (storedMainContainerState == NOTES_MAIN_CONTAINER_STATE) {
    navToNotes();
  } else if (storedMainContainerState == ADD_NOTE_MAIN_CONTAINER_STATE) {
    navToAddNote();
  } else {
    navToHome();
  }
}

function loadSideBarState() {
  const storedIsSideBarOpen = window.localStorage.getItem(IS_SIDEBAR_OPEN_LOCAL_STORAGE_KEY);

  if (storedIsSideBarOpen == null) {
    return;
  }

  if (storedIsSideBarOpen == SIDEBAR_OPEN) {
    openSideBar();
  } else if (storedIsSideBarOpen == SIDEBAR_CLOSE) {
    closeSideBar();
  }
}

function toogleSideBar() {
  if (isSideBarOpen()) {
    closeSideBar();
  } else {
    openSideBar();
  }
}

function isSideBarOpen() {
  return !$("#sideBarContainer").hasClass("collapse");
}

function openSideBar() {
  $("#sideBarContainer").removeClass("collapse");
  window.localStorage.setItem(IS_SIDEBAR_OPEN_LOCAL_STORAGE_KEY, SIDEBAR_OPEN);
}

function closeSideBar() {
  $("#sideBarContainer").addClass("collapse");
  window.localStorage.setItem(IS_SIDEBAR_OPEN_LOCAL_STORAGE_KEY, SIDEBAR_CLOSE);
}

function navToNotes() {
  $("#mainContainer").load("notes.html", function () {
    loadAllNotes();
  });

  $("#notesNavAnchor").addClass("bg-gray-200");
  $("#homeNavAnchor").removeClass("bg-gray-200");

  window.localStorage.setItem(MAIN_CONTAINER_STATE_LOCAL_STORAGE_KEY, NOTES_MAIN_CONTAINER_STATE);
}

function navToHome() {
  $("#mainContainer").load("home.html", function() {
    setupGeolocation();
  });

  $("#notesNavAnchor").removeClass("bg-gray-200");
  $("#homeNavAnchor").addClass("bg-gray-200");

  window.localStorage.setItem(MAIN_CONTAINER_STATE_LOCAL_STORAGE_KEY, HOME_MAIN_CONTAINER_STATE);
}

function navToAddNote() {
  $("#mainContainer").load("add_note.html");

  $("#notesNavAnchor").addClass("bg-gray-200");
  $("#remindersNavAnchor").removeClass("bg-gray-200");

  window.localStorage.setItem(MAIN_CONTAINER_STATE_LOCAL_STORAGE_KEY, ADD_NOTE_MAIN_CONTAINER_STATE);
}


class Note {
  constructor(id, title, content, createdAt) {
    this.id = id;
    this.title = title;
    this.content = content;
    this.createdAt = createdAt;
  }
}

function addNote() {
  const id = crypto.randomUUID();
  const title = $("#addNoteTitleInput").val();
  const content = $("#addNodeContentTextArea").val();
  const createdAt = DateTime.now().toSeconds();

  // TODO: validate
  const note = new Note(
    id,
    title,
    content,
    createdAt
  );

  useDatabase(
    (event) => saveNote(event.target.result, note),
    function onError(event) {
      showToast("Failed to save note.");
    }
  );
}

function showToast(content) {
  Toastify({
    text: content,
    duration: 4000,
    newWindow: false,
    close: false,
    gravity: "top",
    position: "right",
    stopOnFocus: false,
  }).showToast();
}

function saveNote(db, note) {
  const request = db
    .transaction(NOTES_OBJECT_STORE_NAME, TRANACTION_TYPE_READ_WRITE)
    .objectStore(NOTES_OBJECT_STORE_NAME)
    .add(note);

  request.onsuccess = (event) => {
    console.log("Note created.");
    db.close();

    showToast("Note created.");

    navToNotes();
  };

  request.onerror = (event) => {
    console.log("Note saving failed.");
    db.close();
    alert("Failed to save note.");
  };
}

function clearNotes() {
  $("#notesList").empty();
}

function loadAllNotes() {
  clearNotes();
  useDatabase(
    (event) => _loadAllNotes(event.target.result),
    (event) => showToast("Failed to load notes.")
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
    console.log("Failed to load notes.");
    db.close();
    showToast("Failed to load notes.")
  }
}

function deleteNote(noteId) {
  useDatabase(
    (event) => _deleteNote(event.target.result, noteId),
    (event) => { }
  );
}

function _deleteNote(db, noteId) {
  const request = db
    .transaction(NOTES_OBJECT_STORE_NAME, TRANACTION_TYPE_READ_WRITE)
    .objectStore(NOTES_OBJECT_STORE_NAME)
    .delete(noteId);

    request.onsuccess = (event) => {
      console.log("Note with id " + noteId + " deleted.");   

      db.close();

      showToast("Note deleted.");

      loadAllNotes();
    };
  
    request.onerror = (event) => {
      console.log("Failed to delete note.");
      db.close();
      showToast("Failed to delete note.");
    }
}

/////////////////////////////////////////////////////// Database utility
const DATABASE_NAME = "GeoNotesDatabase";
const DATABASE_VERSION = 3;
const NOTES_OBJECT_STORE_NAME = "Notes";
const TRANACTION_TYPE_READ_WRITE = "readwrite";
const TRANACTION_TYPE_READ_ONLY = "readonly";

function useDatabase(onSuccess, onError) {
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
  const objectStore = db.createObjectStore(NOTES_OBJECT_STORE_NAME, { keyPath: "id" });
  console.log("ObjectStore " + NOTES_OBJECT_STORE_NAME + " created.");
}
///////////////////////////////////////////////////////////////////////////////// Timestamp utility


/////////////////////////////////////////////////////////////////////////////// Creation of note html

function createNoteListElement(note) {
  const noteIcon = createNoteIcon(note.title.charAt(0));
  const noteTextDiv = createNoteTextDiv(note);
  const noteDeleteButton = createDeleteButton(note);

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

function createDeleteButton(noteToDelete) {
  const iconElement = $("<i></i>", {
    "class": "bi bi-trash-fill text-white text-2xl"
  });

  const buttonElement = $("<button></button>", {
    "class": "bg-red-600 w-12 h-12 rounded-md shadow",
    "click" : function() {
      deleteNote(noteToDelete.id);
    }
  });

  const wrapperDiv = $("<div></div>", {
    "class": "flex-grow-0 flex-shrink-0 self-stretch flex items-center px-3"
  });

  return wrapperDiv
    .append(buttonElement
      .append(iconElement));
}


function setupGeolocation() {
  if (navigator.geolocation) {
    requestGeolocationPermission();
  } else {
    $("#homeWrapper").append(createNoGeolocationElement());
  }
}

function requestGeolocationPermission() {
  navigator.geolocation.getCurrentPosition(function(location) { 
    clearHomeWrapper();
    showPositionOnHomePage(location.coords);
  });
  navigator.permissions.query({ name: "geolocation" }).then((result) => {
    if (result.state === "granted") {
      // report(result.state);
      // geoBtn.style.display = "none";
    } else {
      clearHomeWrapper();
      $("#homeWrapper").append(createGeolocationPermissionDeniedElement());
      // report(result.state);
      // geoBtn.style.display = "inline";
    }
    result.addEventListener("change", () => {
      report(result.state);
    });
  });
}

function clearHomeWrapper() {
  $("#homeWrapper").empty();
}

function createNoGeolocationElement() {
  return $("<span></span>", {
    "class" : "text-xl",
    "text" : "This device does not support geolocation."
  });
}

function createGeolocationPermissionDeniedElement() {
  return $("<span></span>", {
    "class" : "text-xl",
    "text" : "The permission for geolocation is missing."
  });
}

function createShowCurrentLocationElement(latitude, longitude) {
  const textParagraphElement = $("<p></p>", {
    "class" : "text-2xl",
    "text" : "Current location:"
  });

  const coordinatesParagraphElement = $("<p></p>", {
    "class" : "text-xl",
    "text" : "Latitude: " + latitude + " | Longitude: " + longitude
  });

  const wrapperDiv =  $("<div></div>", {
    "class" : "flex flex-col items-center"
  });

  return wrapperDiv
    .append(textParagraphElement)
    .append(coordinatesParagraphElement);
}

function showPositionOnHomePage(coordinates) {
  $("#homeWrapper").append(createShowCurrentLocationElement(coordinates.latitude, coordinates.longitude));
}

function showPosition(position) {
 console.log(position);
}