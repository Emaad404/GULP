# GULP website demo

A responsive HTML, CSS, and JavaScript prototype for the GULP swallowing-monitoring project. It includes a research-oriented public homepage, sourced population context and charts, the supplied GULP model image, clinical equipment imagery, a name/username login flow, and an interactive simulated patient dashboard.

## Run it

Open `index.html` in a modern browser. No build tools or server are required. For the most consistent browser behavior, serve this folder with any local static file server and open the resulting local address.

## Demo behavior and data

- Explore the dashboard as a guest without entering personal details. Guest notes are kept in the current browser.
- Optional registration asks for a name, username, and password. Email is optional free text with no format validation, and the password has no length constraint. Login only works in that same browser.
- Profiles and session notes use `localStorage`; there is no account server or secure health-data storage. Passwords are kept in plain text as part of this local-only demonstration. Do not enter sensitive health information.
- New profiles start empty. No sample readings, clinical statistics, or fabricated users are included.
- The live-session screen has a moving illustrative signal, a timer, manual event markers, and a finish/save action. It is explicitly labeled simulated and never presented as patient readings.
- Session notes record a date, optional context, and optional note. The dashboard graph counts only saved entries; it does not invent reading values or classify a swallow.
- Device integration is not implemented. The dashboard says so; a real connection requires a defined hardware protocol and data handling.
- GULP does not diagnose, determine swallowing safety, or replace clinical advice.

## Images and evidence

- `gulp-logo.png` is the supplied GULP logo converted to a transparent PNG and used as the primary brand mark.
- `gulp-model.png` is the model visualization supplied by the project team.
- The fluoroscopy and published sensor-setup images link to their source pages from Laryngopedia and the open-access *Sensors* journal. The site identifies them as clinical/research examples, not GULP hardware or results.
- The supplied model visualization is shown on the public prototype page and in the device section of the dashboard.
- The homepage chart uses U.S. adult survey estimates reported in a 2024 peer-reviewed article: [Prevalence of Dysphagia in Adults in the United States in 2012 and 2022](https://pubs.asha.org/doi/10.1044/2024_AJSLP-23-00407). The page labels the population and does not present these numbers as GULP measurements.
- Clinical context links to the [ASHA Adult Dysphagia Practice Portal](https://www.asha.org/Practice-Portal/Clinical-Topics/Adult-Dysphagia/).
- The contact section lists Mohamed Emad and Omar Ayyoup, plus the phone, email, and LinkedIn details provided for the project.

## Editable project copy

The brand introduction, team contact details, and project wording are in `index.html`. If hardware integration is added, document the actual device protocol and change the dashboard connection state only after it is implemented.
