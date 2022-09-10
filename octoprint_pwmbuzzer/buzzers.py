from abc import ABC, abstractmethod
import logging
import re

try:
    import RPi.GPIO as GPIO
    from rpi_hardware_pwm import HardwarePWM
    GPIO_AVAILABLE = True
except (ImportError, RuntimeError):
    GPIO_AVAILABLE = False

OVERLAY_CONFIG_12 = "dtoverlay=pwm,pin=12,func=4"
OVERLAY_CONFIG_13 = "dtoverlay=pwm,pin=13,func=4"
OVERLAY_CONFIG_18 = "dtoverlay=pwm,pin=18,func=2"
OVERLAY_CONFIG_19 = "dtoverlay=pwm,pin=19,func=2"

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
        self._pin = None
        self.set_settings(enabled, pin, duty_cycle, hardware_timer)

    def debug(self, enabled):
        self._logger.setLevel(level=logging.DEBUG if enabled else logging.NOTSET)

    def Available():
        return GPIO_AVAILABLE

    def set_settings(self, enabled, pin, duty_cycle, hardware_timer):
        pin_changed = False
        if enabled is not None:
            self._enabled = bool(enabled)
        if pin is not None:
            pin_changed = self._pin is not None and self._pin != int(pin)
            self._pin = int(pin)
        if duty_cycle is not None:
            self._duty_cycle = int(duty_cycle)
        if hardware_timer is not None and (self._use_hw_timer is not bool(hardware_timer) or (bool(hardware_timer) and pin_changed)):
            self._use_hw_timer = bool(hardware_timer)
            if not self._use_hw_timer:
                self._sendMessageImplementation({
                    "action": "alert",
                    "text": "Hardware PWM Timer disabled: save your settings and then reboot.  Buzzer may not work properly until you reboot.",
                    "type": "warning",
                    "hide": False,
                    "reboot": True
                })
                return

            configured = False
            config = ""
            if self._pin == 12:
                config = OVERLAY_CONFIG_12
            elif self._pin == 13:
                config = OVERLAY_CONFIG_13
            elif self._pin == 18:
                config = OVERLAY_CONFIG_18
            elif self._pin == 19:
                config = OVERLAY_CONFIG_19

            try:
                file = open("/boot/config.txt", "r")
                rex = r"^\s*{0}".format(config)
                crex = re.compile(rex, re.I)
                for line in file.readlines():
                    if re.search(crex, line) is not None:
                        configured = True
                        break
            except Exception as e:
                self._logger.warn("Error reading '/boot/config.txt': {0}".format(e))

            message = "Hardware PWM Timer enabled: save your settings and then reboot.  Buzzer may not work properly until you reboot."
            if not configured:
                message = "Hardware PWM Timer enabled: save your settings, add <pre>{0}</pre> to '<b>/boot/config.txt</b>' (as root), and then reboot.  Buzzer may not work properly until you reboot.".format(config)
                self._logger.warn("Hardware PWM Timer enabled but not configured, must add '{0}' to /boot/config.txt".format(config))

            self._sendMessageImplementation({
                "action": "alert",
                "text": message,
                "type": "warning",
                "hide": False,
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
            ch = 0 if self._pin == 12 or self._pin == 18 else 1
            self._pwm = HardwarePWM(pwm_channel=ch, hz=frequency)
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
