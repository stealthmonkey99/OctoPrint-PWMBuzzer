from queue import SimpleQueue
from threading import Thread
import re
import time
import logging

REGEX_LINE_HAS_M300_COMMAND = r"^[^;]*M300"
M300_ANALYSIS_KEY = "m300analysis"

FILE_PARSE_WARN_AFTER = 3.00
FILE_PARSE_WAIT_TO_START = 30.0
FILE_PARSE_YIELD_DELAY = 0.001

class M300FileParsingQueue():
    def __init__(self, file_manager):
        self._logger = logging.getLogger(__name__+"."+self.__class__.__name__)
        self._file_manager = file_manager
        self._queue = SimpleQueue()
        self._thread = None
        self._has_m300_regex = re.compile(REGEX_LINE_HAS_M300_COMMAND, re.I)

        # if any files get queued for parsing we'll mark this True to indicate as such in the Events settings panel
        self.needs_restart = False

    def debug(self, enabled):
        self._logger.setLevel(level=logging.DEBUG if enabled else logging.NOTSET)

    def _filter_m300_files(self, file):
        if file["type"] != "machinecode":
            return False

        id = file["path"]
        fileHash = "default"
        if "hash" in file:
            fileHash = file["hash"]

        if M300_ANALYSIS_KEY in file and fileHash in file[M300_ANALYSIS_KEY]:
            return file[M300_ANALYSIS_KEY][fileHash]
        else:
            self.needs_restart = True
            self._queue.put({
                "id": id,
                "fileHash": fileHash
            })
            self._run_queue()

    def _run_queue(self):
        if self._thread is not None and self._thread.is_alive():
            return

        self._thread = Thread(target=self._worker)
        self._thread.start()
        self._logger.debug("forked a thread: {0} (delayed to start in {1}s)".format(self._thread.ident, FILE_PARSE_WAIT_TO_START))

    def _worker(self):
        time.sleep(FILE_PARSE_WAIT_TO_START)

        start_time = time.time()
        processed = dict()
        while not self._queue.empty():
            # yield to other threads first
            time.sleep(FILE_PARSE_YIELD_DELAY)

            item = self._queue.get()
            id = item["id"]
            fileHash = item["fileHash"]

            if id not in processed or processed[id] != fileHash:
                has_m300 = self.file_has_tune(id)
                self._logger.debug("file '{0}' contains M300: {1}".format(id, has_m300))
                processed[id] = fileHash
                self._file_manager._storage_managers["local"].set_additional_metadata(path=id, key=M300_ANALYSIS_KEY, data=dict([(fileHash, has_m300)]), merge=True)

        elapsed = time.time() - start_time
        if elapsed > FILE_PARSE_WARN_AFTER:
            self._logger.warn("Parsing .gcode files for M300 content took %s seconds at startup" % elapsed)

    def _recurse_files(self, folder, filelist = dict()):
        for key in folder["children"]:
            if folder["children"][key]["type"] == "folder":
               self._recurse_files(folder["children"][key], filelist)
            else:
                filelist[folder["children"][key]["path"]] = folder["children"][key]

    def get_tune_files(self):
        tune_files = dict()
        all_files = self._file_manager._storage_managers["local"].list_files(filter=self._filter_m300_files)
        if all_files is not None:
            for key in all_files:
                if all_files[key]["type"] == "folder":
                    self._recurse_files(all_files[key], tune_files) 
                else:
                    tune_files[all_files[key]["path"]] = all_files[key]

        return tune_files

    def file_has_tune(self, filename):
        path = self._file_manager.path_on_disk("local", filename)
        file = open(path, "r")
        for line in file.readlines():
            if re.search(self._has_m300_regex, line) is not None:
                return True
        return False

    def get_tune_from_file(self, filename):
        path = self._file_manager.path_on_disk("local", filename)
        file = open(path, "r")
        lines = file.readlines()
        commands = []
        for line in lines:
            if re.search(self._has_m300_regex, line) is not None:
                commands.append(line);
        return commands

    def _recurse_clear(self, folder):
        for key in folder["children"]:
            if folder["children"][key]["type"] == "folder":
               self._recurse_clear(folder["children"][key])
            else:
                self._file_manager._storage_managers["local"].remove_additional_metadata(path=folder["children"][key]["path"], key=M300_ANALYSIS_KEY)
                self._logger.debug("Cleared M300 Analysis metadata for: %s" % folder["children"][key]["path"])

    def debug_clear_metadata(self):
        tune_files = dict()
        all_files = self._file_manager._storage_managers["local"].list_files()
        if all_files is not None:
            for key in all_files:
                if all_files[key]["type"] == "folder":
                    self._recurse_clear(all_files[key])
                else:
                    self._file_manager._storage_managers["local"].remove_additional_metadata(path=all_files[key]["path"], key=M300_ANALYSIS_KEY)
                    self._logger.debug("Cleared M300 Analysis metadata for: %s" % all_files[key]["path"])

        return tune_files
