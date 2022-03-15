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
        if (self.isEmpty()) { return; }

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

                if (!!self.composition() && !confirm("Are you sure you want to clear your Gcode?")) {
                    return;
                }
    
                self.data.removeAll();
                self.backstack.removeAll();

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

        var blob = generateFile(true, true);
        if (!blob) { return; }
        var formData = new FormData();
        var path = `${STORAGE_FOLDER}/${self.filename}`;
        formData.append("file", blob, path);
        OctoPrint.files.createFolder("local", STORAGE_FOLDER)
            .then(function() {
                return OctoPrint.files.listForLocation("local", true);
            })
            .then(function(entries) {
                if (OctoPrint.files.entryForPath(path, entries.files)
                    && !confirm(`"${path}" already exists.  Are you sure you want to overwrite the file?`)
                ) {
                    throw new Error("file already exists, do not overwrite");
                }

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

        var blob = generateFile(true, true);
        if (!blob) { return; }
        var fileUrl = URL.createObjectURL(blob);
        var element = document.createElement("a");
        element.setAttribute("href", fileUrl);
        element.setAttribute("download", self.filename);
        element.style.display = "none";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    self.copy = function() {
        if (self.isEmpty()) { return; }

        var data = generateFile();
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
        var filename;
        if (filenamePrompt) {
            filename = prompt("What file name would you like to save your M300 Composition to?", self.filename);
            if (!filename) {
                return;
            }

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
    }
}
