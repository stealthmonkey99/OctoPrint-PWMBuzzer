from queue import SimpleQueue
import re
import time
import logging

REGEX_LINE_HAS_M300_COMMAND = r"^[^;]*M300"
REGEX_FILE_HAS_ANY_M300_COMMAND = r"[m|M]300"
REGEX_FILE_HAS_UNCOMMENTED_M300_COMMAND = r"(^[^;]*[m|M]300)|(\n[^;]*[m|M]300)"
M300_ANALYSIS_KEY = "m300analysis"

FILE_PARSE_WARN_AFTER = 3

class M300FileParsingQueue():
    def __init__(self, file_manager):
        self._logger = logging.getLogger(__name__+"."+self.__class__.__name__)
        self._file_manager = file_manager

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

    def get_tune_files(self):
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

        return tune_files

    def get_tune_from_file(self, filename):
        path = self._file_manager.path_on_disk("local", filename)
        file = open(path, "r")
        lines = file.readlines()
        commands = []
        for line in lines:
            if re.search(REGEX_LINE_HAS_M300_COMMAND, line, re.I) is not None:
                commands.append(line);
        return commands
