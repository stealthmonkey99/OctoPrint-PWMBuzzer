function MidiChannel(id, port = 0) {
    var self = this;
    self.id = id;
    self.number = id + 1;
    self.port = port;
    self.tracks = new Set();
    self.selectedTracks = ko.observableArray();
    var notes = [];
    var notesOn = [];
    var programs = [];

    self.addTrack = function(track) {
        self.tracks.add(track);
    }

    self.changeProgram = function(ticks, program) {
        programs.push({ tick: ticks, program });
    }

    self.getDescription = function() {
        var title = `Channel #${self.number}`;
        if (programs.length > 0) {
            var program = programs[0].program;
            var programGroup = Math.trunc(program / 8);
            title += `: ${MIDI_PROGRAM_GROUPS[programGroup]} > ${MIDI_PROGRAMS[program]}`;
        }

        if (self.tracks.size === 1) {
            var track = self.tracks.entries().next().value[1];
            return `${title} (${notes.length} notes from ${track.getDescription()})`;
        } else {
            return `${title} (${notes.length} notes from ${self.tracks.size} tracks)`;
        }
    }

    self.noteOn = function(track, ticks, note) {
        // first check if the note is already on (perhaps just changing pressure) - return if so, don't change anything
        for (var i = 0; i < notesOn.length; i++) {
            if (notesOn[i].note === note) { return; }
        }

        self.addTrack(track);
        notesOn.push({
            track,
            note,
            start: ticks
        });
    }

    self.noteOff = function(ticks, note) {
        // first verify we had the note start already tracked - return if not as it's unexpected
        var i = notesOn.length - 1;
        for (; i >= 0 ; i--) {
            if (notesOn[i].note === note) { break; }
        }
        if (i === -1) { return; }

        // otherwise, we'll remove it from the stack at this point and add it to the array of played notes
        var removedNote = (notesOn.splice(i, 1))[0];
        removedNote.end = ticks;
        notes.push(removedNote);
    }

    self.endChannel = function(ticks) {
        // clear out any unfinished notes
        while (notesOn.length > 0) {
            var removedNote = notesOn.pop();
            removedNote.end = ticks;
            notes.push(removedNote);
        }

        if (self.tracks.size === 1) {
            var track = self.tracks.entries().next().value[1];
            self.selectedTracks([track]);
        } else {
            self.selectedTracks([]);
        }
    }

    self.generateTune = function(gcode, timings, options = {}) {
        var lastNoteTicks = 0;
        var lastProgram = 0;

        // filter to only selected tracks
        var keepTracks = new Set(self.selectedTracks());
        var filteredNotes = notes.filter(function(note) {
            return keepTracks.has(note.track);
        });
        self.selectedTracks().forEach(function(track) {
            gcode.comment(`Track ${track.id}`);
            track.texts.forEach(function(item, index) {
                if (options.displayTrackText) {
                    gcode.outputText(index > 0 ? item.text : `Track ${track.id}: ${item.text}`);
                } else {
                    gcode.comment(item.text);
                }
            });
        });

        // sort notes by start ticks
        filteredNotes.sort(function(a, b) {
            return a.start < b.start ? -1 : a.start > b.start ? 1 : 0;
        });

        // iterate through each note to determine what to play
        for (var i = 0; i < filteredNotes.length; i++) {
            // check if we've changed programs
            if (programs.length > lastProgram && lastNoteTicks >= programs[lastProgram].tick) {
                var newProgram = programs[lastProgram].program;
                var newProgramGroup = Math.trunc(newProgram / 8);
                gcode.comment(`${MIDI_PROGRAM_GROUPS[newProgramGroup]}: ${MIDI_PROGRAMS[newProgram]}`);
                lastProgram++;
            }

            var note = filteredNotes[i];
            var nextNote = i < filteredNotes.length - 1 ? filteredNotes[i + 1] : undefined;

            // check if we've already past this point in time (e.g. notes started at same tick mark)
            if (note.start < lastNoteTicks) {
                continue;
            }

            // check if there's a delta of time since the last note, insert a rest
            var restTicks = 0;
            if (note.start > lastNoteTicks) {
                restTicks = note.start - lastNoteTicks;
                if (lastNoteTicks > 0 || !options.skipInitialRest()) {
                    var restDuration = timings.calcDuration(restTicks, lastNoteTicks);
                    gcode.outputRest(restDuration);
                }
            }
            var playTicks = note.end - note.start;
            if (nextNote && nextNote.start > note.start && nextNote.start < note.end) {
                playTicks = nextNote.start - note.start;
            } else if (nextNote && nextNote.start === note.start && !options.firstNoteWins()) {
                continue;
            }
            var playDuration = timings.calcDuration(playTicks, note.start);
            gcode.outputTone(note.note, playDuration);

            lastNoteTicks += restTicks + playTicks;
        }
    }
}
