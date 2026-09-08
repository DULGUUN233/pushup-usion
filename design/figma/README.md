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
