function MidiTrack(id) {
    var self = this;
    self.id = id;
    self.texts = [];
    self.channels = new Set();

    self.addText = function(text, eventType) {
        self.texts.push({ text, eventType });
    }

    self.addChannel = function(channel) {
        self.channels.add(channel);
    }

    self.getDescription = function() {
        if (self.texts.length > 0) {
            var trackText =
                self.texts.find(function(item) { return item.eventType === MIDI_EVENTS.META.TRACK_NAME; })
                || self.texts.find(function(item) { return item.eventType === MIDI_EVENTS.META.MARKER; })
                || self.texts.find(function(item) { return item.eventType === MIDI_EVENTS.META.INSTRUMENT_NAME; })
                || self.texts.find(function(item) { return item.eventType === MIDI_EVENTS.META.PROGRAM_NAME; })
                || self.texts[0];
            return `Track ${id} - ${trackText.text}`;
        } else {
            return `Track ${id}`;
        }
    }
}
