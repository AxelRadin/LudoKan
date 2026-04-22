import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AuthFormContainer from '../components/AuthFormContainer';

describe('AuthFormContainer', () => {
  it('affiche correctement le titre et appelle onSwitch au clic', () => {
    const handleSwitch = vi.fn();
    render(
      <AuthFormContainer
        title="Connexion"
        switchLabel="S'inscrire"
        onSwitch={handleSwitch}
      >
        <div data-testid="child-element">Contenu</div>
      </AuthFormContainer>
    );

    expect(screen.getByText('Connexion')).toBeInTheDocument();
    expect(screen.getByTestId('child-element')).toBeInTheDocument();

    fireEvent.click(screen.getByText("S'inscrire"));
    expect(handleSwitch).toHaveBeenCalledOnce();
  });
});
