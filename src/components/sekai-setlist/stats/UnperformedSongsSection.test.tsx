import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '~/__test__/utils';
import { UnperformedSongsSection } from './UnperformedSongsSection';
import { computeSekaiStats } from '~/utils/sekai-setlist/stats';

describe('UnperformedSongsSection', () => {
  const stats = computeSekaiStats();

  it('renders default "Never Live" filter with accurate song counts', async () => {
    await render(
      <UnperformedSongsSection
        commissioned={stats.unperformed.commissioned}
        coversAndOther={stats.unperformed.coversAndOther}
        allAwaiting={stats.unperformed.allAwaiting}
      />
    );

    // Debut format buttons exist
    expect(screen.getByText(/Never Live/i)).toBeInTheDocument();
    expect(screen.getByText(/Awaiting 2D Debut/i)).toBeInTheDocument();
    expect(screen.getByText(/Awaiting 3D Debut/i)).toBeInTheDocument();
    expect(screen.getByText(/Awaiting Both/i)).toBeInTheDocument();
    expect(screen.getByText(/Awaiting Either/i)).toBeInTheDocument();

    // Default mode is Commissioned with 40 songs
    expect(screen.getByText(/Commissioned Songs \(40\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Covers & Outside \(400\)/i)).toBeInTheDocument();
  });

  it('switches to "Awaiting 2D Debut" and filters by 3D Cast debut status', async () => {
    await render(
      <UnperformedSongsSection
        commissioned={stats.unperformed.commissioned}
        coversAndOther={stats.unperformed.coversAndOther}
        allAwaiting={stats.unperformed.allAwaiting}
      />
    );

    // Switch to Awaiting 2D Debut
    fireEvent.click(screen.getByText(/Awaiting 2D Debut/i));

    // Commissioned count updates to 77
    expect(screen.getByText(/Commissioned Songs \(77\)/i)).toBeInTheDocument();

    // Sub-filters appear
    expect(screen.getByText(/All \(77\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Has 3D Cast Debut \(30\)/i)).toBeInTheDocument();
    expect(screen.getByText(/No 3D Cast Debut \(47\)/i)).toBeInTheDocument();

    // Click "Has 3D Cast Debut"
    fireEvent.click(screen.getByText(/Has 3D Cast Debut \(30\)/i));

    // Result count reflects 30 songs
    expect(screen.getByText('30 songs')).toBeInTheDocument();

    // Badges appear on the songs
    expect(screen.getAllByText(/Awaiting 2D/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3D: [0-9]+x/i).length).toBeGreaterThan(0);
  });

  it('switches to "Awaiting 3D Debut" and filters by 2D Live debut status', async () => {
    await render(
      <UnperformedSongsSection
        commissioned={stats.unperformed.commissioned}
        coversAndOther={stats.unperformed.coversAndOther}
        allAwaiting={stats.unperformed.allAwaiting}
      />
    );

    // Switch to Awaiting 3D Debut
    fireEvent.click(screen.getByText(/Awaiting 3D Debut/i));

    // Commissioned count updates to 89
    expect(screen.getByText(/Commissioned Songs \(89\)/i)).toBeInTheDocument();

    // Sub-filters appear
    expect(screen.getByText(/Has 2D Live Debut \(42\)/i)).toBeInTheDocument();
    expect(screen.getByText(/No 2D Live Debut \(47\)/i)).toBeInTheDocument();

    // Click "Has 2D Live Debut"
    fireEvent.click(screen.getByText(/Has 2D Live Debut \(42\)/i));
    expect(screen.getByText('42 songs')).toBeInTheDocument();

    // Badges appear
    expect(screen.getAllByText(/Awaiting 3D/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2D: [0-9]+x/i).length).toBeGreaterThan(0);
  });

  it('supports Awaiting Both and Awaiting Either filters and switching to Covers', async () => {
    await render(
      <UnperformedSongsSection
        commissioned={stats.unperformed.commissioned}
        coversAndOther={stats.unperformed.coversAndOther}
        allAwaiting={stats.unperformed.allAwaiting}
      />
    );

    // Switch to Awaiting Both
    fireEvent.click(screen.getByText(/Awaiting Both/i));
    expect(screen.getByText(/Commissioned Songs \(47\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Covers & Outside \(412\)/i)).toBeInTheDocument();

    // Switch to Awaiting Either
    fireEvent.click(screen.getByText(/Awaiting Either/i));
    expect(screen.getByText(/Commissioned Songs \(119\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Covers & Outside \(513\)/i)).toBeInTheDocument();

    // Switch to Covers & Outside tab
    fireEvent.click(screen.getByText(/Covers & Outside \(513\)/i));
    expect(screen.getByText('513 songs')).toBeInTheDocument();
  });
});
