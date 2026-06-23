import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setCurrentUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function login(email, password) {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Successfully logged in!');
    } catch (error) {
      toast.error('Failed to login: ' + error.message);
      throw error;
    }
  }

  async function signup(email, password, fullName) {
    try {
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            user_type: 'donor',
          },
        },
      });
      if (error) throw error;

      // Record consent
      if (data.user) {
        await supabase.from('user_consents').upsert({
          user_id: data.user.id,
          accepted_privacy_policy: true,
          accepted_terms: true,
          accepted_at: new Date().toISOString(),
        });
      }

      toast.success('Successfully registered!');
      return data;
    } catch (error) {
      toast.error('Failed to register: ' + error.message);
      throw error;
    }
  }

  async function loginWithGoogle() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/dashboard',
        },
      });
      if (error) throw error;
      toast.success('Redirecting to Google...');
    } catch (error) {
      toast.error('Failed to login with Google: ' + error.message);
      throw error;
    }
  }

  async function logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Successfully logged out!');
    } catch (error) {
      toast.error('Failed to logout: ' + error.message);
      throw error;
    }
  }

  const value = {
    currentUser,
    login,
    signup,
    loginWithGoogle,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}