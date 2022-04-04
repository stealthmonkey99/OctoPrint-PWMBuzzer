# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin

import flask
import re
import time

from octoprint_pwmbuzzer import (
    settings,
    tunes,
    events,
    tones,
    buzzers,
    files
)

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

        self.tones = tones.ToneQueue()
        self.hw_buzzer = None
        self.sw_buzzer = None

        self._m300_parser = None

    def _get_m300_parser(self):
        if self._m300_parser is None:
            self._m300_parser = files.M300FileParsingQueue(self._file_manager)
        return self._m300_parser

    # Called when injections are complete
    def initialize(self):
        if not buzzers.HardwareBuzzer.Available():
            self._logger.warn("GPIO could not be initialized.  Hardware buzzer will not be supported.")

    ##~~ SettingsPlugin mixin

    def get_settings_defaults(self):
        return settings.DEFAULT_SETTINGS

    def on_settings_initialized(self):
        self.hw_buzzer = buzzers.HardwareBuzzer(
            self._settings.get_boolean(["hardware_tone", "enabled"]),
            self._settings.get_int(["hardware_tone", "gpio_pin"]),
            self._settings.get_int(["hardware_tone", "duty_cycle"])
        )
        self.sw_buzzer = buzzers.SoftwareBuzzer(
            self.sendMessageToFrontend,
            self._settings.get_boolean(["software_tone", "enabled"]),
        )

    def on_settings_save(self, data):
        self.hw_buzzer.set_settings(
            self._settings.get_boolean(["hardware_tone", "enabled"]),
            self._settings.get_int(["hardware_tone", "gpio_pin"]),
            self._settings.get_int(["hardware_tone", "duty_cycle"])
        )
        self.sw_buzzer.set_settings(
            self._settings.get_boolean(["software_tone", "enabled"])
        )
        return octoprint.plugin.SettingsPlugin.on_settings_save(self, data)

    def _get_active_buzzers(self):
        return [buzzer for buzzer in [self.hw_buzzer, self.sw_buzzer] if buzzer is not None and buzzer.is_enabled()]

    ##~~ AssetPlugin mixin

    def get_assets(self):
        return {
            "js": ["js/pwmbuzzer.js", "js/softwarebuzzer.js", "js/composer.js"],
            "css": ["css/pwmbuzzer.css"]
        }

    ##~~ TemplatePlugin mixin

    def get_template_vars(self):
        tune_files = self._get_m300_parser().get_tune_files()

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
            "settings_changed": ["hw", "sw"],
            "test_tone": ["frequency", "duration"],
            "test_tone_start": ["frequency"],
            "test_tone_stop": [],
            "test_tune": ["id"],
        }

    def on_api_command(self, command, data):
        import flask
        if command == "test_tone":
            frequency = float(data["frequency"])
            duration = float(data["duration"])

            self.handle_tone_command(None, frequency, duration)
        elif command == "test_tone_start":
            frequency = float(data["frequency"])

            self._logger.debug("🎵 starting tone... {frequency}Hz".format(**locals()))
            self.tones.add(tones.Tone(tones.ToneCommand.START, self._get_active_buzzers(), frequency))
        elif command == "test_tone_stop":
            self._logger.debug("🛑 tone stopped.")
            self.tones.add(tones.Tone(tones.ToneCommand.STOP, self._get_active_buzzers()))

        elif command == "test_tune":
            self.play_tune(data["id"])

        elif command == "settings_changed":
            if self.hw_buzzer is not None:
                self.hw_buzzer.set_settings(
                    data["hw"].get("enabled"),
                    data["hw"].get("pin"),
                    data["hw"].get("duty_cycle")
                )
            if self.sw_buzzer is not None:
                self.sw_buzzer.set_settings(
                    data["sw"].get("enabled")
                )

    ##~~ Frontend Message Sending Helper
    def sendMessageToFrontend(self, params):
        self._plugin_manager.send_plugin_message(self._identifier, params)

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
            commands = self._get_m300_parser().get_tune_from_file(id)
            if len(commands) > 0:
                self._printer.commands(commands)
            else:
                self._logger.warn("Tried to play tune from '{id}' but no M300 commands were detected.".format(**locals()))

    def handle_tone_command(self, cmd, frequency = None, duration = None):
        if frequency is None:
            match = re.search("S(\d+\.?\d*)", cmd, re.I)
            if match is not None:
                frequency = float(match.group(1))
        if duration is None:
            match = re.search("P(\d+\.?\d*)", cmd, re.I)
            if match is not None:
                duration = float(match.group(1))
            else:
                duration = self._settings.get_float(["default_tone", "duration"]) or settings.DEFAULT_SETTINGS["default_tone"]["duration"]

        if frequency is None or frequency > 0:
            if frequency is None:
                frequency = self._settings.get_float(["default_tone", "frequency"]) or settings.DEFAULT_SETTINGS["default_tone"]["frequency"]
            self._logger.info("🎵 Intercepted a tone (M300): {frequency}Hz {duration}ms".format(**locals()))
            commandType = tones.ToneCommand.PLAY
        else:
            self._logger.info("🛑 Intercepted a pause (M300): {duration}ms".format(**locals()))
            commandType = tones.ToneCommand.REST

        self.tones.add(tones.Tone(commandType, self._get_active_buzzers(), frequency, duration))

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
