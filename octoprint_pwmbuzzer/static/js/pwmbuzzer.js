/*
 * View model for OctoPrint-PWMBuzzer
 *
 * Author: Matt Bielich
 * License: AGPLv3
 */
$(function() {
    const PLUGIN_IDENTIFIER = "pwmbuzzer";

    const IS_PRESET_REGEX = /^:PRESET:.+/;

    const COMMAND_SETTINGS_CHANGED = "settings_changed";
    const COMMAND_TEST_TONE = "test_tone";
    const COMMAND_TEST_TUNE = "test_tune";
    const COMMAND_TEST_TONE_START = "test_tone_start";
    const COMMAND_TEST_TONE_STOP = "test_tone_stop";

    const MSG_SW_TONE_START = "software_tone_start";
    const MSG_SW_TONE_STOP = "software_tone_stop";
    const MSG_ALERT = "alert";

    function PwmBuzzerViewModel(parameters) {
        var self = this;

        self.settingsVM = parameters[0];
        self.loginStateVM = parameters[1];
        self.accessVM = parameters[2];
        self.settings = null;

        self.hw_enabled = ko.observable();
        self.hw_gpio_pin = ko.observable();
        self.hw_duty_cycle = ko.observable();
        self.hw_suppress_m300 = ko.observable();
        self.sw_enabled = ko.observable();
        self.sw_volume = ko.observable();
        self.default_frequency = ko.observable();
        self.default_duration = ko.observable();
        self.events = {};
        self.printerConnected = ko.observable(false);

        self.sw_buzzer = new SoftwareBuzzer(self);
        self.composer = new M300Composer(self);

        self.is_debug = false;

        /* Configuration panel Helpers */

        self.testTone = function() {
            self.issueToneCommand(self.commands.TEST_TONE);
        }

        /* Event panel Helpers */

        self.setEventTune = function(targetEvent, tune) {
            self.events[targetEvent].id(tune);
        }

        self.testEventTune = function(targetEvent) {
            var tune = self.events[targetEvent].id();

            self.issueToneCommand(self.commands.TEST_TUNE, { id: tune });
        }

        /* Command Issuer for Test Tones */

        self.commands = {
            SETTINGS_CHANGED: COMMAND_SETTINGS_CHANGED,
            TEST_TONE: COMMAND_TEST_TONE,
            TEST_TUNE: COMMAND_TEST_TUNE,
            TEST_TONE_START: COMMAND_TEST_TONE_START,
            TEST_TONE_STOP: COMMAND_TEST_TONE_STOP
        };

        self.issueToneCommand = function(command, options) {
            var data = undefined;

            switch (command) {
                case COMMAND_TEST_TONE:
                    data = {
                        frequency: (options && options.frequency != undefined) ? options.frequency : self.default_frequency(),
                        duration: (options && options.duration != undefined) ? options.duration : self.default_duration()
                    };
                    break;

                case COMMAND_TEST_TONE_START:
                    data = {
                        frequency: options.frequency
                    }
                    break;

                case COMMAND_TEST_TONE_STOP:
                    // no data/parameters
                    break;
    
                case COMMAND_TEST_TUNE:
                    data = {
                        id: options.id
                    };
                    break;

                default:
                    break;
            }

            OctoPrint.simpleApiCommand(PLUGIN_IDENTIFIER, command, data);
        }
        
        /* Local Settings Changed Notifier */

        self.unsaved_settings = ko.computed(function() {
            OctoPrint.simpleApiCommand(PLUGIN_IDENTIFIER, self.commands.SETTINGS_CHANGED, {
                hw: {
                    enabled: self.hw_enabled(),
                    pin: self.hw_gpio_pin(),
                    duty_cycle: self.hw_duty_cycle(),
                    suppress_m300: self.hw_suppress_m300()
                },
                sw: {
                    enabled: self.sw_enabled()
                }
            });
        });

        /* Message Handler for SW Tone playback */

        self.onDataUpdaterPluginMessage = function(plugin, data) {
            if (plugin !== PLUGIN_IDENTIFIER) { return; }

            switch (data.action) {
                case MSG_ALERT:
                    var confirm = {
                        buttons: []
                    };
                    if (!!data.launch_to_settings_tab && self.loginStateVM.hasPermission(self.accessVM.permissions.SETTINGS)) {
                        confirm.confirm = true;
                        confirm.buttons.push(
                            {
                                text: "Settings",
                                click: function(notice) {
                                    self.settingsVM.show(`#settings_plugin_${PLUGIN_IDENTIFIER}`);
                                    $('ul.nav-pills a[href="' + data.launch_to_settings_tab + '"]', self.settingsVM.settingsDialog).tab("show");
                                    notice.remove();
                                }
                            }
                        );
                    }
                    if (!!data.restart) {
                        confirm.confirm = true;
                        confirm.buttons.push(
                            {
                                text: "Restart",
                                click: function(notice) {
                                    OctoPrint.system.executeCommand("core", "restart");
                                    notice.remove();
                                }
                            }
                        );
                    }
                    new PNotify({
                        title: "M300 PWM Buzzer Plugin",
                        text: data.text || "",
                        type: data.type || "success",
                        hide: (data.hide !== undefined) ? !!data.hide : true,
                        confirm
                    });
                    break;
                case MSG_SW_TONE_START:
                    self.sw_buzzer.start(data.frequency);
                    self.composer.setActiveFrequency(data.frequency);
                    break;
                case MSG_SW_TONE_STOP:            
                default:
                    self.sw_buzzer.stop();
                    self.composer.setActiveFrequency();
                    break;
            }
        }

        /* Settings Binding/Reset/Storage */

        self.onBeforeBinding = function() {
            self.resetLocalSettings();
        }

        self.onSettingsBeforeSave = function () {
            self.initSettings();

            // Persist the local settings for next time
            self.settings.hardware_tone.enabled(!!self.hw_enabled());
            self.settings.hardware_tone.gpio_pin(parseInt(self.hw_gpio_pin()));
            self.settings.hardware_tone.duty_cycle(parseInt(self.hw_duty_cycle()));
            self.settings.default_tone.frequency(parseFloat(self.default_frequency()));
            self.settings.default_tone.duration(parseInt(self.default_duration()));
            self.settings.software_tone.enabled(!!self.sw_enabled());
            self.settings.software_tone.volume(parseFloat(self.sw_volume() / 100));
            for (var event in self.events) {
                self.settings.events[event](self.events[event].id());
            }
        };

        self.onSettingsHidden = function() {
            self.resetLocalSettings();
        }

        self.onSettingsShown = function() {
            OctoPrint.printer.getFullState()
                .then(function(result) {
                    self.printerConnected(!result.state.flags.closedOrError);
                })
                .catch(function(error) {
                    self.printerConnected(false);
                });
        }

        self.initSettings = function() {
            if (!self.settings) {
                self.settings = self.settingsVM.settings.plugins.pwmbuzzer;
            }
        }

        self.resetLocalSettings = function() {
            self.initSettings();

            // Read in settings to local copy
            self.hw_enabled(self.settings.hardware_tone.enabled());
            self.hw_gpio_pin(self.settings.hardware_tone.gpio_pin());
            self.hw_duty_cycle(self.settings.hardware_tone.duty_cycle());
            self.hw_suppress_m300(self.settings.hardware_tone.suppress_m300_passthrough());
            self.default_frequency(self.settings.default_tone.frequency());
            self.default_duration(self.settings.default_tone.duration());
            self.sw_enabled(self.settings.software_tone.enabled());
            self.sw_volume(parseInt(self.settings.software_tone.volume() * 100));

            // setup observables for event mappings
            var checkIfFile = function(event) {
                return !(self.events[event].id() || "").match(IS_PRESET_REGEX);
            };
            for (var event in self.settings.events) {
                if (!self.events[event]) {
                    self.events[event] = {
                        id: ko.observable()
                    };
                    self.events[event].is_file = ko.pureComputed(checkIfFile.bind(self, event), self);
                }
                self.events[event].id(self.settings.events[event]());
            }

            self.is_debug = self.settings.debug && self.settings.debug();
        }
    }

    OCTOPRINT_VIEWMODELS.push({
        construct: PwmBuzzerViewModel,
        dependencies: [ "settingsViewModel", "loginStateViewModel", "accessViewModel" ],
        elements: [ "#settings_plugin_pwmbuzzer" ]
    });
});
