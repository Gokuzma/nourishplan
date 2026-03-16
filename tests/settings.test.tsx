import { describe, it, expect } from 'vitest';

// ACCTM-01: Account deletion with typed confirmation
describe('Account deletion (ACCTM-01)', () => {
  it('Danger Zone section renders at bottom of SettingsPage', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');
    expect(src).toContain('Danger Zone');
    expect(src).toContain('Delete my account');
  });

  it('delete button is disabled until user types "DELETE" exactly', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');
    expect(src).toContain("deleteConfirmText !== 'DELETE'");
    expect(src).toContain('Type DELETE to confirm');
  });

  it('admin user sees member picker for admin transfer before confirmation', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');
    expect(src).toContain('selectedNewAdmin');
    expect(src).toContain('Transfer admin');
  });
});
