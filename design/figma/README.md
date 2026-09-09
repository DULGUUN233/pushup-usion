# Home-Today reference

Source: user-supplied Figma CSS, node `426:4890` in file `eF4afqGdcyn2Ou9dsFLi1f`.
The original export is preserved in `home-today.reference.txt`.

- Reference frame: 430 × 932 design pixels, background `#0B0D10`.
- The first 126.79px is the host header screenshot, not mini-app content.
- At 430px viewport width the content uses the exported dimensions directly.
- Below 430px, Home scales by `viewport width / 430`, including text, cards and navigation.
- Above 430px, Home stays centered at 430px. Height is scrollable; navigation stays bottom-anchored.

## Number typography at reference width

| Element | Font | Weight | Size |
| --- | --- | --- | --- |
| Daily repetitions | Benzin Bold | 700 | 34px |
| Goal denominator | Benzin Regular | 400 | 16px |
| Completion percentage | Benzin Bold | 700 | 36.4307px |
| Trend total | Montserrat | 700 | 24px |
| Selected trend value | Montserrat | 600 | 12px |
| Chart axis | Montserrat | 400 | 8px |

Figma's separate Benzin-Bold family is mapped to the local Benzin font's 700 face.
Cap-height trimming uses `text-box-trim`, with the exported trimmed line heights as fallback.
SVG Gaussian shadow sigmas are half the exported box-shadow blur radii.

## Verification (2026-09-08)

Browser DOM measurements at 430px: overview 390 × 212, current card 174 × 118,
comparison card 174 × 49, ring 179 × 179, trend 390 × 200, navigation 390 × 65.
Content positions match the export after subtracting its host header (within browser subpixel rounding).

Chrome viewport checks: 320, 375, 390, 430 and 768px. Tested Mongolian/English,
zero data, 29 repetitions / 100%, and pointer selection of graph points.
These are browser viewport tests, not physical-device or Usion iOS WebView certification.

Live counts and percentages are retained; Figma's mock values are not embedded as user data.
The export's inconsistent axis labels are replaced by descending, data-scaled ticks.
The graph highlight follows the selected date and supports pointer/keyboard selection.

## Home-week

Source: node `438:285`, original user export in `home-week.reference.txt`.
Same 430 × 932 frame and proportional scaling as Home-Today.

At reference width, verified in Chrome:

- Controls: union (20, 146.46), range (27, 153.46), exercise switch (194, 216.99).
- Heading: (20, 286), 390 × 22, with a 20px gap to the summary.
- Average card: (20, 328), 189.5 × 91.
- Total card: (221.5, 328), 188.5 × 90.
- Chart card: (20, 439), 390 × 244; inner header 357 × 17, plot base 357 × 174.
- Tracks: 28.71 × 153, 20px gaps, 18px horizontal plot insets.
- Summary numbers: Benzin Bold 34px; labels: Montserrat Regular 12px.
- Chart total: Montserrat Bold 24px; axis: Montserrat Regular 8px; weekdays: 10px.

Positions above include the reference host header; browser measurements subtract 126.79px.
Week uses its own 2.46px control offset without moving the content heading.
Shared fonts, union artwork, icons and navigation are reused.

Real Monday–Sunday data, elapsed-day averages, future-date disabling and day drill-down
are retained. The sample's inconsistent 10 / 45 / 133 numbers are not hardcoded.
The axis starts at 0–40 and expands for larger data; bars use the same scale without
exaggerating small counts. Zero days show only their track.

Verified 430px, 375px, 320px and 768 × 430 landscape browser viewports; Mongolian/English,
push-ups/squats, zeros, current-week future dates, 1–999-rep data and keyboard drill-down.
No physical-device or embedded iOS WebView certification is implied.

## Home-month

Source: node `450:246`, original user export in `home-month.reference.txt`.
Frame: 430 × 975, background `#0B0D10`; same 430px proportional scaling and
host-header subtraction as Today/Week.

- Union: (20, 146.46), 390 × 109.53; range: (27, 153), 376 × 41.
- Exercise switch: (194, 216.99), 210 × 33; heading: (20, 286), 390 × 22.
- Summary frame: (20, 328), 390 × 83.5. The exported children deliberately extend
  below it: average 189.5 × 89, total 188.5 × 88, separated by 12px.
- Calendar outer card: (20, 431.5), 390 × 373, radius 24, 16.5px inner insets.
- Right-aligned inner picker: (33.5, 448), 360 × 340, radius 16; 12px horizontal
  padding, 48px weekday header, six 48px date rows and 4px bottom padding.
- Date targets: 48 × 48; progress/fill circles: 40 × 40; progress stroke: 3px.
- Numbers: Benzin Bold 34px for summary; Montserrat 16px/24px for dates,
  weight 400 normally and 600 for active progress; weekdays Montserrat 14px/24px.
- Exact exported outer/inner radial gradients, orange total-card gradient and
  yellow-to-orange completed-day radial fill are retained.

Real month totals, elapsed-day average, goal-based progress and day drill-down remain.
Dates are genuinely Monday-first rather than copying the sample's inconsistent
weekday/date alignment. Adjacent-month dates are muted, noninteractive padding;
future current-month days remain disabled. The six-row calendar includes leap years.

Reduced verification requested: 21 relevant Home/i18n tests and one Chrome view at
430 × 848 (the 975px frame minus its host header). Measured card dimensions match;
positions differ by under 0.04px due to browser subpixel rounding. No full suite or
physical-device sweep was run for this change.

## Push Up mode chooser

Source: node `450:10239`, user CSS in `push-choice.reference.txt`. Figma names
this frame `Home-Today`, but its content is the Push Up chooser (430 × 932).

- Content starts at (20, 286), i.e. 159.21px below the 126.79px host header.
- Heading: Benzin Regular 36px, cap-trimmed 27px box; subtitle Montserrat 14/17px.
- Heading/subtitle/card-list gaps: 14px. Card-to-card gap: 12px.
- Classic card: (20, 358), 390 × 85.32; Game: (20, 455.32), 390 × 93.
- Card inset: 16.5px including the exported half-pixel border; radius 24px.
- Icons: 52.32px tiles, with the existing SVGs at their exact stroke-inclusive
  bounds. Text column: 256.68px; arrows: 24px. Card titles: Montserrat Bold 18/22px;
  descriptions: Montserrat Regular 12/15px, separated by 8px.
- Exact exported gradients and `#20252D` inset borders; `Up` retains the orange
  text run visible in Figma (the plain CSS export flattens that mixed text color).
- Reuses the 390 × 65 proportional Home navigation, with Push Up active and the
  existing exported icon geometry masked to the supplied active/inactive colors.

Changes are scoped to `data-exercise="pushup"`; Squat's chooser remains unchanged.
Cards can grow if translated text needs more space. The content scrolls on short
viewports while navigation stays bottom-anchored. Camera and game actions are unchanged.

Reduced verification: 32 relevant chooser/game-UI/i18n tests passed; one 430 × 805
Chrome preview checked the exported sizes, local assets and navigation. This was
a static/offline UI preview, not a camera, backend or physical-device test.

## Normal Squat preparation

Source: node `475:2`, user CSS in `squat-prep.reference.txt`. The frame is again
named `Home-Today`, but is the preparation screen reached through Squat → Classic.
Figma MCP was quota-limited; the supplied CSS and browser-visible source frame
were used. The camera glyph was exported directly from node `478:179` into
`assets/figma/squat-camera.svg`; the existing `squat-guide.svg` is reused.

- Frame: 430 × 932, background `#0B0D10`; subtract the external 126.79px host header.
- Heading: y223.61, Benzin Regular 36px with a 27px trimmed box.
- Content: x20, y286, width390; top hint34px, gap14, guide296.55 × 207.96,
  gap14, bottom hint34px. Both hints use Montserrat Regular 14/17px.
- Camera button: y613.96, minimum163 × 57, 24px icon, 12px gap, 16.5px insets,
  radius24 and half-pixel `#F97316` border; Montserrat Semibold 14/17px.
- Shared navigation: 390 × 65, 20px from the bottom, Squat active. Exported
  Home/Squat glyphs use the reference muted/active colors without double rendering.

Only normal Squat receives this layout. Camera, counting, Flappy and battle logic
are unchanged. Existing loading/retry text remains functional; translated button
text may widen the button rather than clip. The title is localized as `Суулт` /
`Squat` instead of the source's English typo `Squad`. Short screens scroll above
the fixed navigation; widths below430 scale proportionally. Hidden preparation
removes the scoped navigation styling and restores the exercise HUD.

Reduced verification: 27 relevant preparation/chooser/i18n/camera tests passed.
Chrome at430 × 805 measured the guide296.546875 × 207.953125 and navigation390 × 65;
positions match the source within0.04px after header subtraction. This was a
static/offline UI preview, not a physical camera or backend test.

### Squat guide motion follow-up

Squat's mode chooser now uses the same430px layout, card dimensions, typography,
artwork and navigation sizing as Push Up, as requested. Only the exercise title
and descriptions differ; existing normal/game actions remain exercise-specific.
At430px, the normal card measures390 × 85.3125 and uses Montserrat; the title uses Benzin.

The `Squad Guide` component set (`479:463`) has two prototype variants:
standing `479:460` and seated `479:462`. Both interactions were inspected in
Figma's Prototype panel: **After delay500ms → Change to → Instant**. A complete
loop is1000ms; it is intentionally a pose swap, not a morph or crossfade.

Both SVGs were exported directly from those variants (`squat-guide.svg` and
`squat-guide-down.svg`). Figma rounds their export bounds to297 × 208; the app
keeps the existing296.55 × 207.96 layout box. Temporary export settings were
removed after download. The standing variant replaces the earlier static export.

CSS step-end opacity tracks switch the two images without moving the guide box.
They run only while normal Squat preparation is visible, stop when that screen
is hidden, and are disabled by `prefers-reduced-motion` (standing pose remains).
No timers, new libraries, camera, counting or game logic were introduced.

Verification:16 targeted tests passed. Local Chrome at375 × 760 showed both
poses with identical258.609 × 181.359 bounds and both local SVGs loaded.
The backend is not running in this static preview; camera access was not requested.

## Rank leaderboard detail

The user confirmed that the supplied `Battle` frame is the Rank detail screen,
not the Battle waiting room. Source node `479:527`; CSS is preserved in
`rank.reference.txt`. MCP was quota-limited, so the supplied CSS and browser-visible
frame were used. `assets/figma/rank-union.svg` is the direct export of `490:536`,
clipped by Figma to the 430px frame. Temporary export settings were removed afterward.

The 430 × 932 reference excludes the external 126.79px host header in the app.
The podium uses 74.33 × 74 / 60 × 60 portraits and 24px medal badges; rows use
368 × 65 cards, 16.5px insets, 12px gaps and 32px portraits. The bottom fade is
220.91px high; navigation is 390 × 65 with a 102px active Rank item. Extra scroll
space lets the final rows move above the fade. Narrower widths scale these values.
Existing live metric labels, sorting, league navigation and translated text remain.
The default Push Up marker uses the source 32px orange circle; other metric states
position the same marker along the existing interactive arc.

Removed the podium grayscale filter: portraits retain their actual colors rather
than imposing the monochrome appearance of the designer's sample photos. No sample
players or scores were added to the production app.

At430 × 805, a temporary populated UI fixture measured rows368 × 65 atx31,
first portrait74.328 × 74 atx179.25, and navigation390 × 65 atx20/y720.
Vertical positions were within0.06px of the reference after host-header subtraction.
All9 local test images loaded with computed filter `none`. This checks layout with
test data, not the live backend or physical-device behavior.
