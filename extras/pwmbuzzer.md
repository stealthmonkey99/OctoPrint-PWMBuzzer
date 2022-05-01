---
layout: plugin

id: pwmbuzzer
title: OctoPrint-PWMBuzzer
description: Uses PWM via GPIO to sound tones whenever an M300 command is encountered
authors:
- Matt Bielich
license: AGPLv3

date: 2022-03-29

homepage: https://github.com/stealthmonkey99/OctoPrint-PWMBuzzer
source: https://github.com/stealthmonkey99/OctoPrint-PWMBuzzer
archive: https://github.com/stealthmonkey99/OctoPrint-PWMBuzzer/archive/main.zip

tags:
- gpio
- pwm
- buzzer
- beep
- m300
- music
- gcode

screenshots:
- url: /assets/img/plugins/pwmbuzzer/config.png
  alt: Configuration settings panel
  caption: Configuration of Hardware and Software buzzers for handling M300 commands
- url: /assets/img/plugins/pwmbuzzer/events.png
  alt: Events settings panel
  caption: Link system and printer events to M300 tunes that play when they are triggered
- url: /assets/img/plugins/pwmbuzzer/composer.png
  alt: Composer settings panel
  caption: Use the tools in the Composer tab to easily generate your own M300 tunes

featuredimage: /assets/img/plugins/pwmbuzzer/composer.png

compatibility:

  os:
  - linux

  python: ">=3,<4"

---

# OctoPrint-PWMBuzzer

If your 3D printer doesn't have a speaker or natively support [M300 commands](https://reprap.org/wiki/G-code#M300:_Play_beep_sound) for making beeps, this plugin is for you!

Inspired by [@jneilliii](https://github.com/jneilliii)'s [M300Player plugin](https://github.com/jneilliii/OctoPrint-M300Player): you can use a simple (and cheap) passive buzzer, attach it to your Raspberry Pi's GPIO pins, and route M300 commands through it using [Pulse-Width Modulation (PWM)](https://en.wikipedia.org/wiki/Pulse-width_modulation).

## Setup

### Hardware Setup

To get started, simply connect your passive buzzer to a ground pin and the (+) side to a triggering GPIO pin, like GPIO16 (BCM).  You can find more details online in various tutorials ([example](https://github.com/stealthmonkey99/OctoPrint-PWMBuzzer)).

![GPIO Wiring Diagram](/assets/img/plugins/pwmbuzzer/gpio-pwm-buzzer-diagram.png)

### Which Buzzer to Use?

I don't have a "recommended" buzzer or speaker - they are all going to sound uniquely awful.  My key advice would be to not spend a lot of money on one if you don't already have something laying around.  Some options I have verified work:

- https://www.adafruit.com/product/1898
- https://www.adafruit.com/product/1891
- https://www.amazon.com/gp/product/B07MRJKHCQ (I removed the buzzer when I was done practicing soldering)

Larger speakers may require more than the 3.3V we're using from a GPIO pin as diagramed above.  You might also experiment with amplifying, e.g. [using 5V like I have seen others try](https://raspberrypi.stackexchange.com/questions/61547/different-frequencies-with-piezo-buzzer-python).

### Can I use the audio jack?

Sorry, no - this plugin only works over the GPIO pins so you will not be able to hear tones through speakers or headphones plugged into the audio jack.  There is a software buzzer option that _does_ play through your computer's audio jack, but this requires you to be actively logged into the OctoPrint client in your browser for the tones to be played.

### Plugin Setup

Install via the bundled [Plugin Manager](https://docs.octoprint.org/en/master/bundledplugins/pluginmanager.html)
or manually using this URL:

    https://github.com/stealthmonkey99/OctoPrint-PWMBuzzer/archive/main.zip

## Configuration

Once you have connected your passive buzzer to your Raspberry Pi and installed the plugin, launch the plugin settings dialog in your OctoPrint client to configure it.

![Configuration Panel](/assets/img/plugins/pwmbuzzer/config.png)

From here you can enable the passive buzzer and indicate which GPIO pin the (+) side is connected to.  You may want to play around with the Duty Cycle setting to see what works best for your buzzer.  These buzzers won't sound _great_ but they'll get the job done!

Optionally, you might also choose to enable a software buzzer that simulates M300 commands in your web browser while you're actively connected to OctoPrint.  This has not been tested in all browsers yet, but you're welcome to try it out.

Once you have chosen your buzzer configuration settings you can test them out (hardware and/or software) using the "Play Default Tone" button.  You can also set a default frequency and duration to be played any time an M300 command is encountered without parameters.

> TROUBLESHOOTING: if you're not hearing the tone play on your speaker, make sure another plugin isn't attempting to configure the same GPIO pin.

Don't forget to save your settings before you continue!

### What is Duty Cycle?

PWM applies an electrical signal on-and-off repeatedly, and the [duty cycle](https://en.wikipedia.org/wiki/Pulse-width_modulation#Duty_cycle) describes how long the signal is "on" per each repetition.  It depends on your specific buzzer, but it may make yours sound slightly smoother at 50% (a square wave, equal parts "on" vs. "off") vs. a lower percentage.  Then again, you may not notice any change in the sound quality of your buzzer as you adjust and try out different duty cycle values.

## Events

Here's where the magic happens... not only can your printer now handle M300 commands, but you can set up your OctoPrint instance to play music when certain events occur!

![Events Panel](/assets/img/plugins/pwmbuzzer/events.png)

Next to each event you'll see a drop-down for selecting a preset or any .gcode files found in your local storage (not SD card) that contain M300 commands.  Select whatever tune you'd like, then click "Try it" to play it.  Keep in mind that you'll need to have saved your settings on the Configurations settings panel before trying to play these M300 commands.

> NOTE: if you upload or save new .gcode files, you'll need to restart OctoPrint before they'll show up in the Events settings panel.

## Composer

Feeling creative?  Use the Composer settings panel to generate your own tunes for playback!

![Composer Panel](/assets/img/plugins/pwmbuzzer/composer.png)

Just press-and-hold any of the piano keys to hear them.  When you release the key, it will save your "note" as generated Gcode.  There are also some tools below the generated Gcode that you might find helpful:

- Hit a wrong note?  Use the "Undo" button to quickly remove the last note you pressed or change you made.
- Need a rest between notes?  "Insert Pause" will drop one at the end of your composition.
- Use "Reverse" to play your composition backwards... you can always hit "Reverse" again to put it back.
- Make your tune more rigid and robotic using the "Snap Durations" button.  This will try to normalize the durations of your notes.
  - Toggle the "Snap Durations" checkbox to auto-normalize your durations as you record new notes.
- "Clear" simply empties out your composition so you can start on another one.
- "Send Gcode to Printer" is an easy way to play back your composition.
- Once you have finalized your masterpiece you can use the drop-down options to:
  - "Save Gcode File" in your local storage (SD card storage not supported) under the "M300 Compositions" folder
  - "Open Gcode File" to load from local storage for viewing or editing.
  - "Download Gcode" so you have a copy on your computer
  - "Copy Gcode to Clipboard" if you want to paste it into an email, etc.
  - "Import MIDI file" will try and generate a tune from parsed MIDI data in a file of your choosing.

### Importing MIDI Files

> NOTE: this feature is being newly introduced to version 1.1 of the plugin and is **highly experimental**.  Try it out with your favorite MIDI files, but don't be too surprised if:
>
> 1) your imported tune sounds nothing like what you expected
> 1) your imported tune has the right melody but contains extra artifacts or unexpected tones
> 1) your file doesn't import at all
>
> Feel free to [file an issue](https://github.com/stealthmonkey99/OctoPrint-PWMBuzzer/issues/new?labels=bug,MIDI+Importer) if you encounter a reproducable problem, and be sure to include the file you're trying to import.

The MIDI file format provides a standard for sending data to MIDI devices, and is most often used for representing music by sending commands like "note on" and "note off".  By importing a MIDI file, we can look for these music-related commands and turn them into M300 Gcode commands.

MIDI devices typically handle data for up to 16 channels.  Often times authors will use different channels for each instrument (though this is not a strict requirement), so generally speaking you can consider each channel as being a separate instrument.  As such, the plugin only supports importing a single channel at this time.  After you select a file to import, you'll be shown a list of channels to pick from.  If the MIDI file contains textual data or information about the suggested instrument to use for each channel, it will be displayed to help you in selecting the desired channel.  If not, you may have to experiment and try importing different channels one at a time.

MIDI files can contain multiple tracks of data, and each track can include commands for multiple channels.  Many times you will find that files utilize one track per channel (or sometimes one track for _all_ channels), but occassionally you'll find data in multiple tracks for a given channel (e.g. left-hand vs. right-hand of a piano score).  After you've selected a channel to import, you'll be shown a list of tracks associated with that channel.  Pick one or more of the tracks and the data from all of your selected tracks will be merged during the import process.

The "Display Title" option just includes the MIDI file's name as an M117 command at the start of the generated Gcode.  Similarly, if any of the MIDI tracks contain textual data these can be displayed as M117 commands with the "Display Track Text" option.  Not all printers will have an LCD display or natively support M117 commands (check out my [Status OLED plugin](https://github.com/stealthmonkey99/OctoPrint-StatusOLED) for a cheap alternative way to handle these), but it should be safe to include either way.

Since each channel often represents a single instrument, you might find that your desired channel doesn't start right away (e.g. if you select a melody channel that starts after an intro from other channels).  "Ignore rest before first note in channel" allows you to skip the very first pause that would normally line the channel up with the others.

Finally, most MIDI devices are polyphonic and support playing multiple notes at the same time, so imported files may contain data for notes that are started at the same time.  M300 commands are monophonic as they are handled in serial and only support a single tone at one time.  The "if chords are played" option lets you choose if the first or last note encountered should be given preference when generating tunes from the important data.

Try it out with this sample MIDI file:

    https://github.com/stealthmonkey99/OctoPrint-PWMBuzzer/raw/main/assets/midi/plugins/pwmbuzzer/Twinkle.midi

## Support & Contributing

This is my first OctoPrint plugin and it's still a bit experimental.  Please feel free to open issues if you encounter any bugs.  I'm also happy to take contributions if you'd like to open a pull request to make any changes.

I hope you find this useful and fun!  If you like my plugin or want to support my random coding projects you can always
[![Buy me a coffee](/assets/img/plugins/pwmbuzzer/bmc-button-sm.png)](https://www.buymeacoffee.com/mbielich)

Enjoy!
