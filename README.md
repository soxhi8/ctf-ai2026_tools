# README
## Chat exporter
Install [violentmonkey](https://violentmonkey.github.io/) to run userscripts in your browser of choice. I tested with Firefox and Chromium.

Open the extension dashboard, click the +-sign and either copy+paste the raw contents of [chatexporter.js](chatexporter.js) or install from url [https://github.com/soxhi8/ctf-ai2026_tools/blob/master/chatexporter.js](https://github.com/soxhi8/ctf-ai2026_tools/blob/master/chatexporter.js).

The script works for Gemini, ChatGPT and Claude. It contains fixes for Claude, as it previously failed at command blocks, thus downloading incomplete chats. The other fix changes the timestamp in the file name to output a more verbose ISO8601-compliant timestamp, to avoid duplicate file names.

## Data Ingest Station
> aka the funny html thing you saw

soon™️, still doing some modifications to make it more universal for the group.