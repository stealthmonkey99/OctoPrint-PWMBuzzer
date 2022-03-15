const OSCILLATOR_TYPE = "sawtooth";

function SoftwareBuzzer(parent) {
    var self = this;
    var parentVM = parent;

    var audioContext = new(window.AudioContext || window.webkitAudioContext)();
    var oscillator = null;

    self.start = function(frequency, duration = undefined) {
        if (!parentVM.sw_enabled()) { return; }

        oscillator = audioContext.createOscillator();
        var gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = parentVM.sw_volume() / 100;
        oscillator.type = OSCILLATOR_TYPE;
        oscillator.frequency.value = frequency;
        oscillator.start();

        if (!duration) { return; }
        setTimeout(self.stop, duration);
    }

    self.stop = function() {
        oscillator && oscillator.stop();
        oscillator = null;
    }
}
