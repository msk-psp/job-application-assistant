# Application Form Assistant

A local-first Chrome extension that reviews and fills job application forms from
a reusable resume profile. It recognizes common Korean and English labels and
identifies Saramin, Wanted, Remember, LinkedIn, and generic application pages.

The extension does not submit applications, upload files, collect passwords, or
send resume data to a server. Page access is granted temporarily when the user
opens the extension; it does not run across browsing activity in the background.

## Install for development

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this repository directory.
5. Open the extension settings and save a resume profile.
6. Visit an application form, open the extension, and select **Scan form**.

Chrome does not allow content scripts on browser-internal pages or pages opened
before an extension was installed. Reload the application page when necessary.

## Current scope

- Resume profile stored in `chrome.storage.local`
- Korean and English field-label matching
- Review and selection before filling
- Input events compatible with React-style controlled fields
- No automatic submission

Platform-specific resume import and question drafting are planned after the
generic form workflow is validated against real application pages.
