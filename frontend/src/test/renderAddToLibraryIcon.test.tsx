import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderAddToLibraryIcon } from '../utils/renderAddToLibraryIcon';

describe('renderAddToLibraryIcon', () => {
  it('affiche un CircularProgress quand adding est true', () => {
    const { container } = render(
      <>{renderAddToLibraryIcon({ adding: true, added: false })}</>
    );
    expect(
      container.querySelector('.MuiCircularProgress-root')
    ).toBeInTheDocument();
  });

  it('affiche un CheckIcon quand added est true', () => {
    const { getByTestId } = render(
      <>{renderAddToLibraryIcon({ adding: false, added: true })}</>
    );
    expect(getByTestId('CheckIcon')).toBeInTheDocument();
  });
});
