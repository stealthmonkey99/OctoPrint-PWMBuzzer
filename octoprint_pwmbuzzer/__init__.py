# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin

import flask
import re
import time
try:
    import RPi.GPIO as GPIO
    GPIO_ENABLED = True
except ImportError:
    GPIO_ENABLED = False

from octoprint_pwmbuzzer import (
    settings,
    tunes,
    events,
)

INTER_NOTE_PAUSE_DURATION = 0.01

REGEX_LINE_HAS_M300_COMMAND = r"^[^;]*M300"
REGEX_FILE_HAS_ANY_M300_COMMAND = r"[m|M]300"
REGEX_FILE_HAS_UNCOMMENTED_M300_COMMAND = r"(^[^;]*[m|M]300)|(\n[^;]*[m|M]300)"
M300_ANALYSIS_KEY = "m300analysis"

FILE_PARSE_WARN_AFTER = 3

class PwmBuzzerPlugin(
    octoprint.plugin.SettingsPlugin,
    octoprint.plugin.AssetPlugin,
    octoprint.plugin.TemplatePlugin,
    octoprint.plugin.SimpleApiPlugin,
    octoprint.plugin.EventHandlerPlugin,
):
    ##~~ Initialization
    def __init__(self):
        super(PwmBuzzerPlugin, self).__init__()

        self.hw_buzzer = None

    # Called when injections are complete
    def initialize(self):
        if not GPIO_ENABLED:
            self._logger.warn("GPIO could not be initialized.  Hardware buzzer will not be supported.")

    ##~~ SettingsPlugin mixin

    def get_settings_defaults(self):
        return settings.DEFAULT_SETTINGS

    ##~~ AssetPlugin mixin

    def get_assets(self):
        return {
            "js": ["js/pwmbuzzer.js", "js/softwarebuzzer.js", "js/composer.js"],
            "css": ["css/pwmbuzzer.css"]
        }

    ##~~ TemplatePlugin mixin

    def _filter_m300_files(self, file):
        if file["type"] != "machinecode":
            return False

        id = file["path"]
        fileHash = "default"
        if "hash" in file:
            fileHash = file["hash"]

        if M300_ANALYSIS_KEY in file and fileHash in file[M300_ANALYSIS_KEY]:
            return file[M300_ANALYSIS_KEY][fileHash]

        path = self._file_manager.path_on_disk("local", id)
        regex = re.compile(REGEX_FILE_HAS_ANY_M300_COMMAND)
        with open(path, "r") as fileaccess:
            text = fileaccess.read()
            if re.search(regex, text):
                regexu = re.compile(REGEX_FILE_HAS_UNCOMMENTED_M300_COMMAND)
                if re.search(regexu, text):
                    self._file_manager._storage_managers["local"].set_additional_metadata(path=id, key=M300_ANALYSIS_KEY, data=dict([(fileHash, True)]), merge=True)
                    return True

        self._file_manager._storage_managers["local"].set_additional_metadata(path=id, key=M300_ANALYSIS_KEY, data=dict([(fileHash, False)]), merge=True)
        return False

    def _recurse_files(self, folder, filelist = dict()):
        for key in folder["children"]:
            if folder["children"][key]["type"] == "folder":
               self._recurse_files(folder["children"][key], filelist)
            else:
                filelist[folder["children"][key]["path"]] = folder["children"][key]

    def get_template_vars(self):
        start_time = time.time()
        tune_files = dict()
        all_files = self._file_manager._storage_managers["local"].list_files(filter=self._filter_m300_files)
        if all_files is not None:
            for key in all_files:
                if all_files[key]["type"] == "folder":
                    self._recurse_files(all_files[key], tune_files) 
                else:
                    tune_files[all_files[key]["path"]] = all_files[key]

        elapsed = time.time() - start_time
        if elapsed > FILE_PARSE_WARN_AFTER:
            self._logger.warn("Parsing .gcode files for M300 content took %s seconds at startup" % elapsed)

        return {
            "supported_events": events.SUPPORTED_EVENT_CATEGORIES,
            "tune_presets": tunes.PRESETS,
            "tune_files": tune_files,
        }

    def get_template_configs(self):
        return []

    ##~~ EventHandlerPlugin

    def on_event(self, event, payload):
        if event in events.SUPPORTED_EVENTS:
            tune = self._settings.get(["events", event])
            if (tune is None or tune == tunes.NO_SELECTION_ID or (payload is not None and "path" in payload and payload["path"] == tune)):
                return
            self._logger.info("✅ '{event}' event fired, playing tune '{tune}'".format(**locals()))
            self.play_tune(tune)

    ##~~ Softwareupdate hook

    def get_update_information(self):
        return {
            "pwmbuzzer": {
                "displayName": "M300 PWM Buzzer Plugin",
                "displayVersion": self._plugin_version,

                # version check: github repository
                "type": "github_release",
                "user": "stealthmonkey99",
                "repo": "OctoPrint-PWMBuzzer",
                "current": self._plugin_version,

                # update method: pip
                "pip": "https://github.com/stealthmonkey99/OctoPrint-PWMBuzzer/archive/{target_version}.zip",
            }
        }

    ##~~ SimpleApiPlugin mixin

    def get_api_commands(self):
        return {
            "test_tone": ["pin", "frequency", "duration"],
            "test_tone_start": ["pin", "frequency"],
            "test_tone_stop": [],
            "test_tune": ["id"],
        }

    def on_api_command(self, command, data):
        import flask
        if command == "test_tone":
            pin = int(data["pin"])
            frequency = float(data["frequency"])
            duration = float(data["duration"])
            duty_cycle = None
            if "duty_cycle" in data:
                duty_cycle = int(data["duty_cycle"])
            hw_enabled = False
            if "hw_enabled" in data:
                hw_enabled = bool(data["hw_enabled"])

            self.handle_tone_command(None, pin, frequency, duration, duty_cycle, hw_enabled)
        elif command == "test_tone_start":
            pin = int(data["pin"])
            frequency = float(data["frequency"])
            duty_cycle = None
            if "duty_cycle" in data:
                duty_cycle = int(data["duty_cycle"])
            hw_enabled = False
            if "hw_enabled" in data:
                hw_enabled = bool(data["hw_enabled"])

            self.tone_start(pin, frequency, duty_cycle, hw_enabled)
        elif command == "test_tone_stop":
            self.tone_stop()

        elif command == "test_tune":
            self.play_tune(data["id"])

    ##~~ GCode Phase hook

    def sent_m300(self, comm_instance, phase, cmd, cmd_type, gcode, *args, **kwargs):
        if gcode and gcode.upper() == "M300":
            self.handle_tone_command(cmd)

    ##~~ Tone Helpers

    def play_tune(self, id):
        if id is None or id == ":PRESET:NONE":
            return

        if id in tunes.PRESETS:
            gcode = tunes.PRESETS[id]["gcode"]
            if gcode is None:
                return
            self._printer.commands(gcode)
        else:
            path = self._file_manager.path_on_disk("local", id)
            file = open(path, "r")
            lines = file.readlines()
            commands = []
            for line in lines:
                if re.search(REGEX_LINE_HAS_M300_COMMAND, line, re.I) is not None:
                    commands.append(line);
            if len(commands) > 0:
                self._printer.commands(commands)
            else:
                self._logger.warn("Tried to play tune from '{id}' but no M300 commands were detected.".format(**locals()))

    def handle_tone_command(self, cmd, pin = None, frequency = None, duration = None, duty_cycle = None, hw_enabled_override = False):
        if frequency is None:
            match = re.search("S(\d+\.?\d*)", cmd, re.I)
            if match is not None:
                frequency = float(match.group(1))
        if duration is None:
            match = re.search("P(\d+\.?\d*)", cmd, re.I)
            if match is not None:
                duration = float(match.group(1))

        if frequency is None or frequency > 0:
            self.tone_play(pin, frequency, duration, duty_cycle, hw_enabled_override)
        else:
            self.tone_pause(duration)

    def tone_pause(self, duration):
        if duration is None:
            duration = self._settings.get_float(["default_tone", "duration"]) or settings.DEFAULT_SETTINGS["default_tone"]["duration"]

        self._logger.info("🛑 Intercepted a pause (M300): {duration}ms".format(**locals()))
        time.sleep(duration / 1000)

    def tone_play(self, pin, frequency, duration, duty_cycle, hw_enabled_override):
        if pin is None:
            pin = self._settings.get_int(["hardware_tone", "gpio_pin"])
        if duty_cycle is None:
            duty_cycle = self._settings.get_int(["hardware_tone", "duty_cycle"])
        if frequency is None:
            frequency = self._settings.get_float(["default_tone", "frequency"]) or settings.DEFAULT_SETTINGS["default_tone"]["frequency"]
        if duration is None:
            duration = self._settings.get_float(["default_tone", "duration"]) or settings.DEFAULT_SETTINGS["default_tone"]["duration"]

        self._logger.info("🎵 Intercepted a tone (M300): {frequency}Hz {duration}ms (using BCM pin {pin} at {duty_cycle}% duty cycle)".format(**locals()))
        self.tone_start(pin, frequency, duty_cycle, hw_enabled_override)
        time.sleep(duration / 1000)
        self.tone_stop()

    def tone_start(self, pin, frequency, duty_cycle, hw_enabled_override = False):
        # start the tone here
        self._logger.debug("🎵 starting tone... {frequency}Hz (using BCM pin {pin} at {duty_cycle}% duty cycle)".format(**locals()))

        if GPIO_ENABLED and (hw_enabled_override or self._settings.get_boolean(["hardware_tone", "enabled"])):
            GPIO.setmode(GPIO.BCM)
            GPIO.setup(pin, GPIO.OUT)
            self.hw_buzzer = GPIO.PWM(pin, frequency)
            self.hw_buzzer.start(duty_cycle)

        if self._settings.get_boolean(["software_tone", "enabled"]):
            self._plugin_manager.send_plugin_message(self._identifier, {
                "action": "software_tone_start",
                "frequency": frequency,
            })

    def tone_stop(self):
        # stop the tone here
        self._logger.debug("🛑 tone stopped.")

        if GPIO_ENABLED:
            # Stop hardware tone regardless of feature enablement (don't leave a tone running)
            if self.hw_buzzer is not None:
                self.hw_buzzer.stop()
                self.hw_buzzer = None
                GPIO.cleanup()
            elif self._settings.get_boolean(["hardware_tone", "enabled"]):
                self._logger.warn("Hardware buzzer is enabled, but reference to PWM buzzer wasn't found when trying to stop the tone.")

        # Stop software tone regardless of feature enablement (don't leave a tone running)
        self._plugin_manager.send_plugin_message(self._identifier, {
            "action": "software_tone_stop",
        })

        # Pause briefly between notes
        time.sleep(INTER_NOTE_PAUSE_DURATION)

__plugin_name__ = "M300 PWM Buzzer Plugin"

__plugin_pythoncompat__ = ">=3,<4"  # Only Python 3

def __plugin_load__():
    global __plugin_implementation__
    __plugin_implementation__ = PwmBuzzerPlugin()

    global __plugin_hooks__
    __plugin_hooks__ = {
        "octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information,
        "octoprint.comm.protocol.gcode.sent": __plugin_implementation__.sent_m300
    }
