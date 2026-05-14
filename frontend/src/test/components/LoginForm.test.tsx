import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { forwardRef, useImperativeHandle } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as googleOAuth from '../../auth/googleOAuth';
import LoginForm from '../../components/LoginForm';
import { useAuth } from '../../contexts/useAuth';
import { apiPost } from '../../services/api';

// --- MOCKS ---
vi.mock('../../services/api', () => ({ apiPost: vi.fn() }));
vi.mock('../../contexts/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../../auth/googleOAuth', () => ({ startGoogleLogin: vi.fn() }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockRecaptchaReset = vi.fn();
vi.mock('react-google-recaptcha', () => {
  return {
    default: forwardRef(function MockRecaptcha({ onChange }: any, ref) {
      useImperativeHandle(ref, () => ({
        reset: mockRecaptchaReset,
      }));
      return (
        <button
          data-testid="mock-recaptcha"
          type="button"
          onClick={() => onChange('test-captcha-token')}
        >
          Valider Captcha
        </button>
      );
    }),
  };
});

describe('LoginForm', () => {
  const mockSetAuthenticated = vi.fn();
  const mockOnSwitchToRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      setAuthenticated: mockSetAuthenticated,
    } as any);
  });

  it('affiche une erreur si email ou mot de passe est manquant', async () => {
    render(
      <MemoryRouter>
        <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(
      await screen.findByText('Veuillez remplir tous les champs.')
    ).toBeInTheDocument();
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("affiche une erreur si le captcha n'est pas validé", async () => {
    render(
      <MemoryRouter>
        <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'a@a.com' },
    });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), {
      target: { value: 'pass' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(
      await screen.findByText('Veuillez valider le reCAPTCHA.')
    ).toBeInTheDocument();
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("appelle l'API, connecte l'utilisateur et redirige vers / (sans onLoginSuccess)", async () => {
    vi.mocked(apiPost).mockResolvedValueOnce({ token: '123' });

    render(
      <MemoryRouter>
        <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'a@a.com' },
    });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), {
      target: { value: 'pass' },
    });

    fireEvent.click(screen.getByTestId('mock-recaptcha'));
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/api/auth/login/', {
        email: 'a@a.com',
        password: 'pass',
        recaptcha_token: 'test-captcha-token',
      });
    });

    expect(mockSetAuthenticated).toHaveBeenCalledWith(true);
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it("appelle l'API et utilise onLoginSuccess si fourni", async () => {
    vi.mocked(apiPost).mockResolvedValueOnce({ token: '123' });
    const mockOnLoginSuccess = vi.fn();

    render(
      <MemoryRouter>
        <LoginForm
          onSwitchToRegister={mockOnSwitchToRegister}
          onLoginSuccess={mockOnLoginSuccess}
        />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'a@a.com' },
    });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), {
      target: { value: 'pass' },
    });
    fireEvent.click(screen.getByTestId('mock-recaptcha'));
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    await waitFor(() => {
      expect(mockSetAuthenticated).toHaveBeenCalledWith(true);
    });

    expect(mockOnLoginSuccess).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("gère les erreurs d'API et réinitialise le reCAPTCHA", async () => {
    vi.mocked(apiPost).mockRejectedValueOnce(
      new Error('Identifiants invalides')
    );

    render(
      <MemoryRouter>
        <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'a@a.com' },
    });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), {
      target: { value: 'pass' },
    });
    fireEvent.click(screen.getByTestId('mock-recaptcha'));

    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(
      await screen.findByText('Identifiants invalides')
    ).toBeInTheDocument();
    expect(mockRecaptchaReset).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(
      await screen.findByText('Veuillez valider le reCAPTCHA.')
    ).toBeInTheDocument();
  });

  it('lance la connexion Google au clic', () => {
    render(
      <MemoryRouter>
        <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />
      </MemoryRouter>
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: /Se connecter avec Google|Log in with Google/i,
      })
    );
    expect(googleOAuth.startGoogleLogin).toHaveBeenCalled();
  });

  it('gère les erreurs de la connexion Google', async () => {
    vi.mocked(googleOAuth.startGoogleLogin).mockImplementationOnce(() => {
      throw new Error('Erreur popup Google');
    });

    render(
      <MemoryRouter>
        <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />
      </MemoryRouter>
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: /Se connecter avec Google|Log in with Google/i,
      })
    );

    expect(await screen.findByText('Erreur popup Google')).toBeInTheDocument();
  });
});
