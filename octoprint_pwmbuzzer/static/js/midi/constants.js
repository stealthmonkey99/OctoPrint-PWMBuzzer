MIDI_TYPES = [".rmi", "audio/mid", "audio/midi", "audio/x-midi"];

MIDI_IMPORT_CANCEL = "MIDI_IMPORT_CANCEL";

IMPORT_FILE_ID = "#m300-import-file";

MIDI_HEADER_MThd = 0x4d546864;
MIDI_HEADER_MTrk = 0x4d54726b;
MIDI_HEADER_RIFF = 0x52494646;
MIDI_HEADER_RMID = 0x524d4944;
MIDI_HEADER_data = 0x64617461;

MIDI_CATEGORY = {
    META_FF: 0xFF,
    SYSTEM_F0: 0xF0,
    SYSTEM_F7: 0xF7,
};

MIDI_EVENTS = {
    MIDI_CHANNEL: {
        NOTE_OFF: 0x8,
        NOTE_ON: 0x9,
        NOTE_AFTERTOUCH: 0xA,
        CONTROLLER: 0xB,
        PROGRAM_CHANGE: 0xC,
        CHANNEL_AFTERTOUCH: 0xD,
        PITCH_BEND: 0xE
    },
    META: {
        SEQUENCE_NUMBER: 0x00,
        TEXT_EVENT: 0x01,
        COPYRIGHT_NOTICE: 0x02,
        TRACK_NAME: 0x03,
        INSTRUMENT_NAME: 0x04,
        LYRICS: 0x05,
        MARKER: 0x06,
        CUE_POINT: 0x07,
        PROGRAM_NAME: 0x08,
        DEVICE_NAME: 0x09,
        MIDI_CHANNEL_PREFIX: 0x20,
        MIDI_PORT_PREFIX: 0x21,
        END_OF_TRACK: 0x2F,
        SET_TEMPO: 0x51,
        SMPTE_OFFSET: 0x54,
        TIME_SIGNATURE: 0x58,
        KEY_SIGNATURE: 0x59,
        SEQUENCER_SPECIFIC: 0x7F
    },
    SYSTEM: {
        NORMAL: 0xF0,
        AUTHORIZATION: 0xF7
    }
};

MIDI_NOTES = [
    //0    1      2     3      4     5     6      7     8      9     10     11
    "C-", "C#-", "D-", "D#-", "E-", "F-", "F#-", "G-", "G#-", "A-", "A#-", "B-",
    //12   13     14    15     16    17    18     19    20     21    22     23
    "C0", "C#0", "D0", "D#0", "E0", "F0", "F#0", "G0", "G#0", "A0", "A#0", "B0",
    //24   25     26    27     28    29    30     31    32     33    34     35
    "C1", "C#1", "D1", "D#1", "E1", "F1", "F#1", "G1", "G#1", "A1", "A#1", "B1",
    //36   37     38    39     40    41    42     43    44     45    46     47
    "C2", "C#2", "D2", "D#2", "E2", "F2", "F#2", "G2", "G#2", "A2", "A#2", "B2",
    //48   49     50    51     52    53    54     55    56     57    58     59
    "C3", "C#3", "D3", "D#3", "E3", "F3", "F#3", "G3", "G#3", "A3", "A#3", "B3",
    //60   61     62    63     64    65    66     67    68     69    70     71
    "C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4",
    //72   73     74    75     76    77    78     79    80     81    82     83
    "C5", "C#5", "D5", "D#5", "E5", "F5", "F#5", "G5", "G#5", "A5", "A#5", "B5",
    //84   85     86    87     88    89    90     91    92     93    94     95
    "C6", "C#6", "D6", "D#6", "E6", "F6", "F#6", "G6", "G#6", "A6", "A#6", "B6",
    //96   97     98    99     100   101   102    103   104    105   106    107
    "C7", "C#7", "D7", "D#7", "E7", "F7", "F#7", "G7", "G#7", "A7", "A#7", "B7",
    //108  109    110   111    112   113   114    115   116    117   118    119
    "C8", "C#8", "D8", "D#8", "E8", "F8", "F#8", "G8", "G#8", "A8", "A#8", "B8",
    //120  121    122   123    124   125   126    127
    "C9", "C#9", "D9", "D#9", "E9", "F9", "F#9", "G9"
];

MICROSECONDS_PER_MINUTE = 60000000;

MIDI_PROGRAM_GROUPS = [
    "Piano",
    "Chromatic Percussion",
    "Organ",
    "Guitar",
    "Bass",
    "Strings",
    "Ensemble",
    "Brass",
    "Reed",
    "Pipe",
    "Synth Lead",
    "Synth Pad",
    "Synth Effects",
    "Ethnic",
    "Percussive",
    "Sound Effects"
];

MIDI_PROGRAMS = [
    /* Piano */      "Acoustic Grand Piano", "Bright Acoustic Piano", "Electric Grand Piano", "Honky-tonk Piano", "Electric Piano 1 (Rhodes)", "Electric Piano 2 (FM patch)", "Harpsichord", "Clavinet",
    /* Chrm Prcsn */ "Celesta", "Glockenspiel", "Music Box", "Vibraphone", "Marimba", "Xylophone", "Tubular Bells", "Dulcimer",
    /* Organ */      "Drawbar Organ", "Percussive Organ", "Rock Organ", "Church Organ", "Reed Organ", "Accordion", "Harmonica", "Tango Accordion",
    /* Guitar */     "Acoustic Guitar (nylon)", "Acoustic Guitar (steel)", "Electric Guitar (jazz)", "Electric Guitar (clean)", "Electric Guitar (muted)", "Electric Guitar (overdriven)", "Electric Guitar (distortion)", "Electric Guitar (harmonics)",
    /* Bass */       "Acoustic Bass", "Electric Bass (finger)", "Electric Bass (picked)", "Fretless Bass", "Slap Bass 1", "Slap Bass 2", "Synth Bass 1", "Synth Bass 2",
    /* Strings */    "Violin", "Viola", "Cello", "Contrabass", "Tremolo Strings", "Pizzicato Strings", "Orchestral Harp", "Timpani",
    /* Ensemble */   "String Ensemble 1", "String Ensemble 2", "Synth Strings 1", "Synth Strings 2", "Choir Aahs", "Voice Oohs (or Doos)", "Synth Voice or Solo Vox", "Orchestra Hit",
    /* Brass */      "Trumpet", "Trombone", "Tuba", "Muted Trumpet", "French Horn", "Brass Section", "Synth Brass 1", "Synth Brass 2",
    /* Reed */       "Soprano Sax", "Alto Sax", "Tenor Sax", "Baritone Sax", "Oboe", "English Horn", "Bassoon", "Clarinet",
    /* Pipe */       "Piccolo", "Flute", "Recorder", "Pan Flute", "Blown bottle", "Shakuhachi", "Whistle", "Ocarina",
    /* Synth Lead */ "Lead 1 (square)", "Lead 2 (sawtooth)", "Lead 3 (calliope)", "Lead 4 (chiff)", "Lead 5 (charang, a guitar-like lead)", "Lead 6 (space voice)", "Lead 7 (fifths)", "Lead 8 (bass and lead)",
    /* Synth Pad */  "Pad 1 (new age/fantasia)", "Pad 2 (warm)", "Pad 3 (polysynth)", "Pad 4 (choir)", "Pad 5 (bowed glass)", "Pad 6 (metallic)", "Pad 7 (halo)", "Pad 8 (sweep)",
    /* Synth FX */   "FX 1 (rain)", "FX 2 (soundtrack)", "FX 3 (crystal)", "FX 4 (atmosphere)", "FX 5 (brightness)", "FX 6 (goblins)", "FX 7 (echoes)", "FX 8 (sci-fi)",
    /* Ethnic */     "Sitar", "Banjo", "Shamisen", "Koto", "Kalimba", "Bag pipe", "Fiddle", "Shanai",
    /* Percussive */ "Tinkle Bell", "Agogô", "Steel Drums", "Woodblock", "Taiko Drum", "Melodic Tom or 808 Toms", "Synth Drum", "Reverse Cymbal",
    /* Sound FX */   "Guitar Fret Noise", "Breath Noise", "Seashore", "Bird Tweet", "Telephone Ring", "Helicopter", "Applause", "Gunshot",
];
