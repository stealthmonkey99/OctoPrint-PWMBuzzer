function MidiImporter(observable, debug = false) {
    var self = this;
    self.filename = "file";

    var rawFile;
    var isDebug = debug;
    var debugLines;
    var midiFile;
    var timings;
    var tracks;
    var channels;
    var channelsMap;
    var selectedChannel;
    var options = {};
    var viewModel = observable;
    var parsePromise = {};

    self.selectFile = function() {
        // if we hadn't finished importing a previous instance, clear the state to start fresh
        if (!!viewModel() && viewModel().actions) {
            viewModel().actions.cancel();
        }

        return new Promise(function(resolve, reject) {
            new PNotify({
                title: "M300 PWM Buzzer Plugin",
                text: `Select a MIDI file to import and convert to Gcode: <input id="m300-import-file" type="file" accept="${MIDI_TYPE}">`,
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
                            text: "Continue",
                            addClass: "btn-primary",
                            click: function(notify) {
                                var files = $(IMPORT_FILE_ID).prop("files");
                                if (files.length === 0) {
                                    $(IMPORT_FILE_ID).focus();
                                    return;
                                }

                                notify.remove();
                                rawFile = files[0];
                                self.filename = rawFile.name;
                                resolve();
                            }
                        },
                        {
                            text: "Cancel",
                            click: function(notify) {
                                notify.remove();
                                reject(MIDI_IMPORT_CANCEL);
                            }
                        }
                    ]
                }
            });
        });
    }

    self.initialize = function() {
        if (rawFile.type !== MIDI_TYPE) {
            throw new Error("Wrong file type - must be a MIDI file");
        }

        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function() {
                midiFile = new MidiFile(reader.result);
                rawFile = null;

                // initialize state before parseFile is called
                debugLines = [];
                timings = new MidiTimings();
                tracks = [];
                channels = [];
                channelsMap = new Map();
                selectedChannel = ko.observable();
                options.displayTitle = ko.observable(true);
                options.displayTrackText = ko.observable(true);
                options.skipInitialRest = ko.observable(true);
                options.firstNoteWins = ko.observable(true);

                resolve();
            }
            reader.onerror = function() {
                rawFile = null;
                reject("Unable to read the file");
            }
            reader.readAsArrayBuffer(rawFile);
        });
    }

    getChannelById = function(id, port = 0) {
        var key = `${port}|${id}`;
        if (!channelsMap.has(key)) {
            var channel = new MidiChannel(id, port);
            channelsMap.set(key, channel);
            channels.push(channel);
        }
        return channelsMap.get(key);
    }

    debugComment = function(comment) {
        if (!isDebug) { return; }
        debugLines.push(comment);
    }

    debugMetaEvt = function(cat, dt, len, type, text, params) {
        var typeName = "UNKNOWN";
        for(var prop in MIDI_EVENTS.META) {
            if(MIDI_EVENTS.META.hasOwnProperty(prop) && MIDI_EVENTS.META[prop] === type) {
                typeName = prop;
                break;
            }
        }
        if (text !== undefined) {
            debugComment(`EVT-META (0x${cat.toString(16).toUpperCase()}) ${typeName} (0x${type.toString(16).toUpperCase()}) T[${dt}] text (${len} bytes, ASCII): ${text}`);
        } else if (len > 0 || (params && params.length > 0)) {
            debugComment(`EVT-META (0x${cat.toString(16).toUpperCase()}) ${typeName} (0x${type.toString(16).toUpperCase()}) T[${dt}] params (${len} bytes): ${JSON.stringify(params)}`);
        } else {
            debugComment(`EVT-META (0x${cat.toString(16).toUpperCase()}) ${typeName} (0x${type.toString(16).toUpperCase()}) T[${dt}]`);
        }
    }

    debugSysEvt = function(cat, dt, len, text) {
        debugComment(`EVT-SYST (0x${cat.toString(16).toUpperCase()}) T[${dt}] data (${len} bytes, ASCII): ${text}`);
    }

    debugMidiEvt = function(cat, dt, mev, mch, params) {
        var typeName = "UNKNOWN";
        for(var prop in MIDI_EVENTS.MIDI_CHANNEL) {
            if(MIDI_EVENTS.MIDI_CHANNEL.hasOwnProperty(prop) && MIDI_EVENTS.MIDI_CHANNEL[prop] === mev) {
                typeName = prop;
                break;
            }
        }
        debugComment(`EVT-MIDI (0x${cat.toString(16).toUpperCase()}) ${typeName} (0x${mev.toString(16).toUpperCase()} @ ${mch}) T[${dt}] params: ${JSON.stringify(params)}`);
    }

    self.parseFile = function() {
        var runningStatus = null;

        var fileHeader = midiFile.readFileHeader();

        // first bit of time division determines which type it denotes
        if ((fileHeader.timeDivision & 0x8000) === 0) {
            timings.setTimeDivision({
                type: "ticksPerBeat",
                ticksPerBeat: fileHeader.timeDivision
            });
        } else {
            timings.setTimeDivision({
                type: "framesPerSecond",
                SMPTEframes: (fileHeader.timeDivision & 0x7F00) >> 8,
                ticksPerFrame: (fileHeader.timeDivision & 0x00FF)
            });
        }

        debugComment(`MIDI Type: ${fileHeader.midiType}`);
        debugComment(`Number of Tracks: ${fileHeader.numTracks}`);
        debugComment(`Time Division: ${JSON.stringify(timings.getTimeDivision())}`);

        // parse each track until we've reached the end of the file
        while (midiFile.hasMoreDataInFile()) {
            var trackHeader = midiFile.readTrackHeader();

            // note that each track starts at the same zero tick origin
            var totalTicks = 0;
            var currentTrack = new MidiTrack(trackHeader.trackNumber);

            debugComment("");
            debugComment(`Track ${trackHeader.trackNumber} (${trackHeader.numBytesInTrack} bytes):`);

            while (midiFile.hasMoreDataInTrack()) {
                // read in next event, starting with the variable-length delta time:
                var deltaTime = midiFile.readVLV();
                totalTicks += deltaTime;
                var category = midiFile.readBytes(1);

                switch (category) {
                    case MIDI_CATEGORY.META_FF:
                        var eventType = midiFile.readBytes(1);
                        var eventLength = midiFile.readVLV();
                        switch (eventType) {
                            case MIDI_EVENTS.META.MIDI_CHANNEL_PREFIX:
                                var channel = midiFile.readBytes(eventLength);
                                // TODO: keep a running channel
                                debugMetaEvt(category, deltaTime, eventLength, eventType, undefined, { channel });
                                break;
    
                            case MIDI_EVENTS.META.MIDI_PORT_PREFIX:
                                var port = midiFile.readBytes(eventLength);
                                // TODO: keep a running port (this currently only supports a single port defaulted to 0)
                                debugMetaEvt(category, deltaTime, eventLength, eventType, undefined, { port });
                                break;
    
                            case MIDI_EVENTS.META.SEQUENCE_NUMBER:
                                var patternNumber = midiFile.readBytes(eventLength);
                                debugMetaEvt(category, deltaTime, eventLength, eventType, undefined, { patternNumber });
                                break;
    
                            case MIDI_EVENTS.META.END_OF_TRACK:
                                if (midiFile.hasMoreDataInTrack()) {
                                    throw new Error(`reached end of track ${trackHeader.trackNumber} earlier than expected`);
                                }
                                debugMetaEvt(category, deltaTime, eventLength, eventType);
                                tracks.push(currentTrack);
                                currentTrack.channels.forEach(function(channel) {
                                    channel.endChannel(totalTicks);
                                    debugComment(channel.getDescription());
                                });
                                break;
    
                            case MIDI_EVENTS.META.SET_TEMPO:
                                var mpqn = midiFile.readBytes(eventLength);
                                var bpm = MICROSECONDS_PER_MINUTE / mpqn;
                                timings.addBpmAtTick(totalTicks, bpm);
                                debugMetaEvt(category, deltaTime, eventLength, eventType, undefined, { mpqn, bpm });
                                break;
    
                            case MIDI_EVENTS.META.SMPTE_OFFSET:
                                var hour = midiFile.readBytes(1);
                                var min = midiFile.readBytes(1);
                                var sec = midiFile.readBytes(1);
                                var frames = midiFile.readBytes(1);
                                var subframes = midiFile.readBytes(1);
                                debugMetaEvt(category, deltaTime, eventLength, eventType, undefined, { hour, min, sec, frames, subframes });
                                break;
                                
                            case MIDI_EVENTS.META.TIME_SIGNATURE:
                                var numer = midiFile.readBytes(1);
                                var denom = midiFile.readBytes(1);
                                var metro = midiFile.readBytes(1);
                                var thirtysecondths = midiFile.readBytes(1);
                                debugMetaEvt(category, deltaTime, eventLength, eventType, undefined, { numer, denom, metro, thirtysecondths });
                                break;
    
                            case MIDI_EVENTS.META.KEY_SIGNATURE:
                                var key = midiFile.readBytes(1);
                                var scale = midiFile.readBytes(1);
                                debugMetaEvt(category, deltaTime, eventLength, eventType, undefined, { key, scale });
                                break;
    
                            case MIDI_EVENTS.META.SEQUENCER_SPECIFIC:
                                var ss = midiFile.readSequencerSpecific(eventLength);
                                debugMetaEvt(category, deltaTime, eventLength, eventType, undefined, { manufacturerId: ss.manufacturerId, info: ss.info });
                                break;
        
                            case MIDI_EVENTS.META.TEXT_EVENT:
                            case MIDI_EVENTS.META.COPYRIGHT_NOTICE:
                            case MIDI_EVENTS.META.TRACK_NAME:
                            case MIDI_EVENTS.META.INSTRUMENT_NAME:
                            case MIDI_EVENTS.META.LYRICS:
                            case MIDI_EVENTS.META.MARKER:
                            case MIDI_EVENTS.META.CUE_POINT:
                            case MIDI_EVENTS.META.PROGRAM_NAME:
                            case MIDI_EVENTS.META.DEVICE_NAME:
                            default:
                                // read in the variable-length ASCII:
                                var text = midiFile.readASCII(eventLength);
                                debugMetaEvt(category, deltaTime, eventLength, eventType, text);
                                currentTrack.addText(text, eventType);
                                break;
                        }
                        break;

                    case MIDI_CATEGORY.SYSTEM_F0:  // System Events
                    case MIDI_CATEGORY.SYSTEM_F7:
                        var eventLength = midiFile.readVLV();
                        var asciiData = midiFile.readASCII(eventLength);
                        debugSysEvt(category, deltaTime, eventLength, asciiData);
                        // system messages cancel running status
                        runningStatus = null;
                        break;

                    default:    // MIDI Channel Events
                        var ce = midiFile.readChannelEvent(category);
                        debugMidiEvt(ce.status, deltaTime, ce.eventType, ce.midiChannel, ce.params);
                        var channel = getChannelById(ce.midiChannel);

                        switch (ce.eventType) {
                            case MIDI_EVENTS.MIDI_CHANNEL.NOTE_ON:
                                currentTrack.addChannel(channel);
                                var note = ce.params[0];
                                var velocity = ce.params[1];
                                if (velocity > 0) {
                                    channel.noteOn(currentTrack, totalTicks, note);    
                                } else {
                                    // velocity of 0 indicates to stop a note if there was one
                                    channel.noteOff(totalTicks, note);
                                }
                                break;
    
                            case MIDI_EVENTS.MIDI_CHANNEL.NOTE_OFF:
                                currentTrack.addChannel(channel);
                                var note = ce.params[0];
                                channel.noteOff(totalTicks, note);
                                break;

                            case MIDI_EVENTS.MIDI_CHANNEL.PROGRAM_CHANGE:
                                channel.changeProgram(totalTicks, ce.params[0]);
                                break;
        
                            default:
                                break;
                        }
                        break;
                }
            }    
        }

        // Sort Channels by channel id
        channels.sort(function(a, b) {
            return a.id < b.id ? -1 : 1;
        });

        if (channels.length === 1) {
            selectedChannel(channels[0]);
        }

        if (viewModel) {
            viewModel({
                filename: self.filename,
                type: fileHeader.midiType,
                timeDivision: timings.getTimeDivision(),
                tracks,
                channels,
                selectedChannel,
                options,
                actions: {
                    import: self.import,
                    cancel: self.cancel
                }
            });
        }

        return new Promise(function(resolve, reject) {
            parsePromise.resolve = resolve;
            parsePromise.reject = reject;
        });
    }

    self.import = function() {
        var gcode = new MidiGcodeBuilder();

        // Header
        gcode.comment(`Importing ${self.filename}, converting to .gcode...`);
        if (options.displayTitle) {
            gcode.outputText(self.filename);
        }

        // Generate a tune from the parsed notes in the selected channel
        selectedChannel().generateTune(gcode, timings, options);

        // Include debug details, if applicable
        if (isDebug) {
            gcode.comment([
                "",
                "--------------------------------",
                "File Parsing Details:",
                ""
            ]);
            gcode.comment(debugLines);
        }

        cleanup();
        parsePromise.resolve(gcode.lines);
    }

    self.cancel = function() {
        cleanup();
        parsePromise.reject(MIDI_IMPORT_CANCEL);
    }

    cleanup = function() {
        if (viewModel) {
            viewModel(null);
        }
    }
}

function MidiGcodeBuilder() {
    var self = this;
    self.lines = [];

    self.outputText = function(text = "") {
        self.lines.push(`M117 ${text}`);
    }

    self.outputTone = function(note, duration) {
        if (duration.ms <= 0) { return; }
        var frequency = FREQS[MIDI_NOTES[note]];
        self.lines.push(`M300 S${frequency} P${Math.round(duration.ms)} ;${MIDI_NOTES[note]} (${duration.beats} beats at ${duration.bpm} bpm)`);
    }

    self.outputRest = function(duration) {
        if (duration.ms <= 0) { return; }
        self.lines.push(`M300 S0 P${Math.round(duration.ms)} ;-rest- (${duration.beats} beats at ${duration.bpm} bpm)`);
    }

    self.comment = function(texts = []) {
        if (!Array.isArray(texts)) {
            texts = [texts];
        }
        texts.forEach(function(text){ self.lines.push(`; ${text}`); });
    }
}
