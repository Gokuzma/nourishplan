# Scan a receipt into inventory — short design

## Why
Typing or dictating a whole shop is tedious. A photo of the receipt already lists it.

## Approved (user: "yes, build it and add it")
- A **Scan receipt** button takes a photo (or up to 3 photos of a long receipt).
- The same AI parser reads it and the same bulk-add review list appears.
- Skips prices-only lines, tax, totals, deposits, bags and non-food lines; expands
  receipt abbreviations; guesses fridge/freezer/pantry; line price → purchase price.
- The receipt total can be logged as this week's grocery spend (a tick box, on by
  default, with a note to untick if the trip was already logged from the grocery list).

## Approaches
1. Extend `parse-inventory` to accept images (chosen): one parser, one prompt's
   rules, one sanitiser, one review UI.
2. A separate `parse-receipt` function: duplicates sanitising and the ready-meal rules.
3. On-device OCR, then the text path: an extra library and worse on abbreviations.

## Builder's calls
- Photos are shrunk on the phone to 1600 px on the long edge, JPEG, before upload.
- One Inventory tap opens the camera/photo picker; the modal opens already reading.
- Model stays Haiku 4.5 (vision-capable, same as the text path).
