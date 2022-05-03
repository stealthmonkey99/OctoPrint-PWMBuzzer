function MidiTimings() {
    var self = this;

    var bpms = [{ tick: 0, bpm: 120 }]; // default bpm is 120 if not specified
    var timeDivision;

    self.setTimeDivision = function(value) {
        timeDivision = value;
    }

    self.getTimeDivision = function() {
        return timeDivision;
    }

    self.addBpmAtTick = function(tick, bpm) {
        if (bpms.length < 1) {
            bpms.push({
                tick,
                bpm
            });
            return;
        }

        var i = bpms.length;
        while (i > 0 && bpms[i - 1].tick >= tick) { i--; }
        var removeLen = i < bpms.length && bpms[i].tick === tick ? 1 : 0;
        bpms.splice(i, removeLen, {
            tick,
            bpm
        });
    }

    self.getBpmAtTicks = function(ticks) {
        if (ticks < 0) { return 120; }
        var i = bpms.length - 1;
        while (i > 0 && bpms[i].tick > ticks) { i--; }
        return bpms[i].bpm;
    }

    self.calcDuration = function(ticks, currentTick, speedFactor = 1) {
        if (timeDivision.type === "ticksPerBeat") {
            var beats = ticks / timeDivision.ticksPerBeat;
            var bpm = self.getBpmAtTicks(currentTick) * speedFactor;
            var ms = (beats / (bpm / 60)) * 1000;
            return {
                bpm: Math.round(bpm),
                beats: beats.toFixed(2),
                ms: ms.toFixed(2)
            };
        } else {
            throw new Error(`'${timeDivision.type}' time divisions not yet supported`);
        }
    }
}
