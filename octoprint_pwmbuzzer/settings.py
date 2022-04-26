DEFAULT_SETTINGS = {
    "hardware_tone": {
        "enabled": False,
        "gpio_pin": 16,
        "duty_cycle": 50,
        "suppress_m300_passthrough": False,
    },
    "software_tone": {
        "enabled": True,
        "volume": 0.2,
    },
    "default_tone": {
        # Prusa M300 defaults, see https://reprap.org/wiki/G-code#M300:_Play_beep_sound
        "frequency": 100,
        "duration": 1000,
    },
    "events": {
        "Startup": ":PRESET:SLIDEUP",
        "Shutdown": ":PRESET:SLIDEDOWN",
        "Connected": ":PRESET:NONE",
        "Disconnected": ":PRESET:NONE",
        "ClientOpened": ":PRESET:NONE",
        "ClientClosed": ":PRESET:NONE",
        "PrintStarted": ":PRESET:NONE",
        "PrintDone": ":PRESET:LG",
        "PrintFailed": ":PRESET:SIREN",
        "PrintPaused": ":PRESET:BEEPBEEP",
        "PrintResumed": ":PRESET:NONE",
        "PrintCancelled": ":PRESET:NONE",
        "FileAdded": ":PRESET:NONE",
        "FileRemoved": ":PRESET:NONE",
    }
}
