# Phase 17: Inventory Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 17-inventory-engine
**Areas discussed:** Inventory data model, Add-item experience, Inventory list & expiry UX, Plan deduction & leftovers

---

## Inventory Data Model

### Quantity Tracking
| Option | Description | Selected |
|--------|-------------|----------|
| Ledger-based | Each add/remove is a separate row (like bank statement). Supports undo and history. | |
| Simple quantity | Single quantity field, updated directly. Simpler. No transaction history. | |
| You decide | Claude picks best approach based on requirements | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion on implementation approach

### Food Linking
| Option | Description | Selected |
|--------|-------------|----------|
| Linked to foods | Reference food_id from USDA/custom foods. Gets nutrition, links to recipes. | |
| Freeform + optional link | Type name freely, optionally link to food item. More flexible. | |
| You decide | Claude picks based on plan deduction and barcode needs | ✓ |

**User's choice:** You decide

### Storage Locations
| Option | Description | Selected |
|--------|-------------|----------|
| Separate entries | Same food in fridge and freezer = two rows. Each has own quantity and expiry. | ✓ |
| Single item, multiple locations | One record per food with sub-entries per location. | |
| You decide | Claude picks simpler approach | |

**User's choice:** Separate entries

### Pricing Model
| Option | Description | Selected |
|--------|-------------|----------|
| Use food_prices table | Adding item updates/creates food_prices entry. One source of truth. | |
| Separate purchase price | Each inventory item has own price_paid field. Decoupled from recipe costs. | |
| Both | Store purchase price on item AND update food_prices. | ✓ |

**User's choice:** Both — purchase price on inventory item + food_prices table update

### Units
| Option | Description | Selected |
|--------|-------------|----------|
| Weight + volume + count | Grams/kg, ml/L, and discrete units (eggs, cans). | ✓ |
| You decide | Claude picks | |

**User's choice:** Weight + volume + count

### Purchase Date
| Option | Description | Selected |
|--------|-------------|----------|
| Track purchase date | purchased_at + optional expiry_date. Enables FIFO. | ✓ |
| Just expiry date | Only track optional expiry. Simpler. | |
| You decide | Claude picks | |

**User's choice:** Yes, track purchase date

### Opened State
| Option | Description | Selected |
|--------|-------------|----------|
| Track opened state | Items can be marked opened, adjusts expiry guidance | ✓ |
| Keep it simple | Just quantity + expiry | |
| You decide | Claude picks | |

**User's choice:** Yes, track opened state

---

## Add-Item Experience

### Barcode Scanning
| Option | Description | Selected |
|--------|-------------|----------|
| In-app camera scanner | Camera viewfinder, detect barcode with JS library, look up via OFF API | |
| Manual barcode entry | User types barcode number. Simpler, no camera permissions. | |
| Camera + manual fallback | Camera as primary, type barcode as fallback. Best UX. | ✓ |
| You decide | Claude picks | |

**User's choice:** Camera + manual fallback

### Quantity Input
| Option | Description | Selected |
|--------|-------------|----------|
| Numeric input + unit picker | Type number, select unit from dropdown. Flexible. | ✓ |
| Common presets + custom | Quick-select buttons for common amounts + custom entry. | |
| You decide | Claude picks | |

**User's choice:** Numeric input + unit picker

### Entry Point
| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated Inventory page | New page/tab with inventory list + Add button. First-class section. | |
| Section on Home page | Summary on Home with quick-add, full list via View all. | |
| Both | Dedicated page in nav + summary widget on Home. | ✓ |
| You decide | Claude picks | |

**User's choice:** Both

### Barcode Data
| Option | Description | Selected |
|--------|-------------|----------|
| Auto-fill everything | Barcode → OFF API → pre-fill name, brand, nutrition, serving size. | ✓ |
| Name + brand only | Look up name/brand only, user enters rest manually. | |
| You decide | Claude picks | |

**User's choice:** Auto-fill everything

### Food Search
| Option | Description | Selected |
|--------|-------------|----------|
| Reuse food search | Same FoodSearchOverlay as recipe builder. Consistent UX. | ✓ |
| Separate simpler search | Inventory-specific lighter weight search. | |
| You decide | Claude picks | |

**User's choice:** Yes, reuse food search (FoodSearchOverlay)

### Price Requirement
| Option | Description | Selected |
|--------|-------------|----------|
| Required | Must enter price for every item. | |
| Optional | Price available but skippable. | |
| Optional with nudge | Shown but skippable, with gentle prompt. | ✓ |

**User's choice:** Optional with nudge

### Duplicate Handling
| Option | Description | Selected |
|--------|-------------|----------|
| Merge into existing | Prompt to add more to existing entry if same food + location. | |
| Always new entry | Every scan/add creates fresh row. Simpler. | ✓ |
| You decide | Claude picks | |

**User's choice:** Always new entry

### Bulk Add
| Option | Description | Selected |
|--------|-------------|----------|
| Quick scan mode | Continuous scanning, auto-add with defaults, edit later. | ✓ |
| Full form each time | Each scan opens full add form. More accurate. | |
| You decide | Claude picks | |

**User's choice:** Yes, quick scan mode

---

## Inventory List & Expiry UX

### List Layout
| Option | Description | Selected |
|--------|-------------|----------|
| Tabs by location | Pantry / Fridge / Freezer tabs. Clean separation. | ✓ |
| Single list, grouped | One scrollable list with collapsible location sections. | |
| Expiry-first view | Single list sorted by expiry across all locations. | |
| You decide | Claude picks | |

**User's choice:** Tabs by location

### Expiry Flags
| Option | Description | Selected |
|--------|-------------|----------|
| Color-coded badges | Red/orange/green badges on each item row. | |
| Top banner + subtle row styling | Banner + subtle background tint. | |
| You decide | Claude picks to fit pastel theme. | ✓ |

**User's choice:** You decide

### Edit Flow
| Option | Description | Selected |
|--------|-------------|----------|
| Inline editing | Tap to edit in-place, swipe to delete. | |
| Detail modal | Tap to open modal with all fields. | |
| You decide | Claude picks based on existing patterns. | ✓ |

**User's choice:** You decide

### Home Widget
| Option | Description | Selected |
|--------|-------------|----------|
| Expiring soon list | Top 3-5 items expiring soonest. | |
| Count by location | Fridge: 12 · Freezer: 8 · Pantry: 15 + expiry alert count. | |
| Both | Location counts + expiring-soon list. | ✓ |
| You decide | Claude picks | |

**User's choice:** Both

### Search/Filter
| Option | Description | Selected |
|--------|-------------|----------|
| Yes, search bar | Search across all tabs. | |
| No, just browse | Tab navigation + expiry sorting only. | |
| You decide | Claude decides based on expected size. | ✓ |

**User's choice:** You decide

### Removal Reason
| Option | Description | Selected |
|--------|-------------|----------|
| Track removal reason | "Used" vs "Discarded". Feeds waste tracking. | ✓ |
| Just remove | Delete is delete. Simpler. | |
| You decide | Claude picks | |

**User's choice:** Yes, track removal reason
**Notes:** User wants waste tracking added to the roadmap as a future phase.

---

## Plan Deduction & Leftovers

### Deduction Trigger
| Option | Description | Selected |
|--------|-------------|----------|
| On Cook button press | Deduct per-meal, tied to actual cooking. | ✓ |
| On plan finalization | Bulk deduction when plan locked. | |
| Both options | Cook (default) + bulk "Deduct all planned". | |
| You decide | Claude picks | |

**User's choice:** On Cook button press
**Notes:** Recipe should include how to actually cook the meal — Cook button is pressed when meal is cooked. Spices/condiments tracked as inventory items.

### Partial Match
| Option | Description | Selected |
|--------|-------------|----------|
| Auto-deduct exact amount | Deduct 200g from 500g entry. Remaining stays. | ✓ |
| Confirm before deducting | Show confirmation per ingredient. More control. | |
| You decide | Claude picks | |

**User's choice:** Auto-deduct exact amount

### Leftovers
| Option | Description | Selected |
|--------|-------------|----------|
| Post-cook prompt | After Cook, prompt to save leftovers. Auto-sets expiry. | |
| Manual add as leftover | User manually adds new inventory item marked as leftover. | ✓ |
| You decide | Claude picks | |

**User's choice:** Manual add as leftover

### Deduction Order
| Option | Description | Selected |
|--------|-------------|----------|
| FIFO (oldest first) | Deduct from oldest purchased item first. | ✓ |
| Expiry-first | Deduct from item expiring soonest. | |
| You decide | Claude picks | |

**User's choice:** FIFO, but must tell user which specific item is being used
**Notes:** Show user which item (by purchase date) is being deducted for transparency.

### No Match Handling
| Option | Description | Selected |
|--------|-------------|----------|
| Skip silently | No error or prompt for missing items. | |
| Show summary | After Cook: "3 of 5 deducted. Missing: salt, olive oil." | ✓ |
| You decide | Claude picks | |

**User's choice:** Show summary

### Deduction Feedback
| Option | Description | Selected |
|--------|-------------|----------|
| Deduction receipt | Show summary: "Deducted: 200g chicken, 100g rice, 2 eggs" | ✓ |
| Silent with undo | Deduct silently, provide Undo button. | |
| You decide | Claude picks | |

**User's choice:** Deduction receipt

### Cost Scope
| Option | Description | Selected |
|--------|-------------|----------|
| Grocery purchases only | Weekly spend = new purchases only. Pantry items don't count. | ✓ |
| All ingredients at cost | All ingredients at last known price. True meal cost. | |
| Toggle between both | Switch view: grocery spend vs total meal cost. | |

**User's choice:** Weekly budget = grocery purchases only. Per-meal cost = all ingredients (informational).
**Notes:** Two separate views of cost data serving different purposes.

### Auto Restock
| Option | Description | Selected |
|--------|-------------|----------|
| Auto-add to grocery | When item hits zero, auto-add to grocery list. | |
| Suggest, don't auto-add | Notification when low, user decides. | |
| You decide | Claude picks | |

**User's choice:** Grocery list is based on planned meals' ingredients. Only bulk staples (spices, sugar, flour) should be suggested for restock.

### Staple Flag
| Option | Description | Selected |
|--------|-------------|----------|
| Yes, staple flag | Items marked as "staple" get low-stock alerts. | ✓ |
| No special flag | All items same, restock based on quantity thresholds. | |
| You decide | Claude picks | |

**User's choice:** Yes, staple flag

### Phase 18 Interface
| Signal | Selected |
|--------|----------|
| Available quantity per food | ✓ |
| Low-stock staple alerts | ✓ |
| Expiry-driven priority | ✓ |
| Purchase history | ✓ |

**User's choice:** All four interfaces selected

---

## Claude's Discretion

- Ledger-based vs simple quantity tracking (D-01)
- Food linking approach (D-02)
- Expiry visual treatment (D-19)
- Inline editing vs detail modal (D-20)
- Search/filter within inventory (D-21)

## Deferred Ideas

- **Waste tracking dashboard** — Aggregate discarded removal data into reports/trends (new phase for roadmap)
- **Recipe cooking instructions** — Step-by-step cooking directions in recipes (new capability)
- **Grocery store API integration** — Auto-populate prices from store APIs (from Phase 16)
- **Smart meal suggestions from expiring inventory** — "Use chicken before Thursday" (Phase 22 territory)
