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
