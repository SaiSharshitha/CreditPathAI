import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Auth from '../pages/Auth';
import { AuthProvider } from '../context/AuthContext';
import api from '../api/client';

// Mock the API client
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

describe('Auth Page & Auth Context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders login form by default with demo accounts and inputs', () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i, selector: 'button[type="submit"]' })).toBeInTheDocument();
    expect(screen.getByText(/quick 1-click demo accounts/i)).toBeInTheDocument();
  });

  it('switches between Sign In and Register tabs', () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      </AuthProvider>
    );

    const registerTabBtn = screen.getByRole('tab', { name: /register tab/i });
    fireEvent.click(registerTabBtn);

    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i, selector: 'button[type="submit"]' })).toBeInTheDocument();
  });

  it('populates demo credentials when clicking a demo account pill', () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      </AuthProvider>
    );

    const adminPill = screen.getByRole('button', { name: /👑 admin/i });
    fireEvent.click(adminPill);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);

    expect(emailInput.value).toBe('admin@creditpath.ai');
    expect(passwordInput.value).toBe('CreditPath@2026');
    expect(screen.getByText(/loaded demo credentials for 👑 admin/i)).toBeInTheDocument();
  });

  it('successfully logs in and stores auth token in localStorage', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        token: 'test-jwt-token-123',
        user: {
          id: '1',
          name: 'System Admin',
          email: 'admin@creditpath.ai',
          role: 'Admin',
        },
      },
    });

    render(
      <AuthProvider>
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      </AuthProvider>
    );

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: 'admin@creditpath.ai' } });
    fireEvent.change(passwordInput, { target: { value: 'CreditPath@2026' } });

    const submitBtn = screen.getByRole('button', { name: /sign in/i, selector: 'button[type="submit"]' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'admin@creditpath.ai',
        password: 'CreditPath@2026',
      });
      expect(localStorage.getItem('creditpath_token')).toBe('test-jwt-token-123');
      expect(localStorage.getItem('creditpath_user')).toContain('System Admin');
    });
  });

  it('displays error alert on login failure', async () => {
    api.post.mockRejectedValueOnce({
      response: {
        status: 401,
        data: { detail: 'Invalid email or password' },
      },
    });

    render(
      <AuthProvider>
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'wrong@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpass' },
    });

    const submitBtn = screen.getByRole('button', { name: /sign in/i, selector: 'button[type="submit"]' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });
});
