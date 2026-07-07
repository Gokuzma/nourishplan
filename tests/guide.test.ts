import { describe, it, expect } from 'vitest';

describe('User Guide (DOCS-01)', () => {
  it('GuidePage route exists in App.tsx', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/App.tsx', 'utf8');
    expect(src).toContain('path="/guide"');
    expect(src).toContain('GuidePage');
  });

  it('GuidePage contains all 6 major feature sections', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/pages/GuidePage.tsx', 'utf8');
    expect(src).toContain("id: 'getting-started'");
    expect(src).toContain("id: 'adding-foods'");
    expect(src).toContain("id: 'recipes'");
    expect(src).toContain("id: 'meal-plan'");
    expect(src).toContain("id: 'tracking'");
    expect(src).toContain("id: 'household-admin'");
  });

  it('GuidePage documents the current feature set (market pricing, insights, automation)', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/pages/GuidePage.tsx', 'utf8');
    // Automatic StatCan market pricing
    expect(src).toContain("id: 'budget'");
    expect(src).toMatch(/Statistics Canada/i);
    // Insights / weekly trends
    expect(src).toContain("id: 'insights'");
    // Auto-draft + push notifications
    expect(src).toContain("id: 'automation'");
    expect(src).toMatch(/auto-draft/i);
    expect(src).toMatch(/notifications/i);
  });

  it('MobileDrawer has User Guide nav item', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/components/layout/MobileDrawer.tsx', 'utf8');
    expect(src).toContain("label: 'User Guide'");
    expect(src).toContain("to: '/guide'");
  });

  it('Sidebar has User Guide nav item', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
    expect(src).toContain("label: 'User Guide'");
    expect(src).toContain("to: '/guide'");
  });

  it('GuidePage has deep-link hash support', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/pages/GuidePage.tsx', 'utf8');
    expect(src).toContain('location.hash');
    expect(src).toContain('scrollIntoView');
  });

  it('GuidePage has quick-start card', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/pages/GuidePage.tsx', 'utf8');
    expect(src).toContain('Get started in 5 steps');
  });
});
