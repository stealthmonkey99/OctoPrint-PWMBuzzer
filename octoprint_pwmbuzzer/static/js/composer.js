const FREQS = {
    "C3": 130.813,  // low-C
    "C#3": 138.591,
    "D3": 146.832,
    "D#3": 155.563,
    "E3": 164.814,
    "F3": 174.614,
    "F#3": 184.997,
    "G3": 195.998,
    "G#3": 207.652,
    "A3": 220.000,
    "A#3": 233.082,
    "B3": 246.942,
    "C4": 261.626,  // middle-C
    "C#4": 277.183,
    "D4": 293.665,
    "D#4": 311.127,
    "E4": 329.628,
    "F4": 349.228,
    "F#4": 369.994,
    "G4": 391.995,
    "G#4": 415.305,
    "A4": 440.000,
    "A#4": 466.164,
    "B4": 493.883,
    "C5": 523.251,  // tenor-C
    "C#5": 554.365,
    "D5": 587.330,
    "D#5": 622.254,
    "E5": 659.255,
    "F5": 698.456,
    "F#5": 739.989,
    "G5": 783.991,
    "G#5": 830.609,
    "A5": 880.000,
    "A#5": 932.328,
    "B5": 987.767
};

const QUARTER_NOTE_DURATION = 200;

const STORAGE_FOLDER = "M300 Compositions";

const DEFAULT_FILENAME = "my-tune.gcode";

const TEXTAREA_ID = "#m300-composition";

function M300Composer(parent) {
    var self = this;
    var parentVM = parent;

    self.data = ko.observableArray([]);
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
    self.filename = DEFAULT_FILENAME;

    appendData = function(data) {
        self.data.push(data);
        self.scrollCompositionToBottom();
    }

    self.pianoKeyPress = function(note) {
        var compositionToneStart = new Date();

        // handle release of the button from anywhere (e.g. if mouse moves outside of the button, still handle the release)
        document.addEventListener("mouseup", self.pianoKeyRelease.bind(self, note, compositionToneStart), { once: true });

        parentVM.issueToneCommand(parentVM.commands.TEST_TONE_START, { frequency: FREQS[note] });
    }

    self.pianoKeyRelease = function(note, startTime) {
        parentVM.issueToneCommand(parentVM.commands.TEST_TONE_STOP);

        var duration = new Date() - startTime;
        self.appendNote(note, duration);
    }

    self.appendNote = function(note, duration) {
        appendData(`M300 S${FREQS[note]} P${duration} ;${note}`);
    }

    self.appendPause = function(duration) {
        appendData(`M300 S0 P${duration}`);
    }

    self.scrollCompositionToBottom = function() {
        $(TEXTAREA_ID).scrollTop($(TEXTAREA_ID)[0].scrollHeight);
    }

    self.play = function() {
        if (self.isEmpty() || !parentVM.printerConnected()) { return; }

        OctoPrint.control.sendGcode(self.data());
    }

    self.edit = function(action, event) {
        switch (action) {
            case "undo":
                if (self.isEmpty()) { return; }

                self.backstack.push(self.data.pop());
                break;

            case "redo":
                if (self.isBackstackEmpty()) { return; }

                self.data.push(self.backstack.pop());
                break;

            case "pause":
                self.appendPause(QUARTER_NOTE_DURATION);
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
                    self.data.removeAll();
                    self.backstack.removeAll();    
                })
                .catch(function() { /* eat cancels */ });

                break;

            case "reverse":
                if (self.isEmpty()) { return; }

                self.data.reverse();

            case "cleanup":
                if (self.isEmpty()) { return; }

                // snap to multiples of QUARTER_NOTE_DURATION
                var lines = self.data();
                lines = lines.map(function(line) {
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
                });
                self.data.removeAll();
                self.data.push(...lines);
                break;

            case "textarea-edit":
                var lines = event.currentTarget.value.split("\n");
                self.data.removeAll();
                if (lines.length !== 1 || lines[0] !== "") {
                    self.data.push(...lines);
                }
                break;

            default:
                break;
        }
        self.scrollCompositionToBottom();
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

            var data = generateGcodeHeader(filename).concat(self.data(), generateGcodeFooter()).join("\n");

            if (asBlob) {
                return new Blob([data], { type: "plain/text" });
            } else {
                return data;
            }
        });
    }
}
