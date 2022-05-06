function MidiFile(arrayBuffer) {
    var self = this;

    var data = new Uint8Array(arrayBuffer);
    var pos = 0;
    var trackNumber = 0;
    var trackEndIndex = 0;

    self.readBytes = function(len = 4, littleEndian = false) {
        var bytes = data.slice(pos, pos + len);
        if (littleEndian) {
            bytes.reverse();
        }
        bytes = bytes.reduce((sum, byte) => (sum << 8) | byte, 0);
        pos += len;
        return bytes;
    }

    self.readVLV = function() {
        var value = 0;
        do {
            value <<= 7;
            value += (data[pos] & 0x7F);
        } while ((data[pos++] & 0x80) !== 0);
        return value;
    }

    self.readASCII = function(len = 1) {
        var text = String.fromCharCode(...data.slice(pos, pos + len));
        pos += len;
        return text;
    }

    self.readSequencerSpecific = function(eventLength) {
        var info;
        var manufacturerId = self.readBytes(1);
        if (manufacturerId !== 0) {
            info = self.readBytes(eventLength - 1);
        } else {
            pos--;
            manufacturerId = self.readBytes(3);
            info = self.readBytes(eventLength - 3);
        }
        return {
            manufacturerId,
            info
        };
    }

    self.readChannelEvent = function(category) {
        var status = category;
        if (Object.values(MIDI_EVENTS.MIDI_CHANNEL).indexOf((status & 0xF0) >> 4) < 0) {
            if (runningStatus === null) {
                throw new Error("Expected a running status byte but did not have one");
            }
            // use the running status and rewind a byte before reading in the first param below
            status = runningStatus;
            pos--;
        } else {
            // update the running status buffer for future messages
            runningStatus = status;
        }
        var eventType = (status & 0xF0) >> 4;
        var midiChannel = (status & 0x0F);
        var params = [];
        params.push(self.readBytes(1));     // all channel events have at least one param
        if (eventType !== MIDI_EVENTS.MIDI_CHANNEL.PROGRAM_CHANGE && eventType !== MIDI_EVENTS.MIDI_CHANNEL.CHANNEL_AFTERTOUCH) {
            params.push(self.readBytes(1)); // some channel events have a second param
        }
        return {
            status,
            eventType,
            midiChannel,
            params
        };
    }

    self.readFileHeader = function() {
        // check for header marker ("MThd" in ASCII)
        var marker = self.readBytes(4);

        // .rmi files are MIDI wrapped in a RIFF format, so check if this has a RIFF
        // header and extract the MIDI portion if so before continuing
        if (marker === MIDI_HEADER_RIFF) {
            var filesize = self.readBytes(4, true);
            var rmidMarker = self.readBytes(4);
            var dataMarker = self.readBytes(4);
            var chunkSize = self.readBytes(4, true);
            if (rmidMarker !== MIDI_HEADER_RMID || dataMarker != MIDI_HEADER_data) {
                throw new Error("Invalid header data - must be a valid RMIDI file");
            }
            data = data.slice(0, (pos + chunkSize));    // ignore other RIFF chunks after the MIDI data chunk
            marker = self.readBytes(4);
        }

        var numBytesInHeader = self.readBytes(4);
        var midiType = self.readBytes(2);
        var numTracks = self.readBytes(2);
        var timeDivision = self.readBytes(2);
        if (marker !== MIDI_HEADER_MThd || numBytesInHeader !== 6 || midiType > 2 || numTracks < 1) {
            throw new Error("Invalid header data - must be a valid MIDI file with at least one track");
        }

        return {
            midiType,
            numTracks,
            timeDivision
        };
    }

    self.readTrackHeader = function() {
        // check track marker ("MTrk" in ASCII)
        var marker = self.readBytes(4);
        var numBytesInTrack = self.readBytes(4);
        if (marker !== MIDI_HEADER_MTrk || numBytesInTrack < 1) {
            throw new Error("Invalid track data - must be a valid MIDI file");
        }

        trackNumber++;
        trackEndIndex = pos + numBytesInTrack;

        return {
            trackNumber,
            numBytesInTrack
        };
    }

    self.hasMoreDataInFile = function() {
        return pos < data.length;
    }

    self.hasMoreDataInTrack = function() {
        return pos < trackEndIndex;
    }
}
