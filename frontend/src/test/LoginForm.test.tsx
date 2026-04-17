import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { apiPost } from '../services/api';
import { useAuth } from '../contexts/useAuth';
import LoginForm from '../components/LoginForm';

vi.mock('../services/api', () => ({ apiPost: vi.fn() }));
vi.mock('../contexts/useAuth', () => ({ useAuth: vi.fn() }));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ setAuthenticated: vi.fn() } as any);
  });

  it("appelle l'API et connecte l'utilisateur", async () => {
    vi.mocked(apiPost).mockResolvedValueOnce({ token: '123' });

    render(
      <MemoryRouter>
        <LoginForm onSwitchToRegister={vi.fn()} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'a@a.com' },
    });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), {
      target: { value: 'pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/api/auth/login/', {
        email: 'a@a.com',
        password: 'pass',
      });
    });
  });
});
