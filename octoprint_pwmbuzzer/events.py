SUPPORTED_EVENTS = ["Startup", "Shutdown", "ClientOpened", "Connected", "PrintStarted", "PrintDone", "PrintFailed", "PrintPaused", "PrintResumed", "PrintCancelled", "FileAdded", "FileRemoved"]

SUPPORTED_EVENT_CATEGORIES = [
    {
        "category": "System Events",
        "events": [
            {
                "id": "Connected",
                "name": "Startup (Printer Connected)"
            },
            {
                "id": "Shutdown",
                "name": "Shutdown"
            },
            {
                "id": "ClientOpened",
                "name": "OctoPrint Client Connected"
            }
        ]
    },
    {
        "category": "Printer Events",
        "events": [
            {
                "id": "PrintStarted",
                "name": "Print Started"
            },
            {
                "id": "PrintDone",
                "name": "Print Completed"
            },
            {
                "id": "PrintFailed",
                "name": "Print Failed"
            },
            {
                "id": "PrintPaused",
                "name": "Print Paused"
            },
            {
                "id": "PrintResumed",
                "name": "Print Resumed"
            },
            {
                "id": "PrintCancelled",
                "name": "Print Cancelled"
            }
        ]
    },
    {
        "category": "File Events",
        "events": [
            {
                "id": "FileAdded",
                "name": "File Added"
            },
            {
                "id": "FileRemoved",
                "name": "File Removed"
            }
        ]
    },
]