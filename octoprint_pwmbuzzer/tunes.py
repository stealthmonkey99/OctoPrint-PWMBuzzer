NO_SELECTION_ID = ":PRESET:NONE"

PRESETS = {
    NO_SELECTION_ID: {
        "name": "None (disabled)"
    },
    ":PRESET:BEEP": {
        "name": "Beep",
        "gcode": [
            "M300 S220 P380"
        ]
    },
    ":PRESET:BEEPBEEP": {
        "name": "Double Beep",
        "gcode": [
            "M300 S220 P180",
            "M300 S0 P20",
            "M300 S220 P180"
        ]
    },
    ":PRESET:SIREN": {
        "name": "Siren",
        "gcode": [
            "M300 S1020 P300",
            "M300 S850 P400",
            "M300 S1020 P300",
            "M300 S850 P400",
            "M300 S1020 P300",
            "M300 S850 P400",
            "M300 S1020 P300",
            "M300 S850 P400"
        ]
    },
    ":PRESET:SLIDEUP": {
        "name": "Slide Up",
        "gcode": [
            "M300 S261.626 P100",
            "M300 S329.628 P100",
            "M300 S391.995 P100",
            "M300 S523.251 P300"
        ]
    },
    ":PRESET:SLIDEDOWN": {
        "name": "Slide Down",
        "gcode": [
            "M300 S523.251 P100",
            "M300 S391.995 P100",
            "M300 S329.628 P100",
            "M300 S261.626 P300"
        ]
    },
    ":PRESET:TWINKLY": {
        "name": "Twinkly",
        "gcode": [
            "M300 S261.626 P150",
            "M300 S261.626 P150",
            "M300 S391.995 P150",
            "M300 S391.995 P150",
            "M300 S440 P150",
            "M300 S440 P150",
            "M300 S391.995 P300"
        ]
    },
    ":PRESET:LG": {
        "name": "LG Jingle",
        "gcode": [
            "M300 S554.365 P450",
            "M300 S739.989 P150",
            "M300 S698.456 P150",
            "M300 S622.254 P150",
            "M300 S554.365 P450",
            "M300 S466.164 P450",
            "M300 S493.883 P150",
            "M300 S554.365 P150",
            "M300 S622.254 P150",
            "M300 S415.305 P150",
            "M300 S466.164 P150",
            "M300 S493.883 P150",
            "M300 S466.164 P450",
            "M300 S554.365 P450",
            "M300 S0 P10",
            "M300 S554.365 P450",
            "M300 S739.989 P150",
            "M300 S698.456 P150",
            "M300 S622.254 P150",
            "M300 S554.365 P450",
            "M300 S739.989 P450",
            "M300 S0 P10",
            "M300 S739.989 P150",
            "M300 S830.609 P150",
            "M300 S739.989 P150",
            "M300 S698.456 P150",
            "M300 S622.254 P150",
            "M300 S698.456 P150",
            "M300 S739.989 P600"
        ]
    },
    ":PRESET:NOKIA": {
        "name": "Nokia Ringtone",
        "gcode": [
            "M300 S659.255 P100",
            "M300 S587.33 P100",
            "M300 S369.994 P200",
            "M300 S415.305 P200",
            "M300 S554.365 P100",
            "M300 S493.883 P100",
            "M300 S293.665 P200",
            "M300 S329.628 P200",
            "M300 S493.883 P100",
            "M300 S440 P100",
            "M300 S277.183 P200",
            "M300 S329.628 P200",
            "M300 S440 P400"
        ]
    },
    ":PRESET:MARIO": {
        "name": "Mario Fanfare",
        "gcode": [
            "M300 S130 P100",
            "M300 S262 P100",
            "M300 S330 P100",
            "M300 S392 P100",
            "M300 S523 P100",
            "M300 S660 P100",
            "M300 S784 P300",
            "M300 S660 P300",
            "M300 S146 P100",
            "M300 S262 P100",
            "M300 S311 P100",
            "M300 S415 P100",
            "M300 S523 P100",
            "M300 S622 P100",
            "M300 S831 P300",
            "M300 S622 P300",
            "M300 S155 P100",
            "M300 S294 P100",
            "M300 S349 P100",
            "M300 S466 P100",
            "M300 S588 P100",
            "M300 S699 P100",
            "M300 S933 P300",
            "M300 S933 P100",
            "M300 S933 P100",
            "M300 S933 P100",
            "M300 S1047 P400"
        ]
    },
}
