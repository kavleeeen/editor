const API_BASE_URL = import.meta.env.VITE_BE_URL || 'http://localhost:3000'

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface AuthErrorResponse {
  success: false;
  error: string;
  message: string;
}

/**
 * Register a new user
 */
export const register = async (request: RegisterRequest): Promise<RegisterResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as AuthErrorResponse).message || 'Registration failed');
  }

  // Store token in localStorage
  if (data.success && data.data.token) {
    localStorage.setItem('authToken', data.data.token);
  }

  return data as RegisterResponse;
};

/**
 * Login an existing user
 */
export const login = async (request: LoginRequest): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as AuthErrorResponse).message || 'Login failed');
  }

  // Store token in localStorage
  if (data.success && data.data.token) {
    localStorage.setItem('authToken', data.data.token);
  }

  return data as LoginResponse;
};

/**
 * Get the stored authentication token
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

/**
 * Remove the authentication token (logout)
 */
export const removeAuthToken = (): void => {
  localStorage.removeItem('authToken');
};

/**
 * Decode JWT token to get user information
 */
export const getUserFromToken = (): User | null => {
  const token = getAuthToken();
  if (!token) return null;

  try {
    // JWT tokens have 3 parts separated by dots: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Decode the payload (middle part)
    const payload = parts[1];
    // Add padding if needed for base64 decoding
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decodedPayload = atob(paddedPayload);
    const userData = JSON.parse(decodedPayload);

    // Return user information if available
    if (userData && userData.name && userData.email) {
      return {
        id: userData.id || userData.sub || '',
        email: userData.email,
        name: userData.name
      };
    }
  } catch (error) {
    console.error('Error decoding token:', error);
  }

  return null;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

