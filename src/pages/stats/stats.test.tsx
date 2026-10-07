import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Page } from './+Page';
import { render, screen } from '~/__test__/utils';

describe('Stats & Infographics Page', () => {
  it('renders all sections and KPIs cleanly', async () => {
    await render(<Page />);

    // Page Heading
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /Live Statistics & Infographics/i
    );

    // KPI Cards: Recorded Lives, Songs Performed, 3D Cast Plays, 2D Screen Plays
    expect(screen.getByText(/Recorded Lives/i)).toBeInTheDocument();
    expect(screen.getByText(/Songs Performed/i)).toBeInTheDocument();
    expect(screen.getByText(/3D Cast Plays/i)).toBeInTheDocument();
    expect(screen.getByText(/2D Screen Plays/i)).toBeInTheDocument();

    // Section 1: 2D Screen vs 3D Cast
    expect(screen.getByText(/2D Screen vs 3D Cast Performances/i)).toBeInTheDocument();

    // Section 2: Release to Stage Debut
    expect(screen.getByText(/Time Between Song Release & Stage Debut/i)).toBeInTheDocument();
    expect(screen.getByText(/Express Lane/i)).toBeInTheDocument();
    expect(screen.getByText(/Veteran Arrivals/i)).toBeInTheDocument();

    // Section 3: Focus Matrix
    expect(screen.getByText(/Character Focus Songs Live Debut Matrix/i)).toBeInTheDocument();
    // Verify a character is present
    expect(screen.getByText('Ichika Hoshino')).toBeInTheDocument();

    // Section 4: Version Length
    expect(screen.getByText(/Performance Version Length: Full vs Short Size/i)).toBeInTheDocument();

    // Section 5: Unperformed Songs
    expect(screen.getByText(/Songs Awaiting Live Debut/i)).toBeInTheDocument();
  });

  it('allows switching overlap tabs in 2D vs 3D section', async () => {
    const [, user] = await render(<Page />);

    // Default tab is Both 2D & 3D
    const cast3dBtn = screen.getByRole('button', { name: /3D Cast Only/i });
    expect(cast3dBtn).toBeInTheDocument();

    await user.click(cast3dBtn);
    expect(screen.getByText(/never at COLORFUL LIVE/i)).toBeInTheDocument();
  });

  it('allows toggling commissioned vs covers and searching unperformed songs', async () => {
    const [, user] = await render(<Page />);

    // Switch to Covers tab
    const coversBtn = screen.getByRole('button', { name: /Covers & Outside/i });
    await user.click(coversBtn);

    // Search for a specific song
    const searchInput = screen.getByPlaceholderText(/Search by title or reading…/i);
    await user.type(searchInput, 'シャルル'); // Charles is performed, shouldn't show in unperformed

    expect(screen.getByText(/No songs match/i)).toBeInTheDocument();

    // Clear and search for an actual unperformed song
    await user.clear(searchInput);
    await user.type(searchInput, '炉心融解'); // Meltdown
    expect(screen.queryByText(/No songs match/i)).toBeNull();
  });

  it('renders heatmap legend and allows palette switching and filtering', async () => {
    const [, user] = await render(<Page />);

    // Verify heatmap swatches exist
    expect(screen.getByText(/Heatmap:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /7\+x/i })).toBeInTheDocument();

    // Click Sunset palette button
    const sunsetBtn = screen.getByRole('button', { name: /Sunset/i });
    expect(sunsetBtn).toBeInTheDocument();
    await user.click(sunsetBtn);

    // Filter by 7+x heat level
    const level5Btn = screen.getByRole('button', { name: /7\+x/i });
    await user.click(level5Btn);

    // Show All button appears when filtered
    const clearBtn = screen.getByRole('button', { name: /Show All/i });
    expect(clearBtn).toBeInTheDocument();
    await user.click(clearBtn);

    expect(screen.queryByRole('button', { name: /Show All/i })).toBeNull();
  });
});
