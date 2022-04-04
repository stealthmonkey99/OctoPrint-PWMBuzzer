from enum import Enum
from queue import SimpleQueue
from threading import Thread
import time
import logging

INTER_NOTE_PAUSE_DURATION = 0.01

class ToneCommand(Enum):
    STOP = 0
    START = 1
    PLAY = 2
    REST = 3

class Tone():
    def __init__(self, command, buzzers = [], frequency = None, duration = None, debug = False):
        self._logger = logging.getLogger(__name__+"."+self.__class__.__name__)
        self._logger.setLevel(level=logging.DEBUG if debug else logging.NOTSET)

        self.command = command
        self.buzzers = buzzers
        self.frequency = frequency
        self.duration = duration

    def exec(self):
        if len(self.buzzers) < 1:
            self._logger.warn("{0} executed with no attached buzzers, ignoring.".format(self))
            return

        if self.command is ToneCommand.START:
            for buzzer in self.buzzers:
                buzzer.start(self.frequency)
        elif self.command is ToneCommand.STOP:
            for buzzer in self.buzzers:
                buzzer.stop()
        elif self.command is ToneCommand.PLAY:
            for buzzer in self.buzzers:
                buzzer.start(self.frequency)
            time.sleep(self.duration / 1000)
            for buzzer in self.buzzers:
                buzzer.stop()

            # Pause briefly between notes
            time.sleep(INTER_NOTE_PAUSE_DURATION)
        elif self.command is ToneCommand.REST:
            time.sleep(self.duration / 1000)

    def __repr__(self):
        if self.command in [ToneCommand.START, ToneCommand.PLAY]:
            return "%s (%s %.3fHz)" % (self.__class__.__name__, self.command.name, self.frequency)
        else:
            return "%s (%s)" % (self.__class__.__name__, self.command.name)

class ToneQueue():
    def __init__(self):
        self._logger = logging.getLogger(__name__+"."+self.__class__.__name__)
        self._queue = SimpleQueue()
        self._thread = None

    def debug(self, enabled):
        self._logger.setLevel(level=logging.DEBUG if enabled else logging.NOTSET)

    def add(self, tone):
        self._logger.debug("adding to the queue: {0}".format(tone))
        self._queue.put(tone)
        self._runQueue()

    def _runQueue(self):
        if self._thread is not None and self._thread.is_alive():
            return

        self._thread = Thread(target=self._worker)
        self._thread.start()
        self._logger.debug("forked a thread: {0}".format(self._thread.ident))

    def _worker(self):
        while not self._queue.empty():
            tone = self._queue.get()
            self._logger.debug("pulled from the queue to be executed: {0}".format(tone))
            tone.exec()
