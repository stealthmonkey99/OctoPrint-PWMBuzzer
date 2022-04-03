from abc import ABC, abstractmethod
import logging

try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
except ImportError:
    GPIO_AVAILABLE = False

class Buzzer(ABC):
    def __init__(self):
        pass

    @abstractmethod
    def is_enabled():
        pass

    @abstractmethod
    def start(self, frequency):
        pass

    @abstractmethod
    def stop(self):
        pass

class HardwareBuzzer(Buzzer):
    def __init__(self, enabled, pin, duty_cycle):
        self._logger = logging.getLogger(__name__+"."+self.__class__.__name__)

        self._pwm = None
        self.set_settings(enabled, pin, duty_cycle)

    def Available():
        return GPIO_AVAILABLE

    def set_settings(self, enabled, pin, duty_cycle):
        if enabled is not None:
            self._enabled = bool(enabled)
        if pin is not None:
            self._pin = int(pin)
        if duty_cycle is not None:
            self._duty_cycle = int(duty_cycle)

        self._logger.info("HardwareBuzzer set to enabled {self._enabled} pin {self._pin} with duty cycle {self._duty_cycle}".format(**locals()))

    def is_enabled(self):
        return HardwareBuzzer.Available() and self._enabled

    def start(self, frequency):
        if not self.is_enabled():
            return

        self._logger.debug("🎵 starting tone... {frequency}Hz (using BCM pin {self._pin} at {self._duty_cycle}% duty cycle)".format(**locals()))
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(self._pin, GPIO.OUT)
        self._pwm = GPIO.PWM(self._pin, frequency)
        self._pwm.start(self._duty_cycle)

    def stop(self):
        # Stop hardware tone regardless of feature enablement (don't leave a tone running)
        if not HardwareBuzzer.Available():
            return

        if self._pwm is not None:
            self._pwm.stop()
            self._pwm = None
            GPIO.cleanup()
        elif self._enabled:
            self._logger.warn("Hardware buzzer is enabled, but reference to PWM buzzer wasn't found when trying to stop the tone.")

class SoftwareBuzzer(Buzzer):
    def __init__(self, messageFunc, enabled):
        self._logger = logging.getLogger(__name__+"."+self.__class__.__name__)

        self._sendMessageImplementation = messageFunc
        self.set_settings(enabled)

    def set_settings(self, enabled):
        if enabled is not None:
            self._enabled = bool(enabled)

        self._logger.info("SoftwareBuzzer set to enabled {self._enabled}".format(**locals()))

    def is_enabled(self):
        return self._enabled

    def start(self, frequency):
        self._sendMessageImplementation({
            "action": "software_tone_start",
            "frequency": frequency,
        })

    def stop(self):
        self._sendMessageImplementation({
            "action": "software_tone_stop",
        })
