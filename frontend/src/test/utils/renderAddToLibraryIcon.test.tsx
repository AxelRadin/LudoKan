import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderAddToLibraryIcon } from '../../utils/renderAddToLibraryIcon';

describe('renderAddToLibraryIcon', () => {
  it('affiche le loader quand "adding" est true', () => {
    render(<>{renderAddToLibraryIcon({ adding: true, added: false })}</>);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    expect(screen.queryByTestId('CheckIcon')).not.toBeInTheDocument();
    expect(screen.queryByTestId('AddIcon')).not.toBeInTheDocument();
  });

  it('affiche l\'icône Check quand "added" est true (et adding false)', () => {
    render(<>{renderAddToLibraryIcon({ adding: false, added: true })}</>);

    expect(screen.getByTestId('CheckIcon')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it("affiche l'icône Add par défaut (adding false, added false)", () => {
    render(<>{renderAddToLibraryIcon({ adding: false, added: false })}</>);

    expect(screen.getByTestId('AddIcon')).toBeInTheDocument();
  });

  it('priorise le statut "adding" si les deux sont true', () => {
    render(<>{renderAddToLibraryIcon({ adding: true, added: true })}</>);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('CheckIcon')).not.toBeInTheDocument();
  });
});
