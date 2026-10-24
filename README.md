# Vehicle Maintenance and Condition Report (Monthly Driver Checklist)

A static website version of `Maintenance_Checklist.xlsx`. No server or build step needed.

## Publish on GitHub Pages
1. Create a repository and upload all files (`index.html`, `style.css`, `app.js`, `config.js`).
2. **Settings → Pages → Deploy from a branch → `main` / root → Save.**
3. Share the link (`https://<username>.github.io/<repo>/`) with the drivers. Works on phones.

## How drivers use it
Fill in the form → **Submit report** (if online submission is set up), or **Download CSV**, **Print / Save PDF**, or **Email report**.
Entries autosave on the device; **New report** clears the form.

## Collect submissions into a Google Sheet (optional, free)
GitHub Pages can't store data by itself, so use a Google Sheet:
1. Create a Google Sheet → **Extensions → Apps Script**, paste:
```js
function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  const sh = SpreadsheetApp.getActiveSheet();
  if (sh.getLastRow() === 0) sh.appendRow(Object.keys(d));
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  // add any new columns
  Object.keys(d).forEach(k => { if (head.indexOf(k) < 0) { head.push(k); sh.getRange(1, head.length).setValue(k); } });
  sh.appendRow(head.map(h => d[h] ?? ""));
  return ContentService.createTextOutput("ok");
}
```
2. **Deploy → New deployment → Web app**; Execute as *Me*, access *Anyone* → copy the URL.
3. Paste it into `SUBMIT_URL` in `config.js`. Optionally set `SUPERVISOR_EMAIL` too.

Note: the signature is sent as an image data string (long text) in a `Signature` column.

## Editing the checklist
Items are listed in the `SECTIONS` array at the top of `app.js`.
