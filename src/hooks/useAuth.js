import { useBookStore } from '../store/useBookStore';

export function useAuth() {
  const user = useBookStore(state => state.user);
  const loading = useBookStore(state => state.loading);
  const authError = useBookStore(state => state.authError);
  
  return {
    user,
    loading,
    authError,
    isAuthenticated: !!user
  };
}
