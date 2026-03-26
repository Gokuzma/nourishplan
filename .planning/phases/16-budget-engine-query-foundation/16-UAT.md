---
status: complete
phase: 16-budget-engine-query-foundation
source: 16-01-SUMMARY.md, 16-02-SUMMARY.md, 16-03-SUMMARY.md, 16-04-SUMMARY.md
started: 2026-03-26T22:00:00Z
updated: 2026-03-26T22:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Weekly Budget Field in Settings
expected: Admin user sees a Weekly Budget field under Household section in Settings with dollar input and Save button
result: pass

### 2. Food Prices Management in Settings
expected: Settings page shows a Food Prices section listing all saved prices with food name, store, price per 100g, and a Remove button for each
result: pass

### 3. Budget Summary Section on Plan Page
expected: Plan page shows a Weekly Budget section below the meal grid with a collapsible chevron, spend bar with color coding, budget amount, and spend vs remaining text
result: pass

### 4. Recipe Cost Per Serving Badge
expected: Opening a recipe in RecipeBuilder shows a cost per serving badge (e.g. "$1.77/serving") and each ingredient displays its price per 100g
result: pass

### 5. Mark as Cooked Button
expected: RecipeBuilder shows a "Mark as Cooked" button for existing recipes. Clicking it records spend and shows a confirmation message with inventory deduction warnings
result: pass

### 6. Spend Updates After Cooking
expected: After marking a recipe as cooked, navigating to the Plan page shows the updated spend total reflecting the recipe cost
result: pass

### 7. Query Key Migration — All Pages Load
expected: Home, Recipes, Meals, Plan, Household, and Settings pages all load correctly with data after the query key migration from inline strings to centralised factory
result: pass

### 8. Inline Budget Editing on Plan Page
expected: Clicking "Edit Budget" on the Plan page budget section shows an inline spinbutton input. Entering a new value and pressing Enter saves it, updating the display and remaining calculation
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
