from abc import ABC, abstractmethod
import logging

try:
    import RPi.GPIO as GPIO
    from rpi_hardware_pwm import HardwarePWM
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
    def __init__(self, messageFunc, enabled, pin, duty_cycle, hardware_timer):
        self._logger = logging.getLogger(__name__+"."+self.__class__.__name__)

        self._pwm = None
        self._sendMessageImplementation = messageFunc

        self._use_hw_timer = None
        self.set_settings(enabled, pin, duty_cycle, hardware_timer)

    def debug(self, enabled):
        self._logger.setLevel(level=logging.DEBUG if enabled else logging.NOTSET)

    def Available():
        return GPIO_AVAILABLE

    def set_settings(self, enabled, pin, duty_cycle, hardware_timer):
        if enabled is not None:
            self._enabled = bool(enabled)
        if pin is not None:
            self._pin = int(pin)
        if duty_cycle is not None:
            self._duty_cycle = int(duty_cycle)
        if hardware_timer is not None and self._use_hw_timer is not bool(hardware_timer):
            self._use_hw_timer = bool(hardware_timer)
            file = open("/boot/config.txt", "a")
            file.write("\n\n# dtoverlay=pwm,pin=12,func=4\n")
            file.close()
            self._sendMessageImplementation({
                "action": "alert",
                "text": "Hardware PWM Timer enabled, a reboot is required.",
                "type": "warning",
                "reboot": True
            })

        self._logger.info("HardwareBuzzer set to enabled {self._enabled} pin {self._pin} with duty cycle {self._duty_cycle} and hardware timer {self._use_hw_timer}".format(**locals()))

    def is_enabled(self):
        return HardwareBuzzer.Available() and self._enabled

    def start(self, frequency):
        if not self.is_enabled():
            return

        self._logger.debug("🎵 starting tone... {frequency}Hz (using BCM pin {self._pin} at {self._duty_cycle}% duty cycle)".format(**locals()))
        if self._use_hw_timer:
            self._pwm = HardwarePWM(pwm_channel=0, hz=frequency)
        else:
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
            if not self._use_hw_timer:
                GPIO.cleanup()
        elif self._enabled:
            self._logger.warn("Hardware buzzer is enabled, but reference to PWM buzzer wasn't found when trying to stop the tone.")

class SoftwareBuzzer(Buzzer):
    def __init__(self, messageFunc, enabled):
        self._logger = logging.getLogger(__name__+"."+self.__class__.__name__)

        self._sendMessageImplementation = messageFunc
        self.set_settings(enabled)

    def debug(self, enabled):
        self._logger.setLevel(level=logging.DEBUG if enabled else logging.NOTSET)

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

class SoftwareVisualBuzzer(Buzzer):
    def __init__(self, messageFunc):
        self._logger = logging.getLogger(__name__+"."+self.__class__.__name__)

        self._sendMessageImplementation = messageFunc
        self._enabled = False

    def debug(self, enabled):
        self._logger.setLevel(level=logging.DEBUG if enabled else logging.NOTSET)

    def is_enabled(self, value = None):
        if value is not None:
            self._enabled = value

        return self._enabled

    def start(self, frequency):
        self._sendMessageImplementation({
            "action": "indicate_software_tone_start",
            "frequency": frequency,
        })

    def stop(self):
        self._sendMessageImplementation({
            "action": "indicate_software_tone_stop",
        })
