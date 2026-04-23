import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PlatformLogos from '../components/PlatformLogos';

describe('PlatformLogos', () => {
  it('affiche les bonnes étiquettes selon le dictionnaire', () => {
    const mockPlatforms = [
      { name: 'PlayStation 5' },
      { name: 'PC (Microsoft Windows)' },
    ];
    render(<PlatformLogos platforms={mockPlatforms} />);

    expect(screen.getByText('PS5')).toBeInTheDocument();
    expect(screen.getByText('PC')).toBeInTheDocument();
  });
});
