SUPPORTED_EVENTS = ["Startup", "Shutdown", "ClientOpened", "ClientClosed", "Connected", "Disconnected", "PrintStarted", "PrintDone", "PrintFailed", "PrintPaused", "PrintResumed", "PrintCancelled", "FileAdded", "FileRemoved"]

OFFLINE_EVENTS = ["Startup", "Shutdown", "Connected", "Disconnected"]

SUPPORTED_EVENT_CATEGORIES = [
    {
        "category": "System Events",
        "events": [
            {
                "id": "Startup",
                "name": "Startup"
            },
            {
                "id": "Shutdown",
                "name": "Shutdown"
            },
            {
                "id": "Connected",
                "name": "Printer Connected"
            },
            {
                "id": "Disconnected",
                "name": "Printer Disconnected"
            },
            {
                "id": "ClientOpened",
                "name": "OctoPrint Client Connected"
            },
            {
                "id": "ClientClosed",
                "name": "OctoPrint Client Disconnected"
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