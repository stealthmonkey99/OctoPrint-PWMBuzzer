FREQS = {
                "C-": 8.18,     "C#-": 8.66,    "D-": 9.18,     "D#-": 9.72,    "E-": 10.30,    "F-": 10.91,    "F#-": 11.56,   "G-": 12.25,    "G#-": 12.98,   "A-": 13.75,    "A#-": 14.57,   "B-": 15.43,
                "C0": 16.352,   "C#0": 17.324,  "D0": 18.354,   "D#0": 19.445,  "E0": 20.602,   "F0": 21.827,   "F#0": 23.125,  "G0": 24.5,     "G#0": 25.957,  "A0": 27.5,     "A#0": 29.135,  "B0": 30.868,
                "C1": 32.703,   "C#1": 34.648,  "D1": 36.708,   "D#1": 38.891,  "E1": 41.203,   "F1": 43.654,   "F#1": 46.249,  "G1": 48.999,   "G#1": 51.913,  "A1": 55,       "A#1": 58.27,   "B1": 61.735,
                "C2": 65.406,   "C#2": 69.296,  "D2": 73.416,   "D#2": 77.782,  "E2": 82.407,   "F2": 87.307,   "F#2": 92.499,  "G2": 97.999,   "G#2": 103.83,  "A2": 110,      "A#2": 116.54,  "B2": 123.47,
    /* low-C */ "C3": 130.813,  "C#3": 138.591, "D3": 146.832,  "D#3": 155.563, "E3": 164.814,  "F3": 174.614,  "F#3": 184.997, "G3": 195.998,  "G#3": 207.652, "A3": 220.000,  "A#3": 233.082, "B3": 246.942,
    /* mid-C */ "C4": 261.626,  "C#4": 277.183, "D4": 293.665,  "D#4": 311.127, "E4": 329.628,  "F4": 349.228,  "F#4": 369.994, "G4": 391.995,  "G#4": 415.305, "A4": 440.000,  "A#4": 466.164, "B4": 493.883,
    /* tnr-C */ "C5": 523.251,  "C#5": 554.365, "D5": 587.330,  "D#5": 622.254, "E5": 659.255,  "F5": 698.456,  "F#5": 739.989, "G5": 783.991,  "G#5": 830.609, "A5": 880.000,  "A#5": 932.328, "B5": 987.767,
                "C6": 1046.5,   "C#6": 1108.7,  "D6": 1174.7,   "D#6": 1244.5,  "E6": 1318.5,   "F6": 1396.9,   "F#6": 1480,    "G6": 1568,     "G#6": 1661.2,  "A6": 1760,     "A#6": 1864.7,  "B6": 1975.5,
                "C7": 2093,     "C#7": 2217.5,  "D7": 2349.3,   "D#7": 2489,    "E7": 2637,     "F7": 2793.8,   "F#7": 2960,    "G7": 3136,     "G#7": 3322.4,  "A7": 3520,     "A#7": 3729.3,  "B7": 3951.1,
                "C8": 4186,     "C#8": 4434.9,  "D8": 4698.6,   "D#8": 4978,    "E8": 5274,     "F8": 5587.7,   "F#8": 5919.9,  "G8": 6271.9,   "G#8": 6644.9,  "A8": 7040,     "A#8": 7458.6,  "B8": 7902.1,
                "C9": 8372,     "C#9": 8869.8,  "D9": 9397.3,   "D#9": 9956.1,  "E9": 10548,    "F9": 11175,    "F#9": 11840,   "G9": 12544
};

QUARTER_NOTE_DURATION = 200;

STORAGE_FOLDER = "M300 Compositions";

DEFAULT_FILENAME = "my-tune.gcode";

TEXTAREA_ID = "#m300-composition";

OPEN_FILE_ID = "#m300-open-file";

M300_ANALYSIS_KEY = "m300analysis";

BACKSTACK_ACTIONS = {
    INSERT: "I",
    REVERSE: "R",
    DIFF: "D"
};

function M300Composer(parent) {
    var self = this;
    var parentVM = parent;

    self.data = ko.observableArray([]);
    self.cleanupLocked = ko.observable(false);
    self.line = ko.observable(0);
    self.lineIsEmpty = ko.observable(true);
    self.caretTop = ko.observable(0);
    self.caretLeft = ko.observable(0);
    self.operationstack = ko.observableArray([]);
    self.backstack = ko.observableArray([]);
    self.composition = ko.computed(function() {
        return self.data().join("\n");
    }, self);
    self.isEmpty = ko.computed(function() {
        return self.data().length < 1;
    }, self);
    self.isBackstackEmpty = ko.computed(function() {
        return self.backstack().length < 1;
    }, self);
    self.isOpStackEmpty = ko.computed(function() {
        return self.operationstack().length < 1;
    }, self);
    self.midiFile = ko.observable();
    self.filename = DEFAULT_FILENAME;

    /* Event Handlers */

    self.compScroll = function (_, event) {
        var textarea = $(TEXTAREA_ID);
        var cursorStart = textarea.prop("selectionStart");
        var atEnd = (cursorStart >= textarea.prop("value").length);
        var atLineStart = (cursorStart === 0 || textarea.prop("value").substr(cursorStart - 1, 1) === "\n");
        var atLineEnd = (atEnd || textarea.prop("value").substr(cursorStart, 1) === "\n");
        self.lineIsEmpty(atLineStart && atLineEnd);

        var line = textarea.prop("value").substr(0, cursorStart).split("\n").length - 1;
        if (atLineEnd && !atLineStart) {
            line++;
        }
        self.line(line);

        self.caretTop(parseInt(textarea.css("border-width")) + parseInt(textarea.css("padding-top")) + (line * parseInt(textarea.css("line-height"))) - textarea.prop("scrollTop"));
        self.caretLeft(-1 * textarea.prop('scrollLeft'));

        // let the event bubble up
        return true;
    }
    self.compScroll();  // initialize

    self.pianoKeyPress = function(note) {
        var compositionToneStart = new Date();

        // handle release of the button from anywhere (e.g. if mouse moves outside of the button, still handle the release)
        document.addEventListener("mouseup", self.pianoKeyRelease.bind(self, note, compositionToneStart), { once: true });

        parentVM.issueToneCommand(parentVM.commands.TEST_TONE_START, { frequency: FREQS[note] });
    }

    self.pianoKeyRelease = function(note, startTime) {
        parentVM.issueToneCommand(parentVM.commands.TEST_TONE_STOP);

        var duration = new Date() - startTime;
        // yield before inserting in case textarea was in the middle of edits
        setTimeout(function() {
            self.insertNote(note, duration);
        }, 0);
    }

    self.play = function() {
        if (self.isEmpty() || !parentVM.printerConnected()) { return; }

        OctoPrint.control.sendGcode(self.data())
            .catch(function(error) {
                var message = error && error.responseJSON && error.responseJSON.error || "Something went wrong, please make sure the printer is connected and try again later.";
                new PNotify({
                    title: `Error sending Gcode to printer`,
                    text: message,
                    type: "error",
                    hide: true
                });
            });
    }

    self.edit = function(action, event) {
        switch (action) {
            case "undo":
            case "redo":
                backstackAction(action === "undo");
                break;

            case "pause":
                self.insertPause(QUARTER_NOTE_DURATION);
                break;

            case "clear":
                if (self.isEmpty()) { return; }
    
                new Promise(function(resolve, reject) {
                    if (!self.composition()) {
                        // empty, safe to continue
                        resolve();
                    } else {
                        confirmPromise(resolve, reject, "M300 PWM Buzzer Plugin", "Are you sure you want to clear your Gcode?");
                    }
                })
                .then(function() {
                    var oldLines = self.data().slice();
                    self.data.removeAll();
                    calculateDiff(oldLines, []);
                    cursorAfterLine(0);
                })
                .catch(function() { /* eat cancels */ });

                break;

            case "reverse":
                if (self.isEmpty()) { return; }

                self.data.reverse();
                commitOperation({
                    operation: BACKSTACK_ACTIONS.REVERSE
                });
                cursorAfterLine(self.data().length);
                break;

            case "cleanup":
                if (self.isEmpty()) { return; }

                var oldLines = self.data().slice();
                // snap to multiples of QUARTER_NOTE_DURATION
                var lines = self.data();
                lines = lines.map(smartSnapLine);
                self.data.removeAll();
                self.data.push(...lines);
                calculateDiff(oldLines, lines);
                cursorAfterLine();
                break;

            case "textarea-edit":
                var oldLines = self.data().slice();
                var newLines = [];
                var lines = event.currentTarget.value.split("\n");
                self.data.removeAll();
                if (lines.length !== 1 || lines[0] !== "") {
                    newLines = lines;
                    self.data.push(...lines);
                }
                calculateDiff(oldLines, newLines);
                break;

            default:
                break;
        }
        self.scrollCompositionCursorInView();
    }

    self.save = function() {
        if (self.isEmpty()) { return; }

        var path;
        var formData;
        generateFile(true, true)
            .then(function(blob) {
                if (!blob) { throw new Error("no data to store"); }
                formData = new FormData();
                path = `${STORAGE_FOLDER}/${self.filename}`;
                formData.append("file", blob, path);
                return OctoPrint.files.createFolder("local", STORAGE_FOLDER);
            })
            .then(function() {
                return OctoPrint.files.listForLocation("local", true);
            })
            .then(function(entries) {
                return new Promise(function(resolve, reject) {
                    if (!OctoPrint.files.entryForPath(path, entries.files)) {
                        // new file, safe to continue
                        resolve();
                    } else {
                        confirmPromise(resolve, reject, self.filename, `"${path}" already exists.  Are you sure you want to overwrite the file?`);
                    }
                });
            })
            .then(function() {
                return OctoPrint.files.upload("local", formData.get("file"));
            })
            .then(function() {
                new PNotify({
                    title: self.filename,
                    text: `Saved successfully!  You can find your file in the "${STORAGE_FOLDER}" folder.`,
                    type: "success",
                    hide: true
                });
            }, function(error) {
                new PNotify({
                    title: self.filename,
                    text: `File was not be saved at this time.`,
                    type: "error",
                    hide: true
                });
            });
    }

    self.open = function() {
        OctoPrint.files.listForLocation("local", true)
            .then(function(entries) {
                var recurseFolder = function(children, list = []) {
                    children.forEach(function(file) {
                        if (file.type === "folder") {
                            recurseFolder(file.children, list);
                        } else {
                            list.push({
                                path: file.path,
                                hasM300: !!file.hash && file.hasOwnProperty(M300_ANALYSIS_KEY) && file[M300_ANALYSIS_KEY].hasOwnProperty(file.hash) && !!file[M300_ANALYSIS_KEY][file.hash],
                                file
                            });
                        }
                    });
                    return list;
                }
                return recurseFolder(entries.files);
            })
            .then(function(fileList) {
                var options = "";
                fileList.forEach(function(item, index) {
                    options += `<option value="${index}">${item.hasM300 ? "&#9835; " : ""}${item.path}</option>`;
                });
                return new Promise(function(resolve, reject) {
                    new PNotify({
                        title: "M300 PWM Buzzer Plugin",
                        text: `Select a file to open: <select id="m300-open-file">${options}</select>`,
                        type: "info",
                        icon: "icon-file",
                        hide: false,
                        buttons: {
                            sticker: false,
                            closer: false
                        },
                        confirm: {
                            confirm: true,
                            buttons: [
                                {
                                    text: "Open",
                                    addClass: "btn-primary",
                                    click: function(notify) {
                                        var fileIndex = $(OPEN_FILE_ID).prop("value");
                                        notify.remove();
                                        resolve(fileList[fileIndex].file);
                                    }
                                },
                                {
                                    text: "Cancel",
                                    click: function(notify) {
                                        notify.remove();
                                        reject(null);
                                    }
                                }
                            ]
                        }
                    });
                });
            })
            .then(function(file) {
                self.filename = file.name;
                return $.ajax({
                    url: file.refs.download,
                    type: "GET",
                    dataType: "text",
                    contentType: "application/x-www-form-urlencoded; charset=UTF-8",
                    traditional: true,
                    processData: true,
                    headers: {
                        "Pragma": "no-cache",
                        "Expires": "0",
                        "Cache-Control": "no-cache, no-store, must-revalidate"
                    },
                    beforeSend: function() {
                        $('#loading_modal').modal('show');
                    }
                })
            })
            .then(function(data) {
                lines = data.split("\n");
                var oldLines = self.data().slice();
                self.data.removeAll();
                self.data.push(...lines);
                calculateDiff(oldLines, lines);
                cursorAfterLine(0);
                $('#loading_modal').modal('hide');
            })
            .catch(function(error) {
                if (!error) { return; } // ignore cancels
                $('#loading_modal').modal('hide');
                new PNotify({
                    title: `Error opening file`,
                    text: error,
                    type: "error",
                    hide: false
                });
            });
    }

    self.download = function() {
        if (self.isEmpty()) { return; }

        generateFile(true, true)
            .then(function(blob) {
                if (!blob) { return; }
                var fileUrl = URL.createObjectURL(blob);
                var element = document.createElement("a");
                element.setAttribute("href", fileUrl);
                element.setAttribute("download", self.filename);
                element.style.display = "none";
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
            });
    }

    self.copy = function() {
        if (self.isEmpty()) { return; }

        generateFile()
            .then(function(data) {
                if (navigator && navigator.clipboard) {
                    // async, if connected locally or over https
                    navigator.clipboard.writeText(data)
                        .then(function(result) {
                            new PNotify({
                                title: "M300 PWM Buzzer Plugin",
                                text: `Your M300 Composition has been copied to your clipboard.`,
                                type: "success",
                                hide: true
                            });
                        })
                        .catch(function(error) {
                            new PNotify({
                                title: "M300 PWM Buzzer Plugin",
                                text: `Failed to copy your composition to the clipboard: ${error}`,
                                type: "error",
                                hide: true
                            });
                        });
                } else {
                    // over http fall back to using execCommand instead
                    var element = document.createElement("textarea");
                    element.value = data;
                    element.style.opacity = 0;
                    element.style.width = 0;
                    element.style.height = 0;
                    document.body.appendChild(element);
                    element.focus();
                    element.select();
                    try {
                        if(document.execCommand("copy")) {
                            new PNotify({
                                title: "M300 PWM Buzzer Plugin",
                                text: `Your M300 Composition has been copied to your clipboard.`,
                                type: "success",
                                hide: true
                            });
                        } else {
                            throw new Error("'copy' command was not successful.");
                        }
                    } catch (error) {
                        new PNotify({
                            title: "M300 PWM Buzzer Plugin",
                            text: `Failed to copy your composition to the clipboard: ${error}`,
                            type: "error",
                            hide: true
                        });
                    }
                    document.body.removeChild(element);            
                }
            });
    }

    self.importFromMidi = function() {
        var importer = new MidiImporter(self.midiFile, parentVM.is_debug);
        importer.selectFile()
            .then(function() {
                return importer.initialize();
            })
            .then(function() {
                return importer.parseFile();
            })
            .then(function(lines) {
                var oldLines = self.data().slice();
                self.data.removeAll();
                self.data.push(...lines);
                calculateDiff(oldLines, lines);
                cursorAfterLine(0);
            })
            .catch(function(error) {
                if (error === MIDI_IMPORT_CANCEL) { return; }

                new PNotify({
                    title: `Error importing ${importer.filename}`,
                    text: error,
                    type: "error",
                    hide: false
                });
            });
    }

    /* Backstack Helpers */

    commitOperation = function(operation) {
        // if we're executing a manual operation (not a "redo" action off the backstack),
        // clear the backstack since we cannot redo anymore from this point
        self.backstack.removeAll();
        self.operationstack.push(operation);
    }

    backstackAction = function(undo = true) {
        if ((undo && self.isOpStackEmpty()) || (!undo && self.isBackstackEmpty())) {
            return;
        }

        var stack = undo ? self.operationstack : self.backstack;
        var antistack = undo ? self.backstack : self.operationstack;
        var lastOp = stack.pop();
        switch (lastOp.operation) {
            case BACKSTACK_ACTIONS.INSERT:
            case BACKSTACK_ACTIONS.DIFF:
                // put back the previous set of data
                revertDiff(lastOp, antistack);
                break;

            case BACKSTACK_ACTIONS.REVERSE:
                // reverse the reverse
                self.data.reverse();
                antistack.push({
                    operation: BACKSTACK_ACTIONS.REVERSE
                });
                cursorAfterLine(self.data().length);
                break;

            default:
                break;
        }
    }

    calculateDiff = function(oldLines, newLines) {
        // dumb/potentially wasteful diff, but good enough for this tool :)
        // ...just compares matching lines from top and bottom edges and considers the rest an insertion
        var topOff = 0;
        var botOff = 0;
        for (topOff = 0; topOff < oldLines.length && topOff < newLines.length; topOff++) {
            if (oldLines[topOff] !== newLines[topOff]) {
                break;
            }
        }
        var oldEndIndex = oldLines.length - 1;
        var newEndIndex = newLines.length - 1;
        for (botOff = 0; botOff <= oldEndIndex - topOff && botOff <= newEndIndex - topOff; botOff++) {
            if (oldLines[oldEndIndex - botOff] !== newLines[newEndIndex - botOff]) {
                break;
            }
        }
        commitOperation({
            operation: BACKSTACK_ACTIONS.DIFF,
            index: topOff,
            removed: oldLines.slice(topOff, oldLines.length - botOff),
            insertLength: newLines.length - botOff - topOff
        });
    }

    revertDiff = function(lastOp, antiStack) {
        // remove inserted section and replace with what was previously removed
        var removed = self.data.splice(lastOp.index, lastOp.insertLength, ...lastOp.removed);
        antiStack.push({
            operation: lastOp.operation,
            index: lastOp.index,
            removed,
            insertLength: lastOp.removed.length
        });
        cursorAfterLine(lastOp.index + lastOp.removed.length);
    }

    /* File Handling Helpers */

    confirmPromise = function(resolve, reject, title, text) {
        new PNotify({
            title,
            text,
            type: "alert",
            hide: false,
            buttons: {
                sticker: false,
                closer: false
            },
            confirm: {
                confirm: true,
                buttons: [
                    {
                        text: "Yes",
                        addClass: "btn-primary",
                        click: function(notify) {
                            notify.remove();
                            resolve();
                        }
                    },
                    {
                        text: "Cancel",
                        click: function(notify) {
                            notify.remove();
                            reject("file already exists, do not overwrite");
                        }
                    }
                ]
            }
        });
    }

    generateGcodeHeader = function(filename = "Tune") {
        var who = parentVM.settingsVM.loginState.username();
        return [
            `;${filename} composed by ${who} using the M300 PWM Buzzer Plugin`,
            `;${new Date()}`,
            `;`,
            `;LAYER_COUNT:0`,
            `;LAYER:0`,
            ``
        ];
    }

    generateGcodeFooter = function() {
        return [
            ``,
            `;End of Gcode`,
            ``
        ];
    }

    generateFile = function(filenamePrompt = false, asBlob = false) {
        return new Promise(function(resolve, reject) {
            if (!filenamePrompt) {
                return resolve();
            }

            new PNotify({
                title: "M300 PWM Buzzer Plugin",
                text: "What file name would you like to save your M300 Composition to?",
                type: "info",
                icon: "icon-file",
                hide: false,
                buttons: {
                    sticker: false,
                    closer: false
                },
                confirm: {
                    prompt: true,
                    prompt_default: self.filename,
                    buttons: [
                        {
                            text: "Okay",
                            addClass: "btn-primary",
                            click: function(notify, result) {
                                notify.remove();
                                if (!result) {
                                    reject("canceled");
                                } else {
                                    resolve(result);
                                }
                            }
                        },
                        {
                            text: "Cancel",
                            click: function(notify) {
                                notify.remove();
                                reject("canceled");
                            }
                        }
                    ]
                }
            });
        })
        .then(function(filename) {
            if (filename) {
                if (filename.indexOf(".") < 0) {
                    filename += ".gcode";
                }

                self.filename = filename;
            }

            var hasHeader = self.data().length > 0 && !!self.data()[0].match(/;.*composed by.*using the M300 PWM Buzzer Plugin/);
            var data = (hasHeader ? [] : generateGcodeHeader(filename)).concat(self.data(), (hasHeader ? [] : generateGcodeFooter())).join("\n");

            if (asBlob) {
                return new Blob([data], { type: "plain/text" });
            } else {
                return data;
            }
        });
    }

    /* Scrolling/Caret Helpers */

    cursorAfterLine = function (line = self.line()) {
        // find end of line and update after yielding to let the computed observable update
        var nextCursor = 0;
        for (var index = 0; index < line; index++) {
            nextCursor += self.data()[index].length + 1;
        }
        setTimeout(function() {
            $(TEXTAREA_ID).prop("selectionStart", nextCursor);
            $(TEXTAREA_ID).prop("selectionEnd", nextCursor);    
            self.compScroll();
            self.scrollCompositionCursorInView();
        }, 0);
    }

    self.scrollCompositionCursorInView = function() {
        var textarea = $(TEXTAREA_ID);
        if (self.caretTop() < 0) {
            textarea.prop("scrollTop", textarea.prop("scrollTop") + self.caretTop());
        } else if ((self.caretTop() + 20) > textarea.prop("clientHeight")) {
            textarea.prop("scrollTop", textarea.prop("scrollTop") + self.caretTop() + 20 - textarea.prop("clientHeight"));
        }
    }

    /* Composition Helpers */

    insertData = function(data) {
        var line = self.line();
        var overwrite = self.lineIsEmpty() ? 1 : 0;
        if (self.cleanupLocked()) {
            data = smartSnapLine(data);
        }
        var removed = self.data.splice(line, overwrite, data);
        commitOperation({
            operation: BACKSTACK_ACTIONS.INSERT,
            index: line,
            removed,
            insertLength: 1
        });
        self.line(self.line() + 1);
        cursorAfterLine();
    }

    self.insertNote = function(note, duration) {
        insertData(`M300 S${FREQS[note]} P${duration} ;${note}`);
    }

    self.insertPause = function(duration) {
        insertData(`M300 S0 P${duration}`);
    }

    smartSnapLine = function(line) {
        var match = line.match(/M300.*\sP(\d+\.?\d*)/i);
        if (!match) { return line; }
        var intDur, dur;
        if (match[1] < QUARTER_NOTE_DURATION) {
            // try 16th notes for durations less than a quarter-note
            intDur = Math.max(1, Math.round(match[1] / (QUARTER_NOTE_DURATION / 4)));
            dur = intDur * (QUARTER_NOTE_DURATION / 4);
        } else {
            // look for nearest quarter-note duration
            intDur = Math.round(match[1] / QUARTER_NOTE_DURATION);
            dur = intDur * QUARTER_NOTE_DURATION;
        }
        return line.replace(/(M300.*\sP)(\d+\.?\d*)/i, `$1${dur}`);
    }
}
