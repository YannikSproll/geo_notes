const { DateTime } = luxon;


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////// Layout
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const IS_SIDEBAR_OPEN_LOCAL_STORAGE_KEY = "isSideBarOpen";
const SIDEBAR_OPEN = "open";
const SIDEBAR_CLOSE = "closed";

const MAIN_CONTAINER_STATE_LOCAL_STORAGE_KEY = "mainContainerState";
const HOME_MAIN_CONTAINER_STATE = "home";
const NOTES_MAIN_CONTAINER_STATE = "notes";
const ADD_NOTE_MAIN_CONTAINER_STATE = "add_note";

// Initializes the window
window.onload = function () {
  loadSideBarState();
  loadMainContainerState();
  setUpLocationListener();

  requestNotificationPermission();
}

/////////////////////////////// Javascript media queries

var window_md_JS_media_query = window.matchMedia("(min-width: 768px)");

function isMediumOrBiggerScreen() {
  return !window_md_JS_media_query.matches;
}

/////////////////////////////// Layout state persisting

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

/////////////////////////////// SideBar

// Loads the state of side bar from the local storage and applies it 
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

// Toggles the state of the sidebar
function toogleSideBar() {
  if (isSideBarOpen()) {
    closeSideBar();
  } else {
    openSideBar();
  }
}

// Checks if the sidebar is open
function isSideBarOpen() {
  return !$("#sideBarContainer").hasClass("hidden");
}

// Opens the sidebar
function openSideBar() {
  $("#sideBarContainer").removeClass("hidden");
  window.localStorage.setItem(IS_SIDEBAR_OPEN_LOCAL_STORAGE_KEY, SIDEBAR_OPEN);
}

// Closes the sidebar
function closeSideBar() {
  $("#sideBarContainer").addClass("hidden");
  window.localStorage.setItem(IS_SIDEBAR_OPEN_LOCAL_STORAGE_KEY, SIDEBAR_CLOSE);
}

/////////////////////////////// Navigation

// Navigates to the homepage
function navToHome() {
  destroyCurrentPage();

  $("#mainContainer").load("home.html", initHomePage);

  $("#notesNavAnchor").removeClass("bg-gray-200");
  $("#homeNavAnchor").addClass("bg-gray-200");

  if (isMediumOrBiggerScreen()) {
    closeSideBar();
  }

  window.localStorage.setItem(MAIN_CONTAINER_STATE_LOCAL_STORAGE_KEY, HOME_MAIN_CONTAINER_STATE);
}

// Navigates to the notes page
function navToNotes() {
  destroyCurrentPage();

  $("#mainContainer").load("notes.html", initNotesPage);

  $("#notesNavAnchor").addClass("bg-gray-200");
  $("#homeNavAnchor").removeClass("bg-gray-200");

  if (isMediumOrBiggerScreen()) {
    closeSideBar();
  }

  window.localStorage.setItem(MAIN_CONTAINER_STATE_LOCAL_STORAGE_KEY, NOTES_MAIN_CONTAINER_STATE);
}

// Navigates to the add note page
function navToAddNote() {
  destroyCurrentPage();

  $("#mainContainer").load("add_note.html", initAddNotePage);

  $("#notesNavAnchor").addClass("bg-gray-200");
  $("#remindersNavAnchor").removeClass("bg-gray-200");

  window.localStorage.setItem(MAIN_CONTAINER_STATE_LOCAL_STORAGE_KEY, ADD_NOTE_MAIN_CONTAINER_STATE);
}

// Cleans up all resources of the current page. Is called before navigating away from a page.
function destroyCurrentPage() {
  const storedMainContainerState = window.localStorage.getItem(MAIN_CONTAINER_STATE_LOCAL_STORAGE_KEY);

  if (storedMainContainerState == null) {
    return;
  }

  if (storedMainContainerState == ADD_NOTE_MAIN_CONTAINER_STATE) {
    destroyAddNotePage();
  }
}

/////////////////////////////// Global Geolocation Handling

// Checks if geolocation is supported on the current device.
function isGeolocationSupported() {
  return navigator.geolocation;
}

// Sets up the geolocation listener if supported on the current device
function setUpLocationListener() {
  if (!isGeolocationSupported()) {
    showToast("This device does not support geolocation.");
  }

  navigator.permissions
    .query({ name: "geolocation" })
    .then((result) => {
      onPermissionQueryCallback(result);

      result.onchange = () => {
        onPermissionQueryCallback(result);
      };
    });
}

// The callback that is invoked if the geolocation permission has changed
function onPermissionQueryCallback(result) {
  if (result.state === "granted") {
    onGeolocationPermissionGranted();
  } else if (result.state == "prompt") {
    onGeolocationPermissionPrompt();
  } else {
    onGeolocationPermissionDenied();
  }
}

// The callback that is invoked if geolocation permission is granted
function onGeolocationPermissionGranted() {
  showToast("GPS permission granted.");

  geolocationListenerId = navigator.geolocation.watchPosition(
    function (c) {
     onNewGeolocation(c.coords.latitude, c.coords.longitude);
    },
    function (e) {
      console.log(e);
    });
}

// The callback that is invoked if geolocation permission is prompted
function onGeolocationPermissionPrompt() {
  showToast("GPS permission prompt.");

  geolocationListenerId = navigator.geolocation.watchPosition(
    function (c) {      
      onNewGeolocation(c.coords.latitude, c.coords.longitude);
    },
    function (e) {
      if (e.code == 1) {
        onGeolocationPermissionDenied();
      }

      console.log(e);
    });
}

// The callback that is invoked if geolocation permission is denied
function onGeolocationPermissionDenied() {
  showToast("GPS permission denied.");

  updateHomePageWithGeolocationPermissionDenied();
}

// The callback that is invoked if the location listener found a new location 
function onNewGeolocation(latitude, longitude) {
  updateNoteNotification(latitude, longitude);
  updateHomePageWithNewLocation(latitude, longitude);
}

/////////////////////////////// Global Notification Handling

// Updates the note notification
function updateNoteNotification(latitude, longitude) {
  useDatabase(function(event) {

    const geohash_filter = encode(latitude, longitude, 7);

    const request = event.target.result
      .transaction(NOTES_OBJECT_STORE_NAME, TRANACTION_TYPE_READ_ONLY)
      .objectStore(NOTES_OBJECT_STORE_NAME)
      .index(GEOHASH_INDEX_NAME)
      .getAll(geohash_filter);

      request.onsuccess = (event) => {
        const notes = event.target.result;

        updateNotification(notes);
      };
  },
  function(error) {
    console.log("Failed to fetch notes from database.");
  });
}

// Returns true if two lists are equal or contain equal elements
function sequenceEquals(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;

  a.sort();
  b.sort();

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

let currentlyActiveNoteIds = new Array();

// Updates the curretly active notification
function updateNotification(notes) {
  var newlyActiveNoteIds = new Array(notes.length);

    for (var i = 0; i < notes.length; i++) {
      newlyActiveNoteIds[i] = notes[i].id;
    }

  if (!sequenceEquals(currentlyActiveNoteIds, newlyActiveNoteIds)) {
    currentlyActiveNoteIds = newlyActiveNoteIds;

    showNotesNotification(notes);
    console.log(newlyActiveNoteIds);
  }
}

// Requests the permission to send notification
function requestNotificationPermission() {
  if (!("Notification" in window)) {
    return; // Broser doesnt support permissions
  }

  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      showToast("Notification Permission granted.");
    } else {
      showToast("Notification Permission denied.");
    }
  });
}

// Shows the notification on the screen
function showNotesNotification(notes) {
  let body = null;

  if (notes.length == 1) {
    body = notes.length + " note is active.";
  } else {
    body = notes.length + " notes are active.";
  }

  if (Notification.permission === "granted") {
    new Notification("GeoNotes",  { body });
  } else if (Notification.permission !== "denied") {
    showToast(body);
  }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////// Home Page
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Initializes the homepage
function initHomePage() {
  setupGeolocation();
}

// Sets up the geolocation for the home page
function setupGeolocation() {
  if (isGeolocationSupported()) {
    navigator.geolocation.getCurrentPosition(function(result) {
      updateHomePageWithNewLocation(result.coords.latitude, result.coords.longitude);
    });
  }
}

// Updates the location display on the home page if new location is available
function updateHomePageWithNewLocation(latitude, longitude) {
  clearHomeWrapper();
  $("#homeWrapper").append(createShowCurrentLocationElement(latitude, longitude));
}

// Updates the location display on the home page if geolocation permission is denied
function updateHomePageWithGeolocationPermissionDenied() {
  clearHomeWrapper();
  $("#homeWrapper").append(createGeolocationPermissionDeniedElement());
}

// Clears the location display on the home page
function clearHomeWrapper() {
  $("#homeWrapper").empty();
}

/////////////////////////////// Dynamic HTML element creation for home page position display

// Creates an html elment that indicates that geolocation is not supported.
function createNoGeolocationElement() {
  return $("<span></span>", {
    "class": "text-xl",
    "text": "This device does not support geolocation."
  });
}

// Creates an html element that indicates that geolocation permission is missing
function createGeolocationPermissionDeniedElement() {
  return $("<span></span>", {
    "class": "text-xl",
    "text": "The permission for geolocation is missing."
  });
}

// Creates html element that displays the current location
function createShowCurrentLocationElement(latitude, longitude) {
  const textParagraphElement = $("<p></p>", {
    "class": "text-2xl",
    "text": "Current location:"
  });

  const coordinatesParagraphElement = $("<p></p>", {
    "class": "text-xl",
    "text": "Latitude: " + latitude + " | Longitude: " + longitude
  });

  const wrapperDiv = $("<div></div>", {
    "class": "flex flex-col items-center"
  });

  return wrapperDiv
    .append(textParagraphElement)
    .append(coordinatesParagraphElement);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////// Notes Page
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Initializes the notes page
function initNotesPage() {
  loadAllNotes();
}

// Clears the notes on the notes page
function clearNotes() {
  $("#notesList").empty();
}

/////////////////////////////// Note database functions for loading and deleting

// Loads all notes from the database
function loadAllNotes() {
  clearNotes();
  useDatabase(
    (event) => _loadAllNotes(event.target.result),
    (event) => showToast("Failed to load notes.")
  );
}

// Handler for loading all notes from the db if the db could be opened
function _loadAllNotes(db) {
  const request = db
    .transaction(NOTES_OBJECT_STORE_NAME, TRANACTION_TYPE_READ_ONLY)
    .objectStore(NOTES_OBJECT_STORE_NAME)
    .getAll();

  request.onsuccess = (event) => {
    console.log("Notes loaded.");

    const notes = event.target.result;

    const notesList = $("#notesList");

    for (var i = 0; i < notes.length; i++) {
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

// Deletes a note from the db
function deleteNote(noteId) {
  useDatabase(
    (event) => _deleteNote(event.target.result, noteId),
    (event) => { }
  );
}

// Handler for deleting notes from the db if the db could be opened
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

/////////////////////////////// Dynamic HTML element creation for note list entries

// Creates an html element that displays a note list entry
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

// Creates an html element that displays the icon of a note list entry
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

// Creates an html element that displays the text of a note list entry
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

// Creates an html element that displays the delete button of a note list entry
function createDeleteButton(noteToDelete) {
  const iconElement = $("<i></i>", {
    "class": "bi bi-trash-fill text-white text-2xl"
  });

  const buttonElement = $("<button></button>", {
    "class": "bg-red-600 w-12 h-12 rounded-md shadow",
    "click": function () {
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


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////// Add Note Page
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var marker = null;
var map = null;

// Initializes the add notes page
function initAddNotePage() {

  map = L.map('add_notes_map').setView([51.505, -0.09], 13);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);

  map.on('click', onMapClicked);
}

// Destroys the map objects on the note page
function destroyAddNotePage() {
  if (map != null) {
    map.remove();
    map = null;
  }

  marker = null;
}

/////////////////////////////// Map Handling

// Leaflet callback if user clicked on the map
function onMapClicked(e) {
  applyLocation(e.latlng.lat, e.latlng.lng);
}

// Sets the current location as marker on the map
function setCurrentLocation() {
  navigator.geolocation.getCurrentPosition(onGetCurrentPositionSuccess, onGetCurrentPositionError);
}

// Callback if current location could be determined
function onGetCurrentPositionSuccess(position) {
  applyLocation(position.coords.latitude, position.coords.longitude);

  if (map != null) {
    map.flyTo(L.latLng(position.coords.latitude, position.coords.longitude));
  }
}

// Callback if current location could not be determined
function onGetCurrentPositionError(error) {
  showToast("Failed to get current location.");
}

// Applies the current location to the map
function applyLocation(latitude, longitude) {
  placeMarker(latitude, longitude);

  $("#addNoteLatitudeInput").val(latitude);
  $("#addNoteLongitudeInput").val(longitude);
}

// Places the marker on the map at the given coordinates
function placeMarker(lat, lng) {
  if (map == null) {
    return;
  }

  if (marker != null) {
    map.removeLayer(marker);
  }

  marker = L.marker([lat, lng]).addTo(map);
}

/////////////////////////////// Creation and storing of notes

// Adds and validates a note on the add note page 
function addNote() {
  const title = $("#addNoteTitleInput").val();
  const content = $("#addNodeContentTextArea").val();
  const latitude = $("#addNoteLatitudeInput").val();
  const longitude = $("#addNoteLongitudeInput").val();

  if (!validateNoteData(title, content, latitude, longitude)) {
    return;
  }

  const id = crypto.randomUUID();
  const createdAt = DateTime.now().toSeconds();

  const note = new Note(
    id,
    title,
    content,
    latitude,
    longitude,
    encode(latitude, longitude, 7),
    createdAt
  );

  useDatabase(
    (event) => _addNote(event.target.result, note),
    function onError(event) {
      showToast("Failed to save note.");
    }
  );
}

function validateNoteData(title, content, latitude, longitude) {
  if (isStringNullOrEmpty(title)) {
    showToast("Title may not be empty.");
    return false;
  }

  if (isStringNullOrEmpty(content)) {
    showToast("Content may not be empty.");
    return false;
  }

  if (isStringNullOrEmpty(latitude)) {
    showToast("Latitude may not be empty.");
    return false;
  }

  if (isStringNullOrEmpty(longitude)) {
    showToast("Longitude may not be empty.");
    return false;
  }

  return true;
}

// Checks if a string is null or empty
function isStringNullOrEmpty(str) {
  return str != null && str == "";
}

// Handler for storing a note to the db if the db could be opened
function _addNote(db, note) {
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


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////// Toasts
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Displays a toast using the toastify.js library
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


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////// Database Utility
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const DATABASE_NAME = "GeoNotesDatabase";
const DATABASE_VERSION = 3;
const NOTES_OBJECT_STORE_NAME = "Notes";
const TRANACTION_TYPE_READ_WRITE = "readwrite";
const TRANACTION_TYPE_READ_ONLY = "readonly";
const GEOHASH_INDEX_NAME = "geohash_index";

// Tries to open a database
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

// Creates an object store for notes in the db
function createObjectStores(event) {
  const db = event.target.result;

  // Create an objectStore for this database
  const objectStore = db.createObjectStore(NOTES_OBJECT_STORE_NAME, { keyPath: "id" });

  // Create index for geohashes
  objectStore.createIndex(GEOHASH_INDEX_NAME, "geohash", { unique: false })

  console.log("ObjectStore " + NOTES_OBJECT_STORE_NAME + " created.");
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////// Note Data
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


class Note {
  constructor(id, title, content, latitude, longitude, geohash, createdAt) {
    this.id = id;
    this.title = title;
    this.content = content;
    this.latitude = latitude;
    this.longitude = longitude;
    this.geohash = geohash;
    this.createdAt = createdAt;
  }
}