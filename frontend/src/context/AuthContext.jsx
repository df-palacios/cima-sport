import { createContext, useContext, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

function readJSON(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}

/**
 * Una sola sesión para todos. Antes había dos (staff y cliente) sobre dos
 * tablas separadas, lo que impedía que una misma persona fuera empleada y
 * cliente a la vez. Ahora la cuenta es una, y lo que cambia es qué permisos
 * trae.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readJSON('cima_user'));

  function guardar(token, u) {
    localStorage.setItem('cima_token', token);
    localStorage.setItem('cima_user', JSON.stringify(u));
    setUser(u);
    return u;
  }

  async function login(email, password) {
    const { token, user: u } = await api.login(email, password);
    return guardar(token, u);
  }

  async function register(payload) {
    const { token, user: u } = await api.register(payload);
    return guardar(token, u);
  }

  function logout() {
    localStorage.removeItem('cima_token');
    localStorage.removeItem('cima_user');
    setUser(null);
  }

  /** ¿Tiene este permiso concreto? Es lo que decide qué se muestra. */
  function can(...permisos) {
    if (!user?.permissions) return false;
    return permisos.some((p) => user.permissions.includes(p));
  }

  return (
    <AuthContext.Provider value={{
      user, login, register, logout, can,
      // Alias para el código que aún habla de "customer"/"staff".
      customer: user, staff: user?.isEmployee ? user : null,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
