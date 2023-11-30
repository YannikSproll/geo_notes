
window.onload = function() {
    navToNotes();
}

function toogleSideBar() {
    $("#sideBarContainer").toggleClass("collapse");
}

function navToNotes() {
    $("#mainContainer").load("notes.html");

    $("#notesNavAnchor").addClass("bg-gray-200");
    $("#remindersNavAnchor").removeClass("bg-gray-200");
    $("#settingsNavAnchor").removeClass("bg-gray-200");
}

function navToReminders(){
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

  class note {
    constructor(title, content, createdAt) {
        this.title = title;
        this.content = content;
        this.createdAt = createdAt;
    }
  }