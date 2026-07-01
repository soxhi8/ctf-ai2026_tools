# README
## Chat exporter
Install [violentmonkey](https://violentmonkey.github.io/) to run userscripts in your browser of choice. I tested with Firefox and Chromium.

Open the extension dashboard, click the +-sign and either copy+paste the raw contents of [chatexporter.js](chatexporter.js) or install from url [https://github.com/soxhi8/ctf-ai2026_tools/blob/master/chatexporter.js](https://github.com/soxhi8/ctf-ai2026_tools/blob/master/chatexporter.js).

The script works for Gemini, ChatGPT and Claude. It contains fixes for Claude, as it previously failed at command blocks, thus downloading incomplete chats. The other fix changes the timestamp in the file name to output a more verbose ISO8601-compliant timestamp, to avoid duplicate file names.

## Data Ingest Station
You should be able to open [data_ingest.html](data_ingest.html) in any browser of your choice.
### Customization
Edit [data_ingest.html](data_ingest.html) to use your challenge-names, instead of mine.
```
<div id="landing-page" class="page active">
    <h1>Select Challenge</h1>
    <select id="challenge-select">
        <option value="challenge01">challenge01 – [Insert Name]</option>
        <option value="challenge02">challenge02 – [Insert Name]</option>
        <option value="challenge03">challenge03 – [Insert Name]</option>
        <option value="challenge04">challenge04 – [Insert Name]</option>
        <option value="challenge05">challenge05 – [Insert Name]</option>
        <option value="challenge06">challenge06 – [Insert Name]</option>
        <option value="challenge07">challenge07 – [Insert Name]</option>
        <option value="challenge08">challenge08 – [Insert Name]</option>
        <option value="challenge09">challenge09 – [Insert Name]</option>
        <option value="challenge10">challenge10 – [Insert Name]</option>
    </select>
    <button onclick="startRun()">Start Run</button>
</div>
```
You can also add more AI models, I only added Gemini, ChatGPT and Claude. But you can also enter your model each run, by choosing `Custom` instead. Just be consistent with your naming.
## Feedback Form
You should be able to open [feedback.html](feedback.html) in any browser of your choice. You can use it to collect feedback for you challenges from the others, if you would like to. Feel free to use a different tool or template instead.
### Customization
Basically the same as with [data_ingest.html](data_ingest.html). Edit [feedback.html](feedback.html) to contain your challenge-names and also add more AI models if you would like to. Recipients may also edit the html file add their own AI models to the list, for easy access.
```
<div id="landing-page" class="page active">
    <h1>Select Challenge for Feedback</h1>
    <select id="challenge-select">
        <option value="challenge01">challenge01 – [Insert Name]</option>
        <option value="challenge02">challenge02 – [Insert Name]</option>
        <option value="challenge03">challenge03 – [Insert Name]</option>
        <option value="challenge04">challenge04 – [Insert Name]</option>
        <option value="challenge05">challenge05 – [Insert Name]</option>
        <option value="challenge06">challenge06 – [Insert Name]</option>
        <option value="challenge07">challenge07 – [Insert Name]</option>
        <option value="challenge08">challenge08 – [Insert Name]</option>
        <option value="challenge09">challenge09 – [Insert Name]</option>
        <option value="challenge10">challenge10 – [Insert Name]</option>
    </select>
    <button onclick="startRun()">Start Run</button>
</div>
```