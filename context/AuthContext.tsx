import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase"; // Import the configured supabase client

// Move ADMIN_EMAILS to the top level, before AuthProvider
const ADMIN_EMAILS = [
  'prathamgupta2468@gmail.com',
  'shresthmantry72003@gmail.com'
];

interface User {
  name: string;
  email: string;
  password?: string;
  role: "user" | "admin";
  activities?: string[];
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => Promise<void>;
  isLoading: boolean; // Add loading state
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        console.log("Checking for existing session...");
        // Get the session from Supabase
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log("Found existing session for user:", session.user.email);
          const isAdmin = ADMIN_EMAILS.includes((session.user.email || "").toLowerCase());
          const userData = {
            name: session.user.user_metadata?.name || "",
            email: session.user.email || "",
            role: isAdmin ? "admin" : "user",
            activities: session.user.user_metadata?.activities || []
          };
          setUser(userData);
        } else {
          console.log("No existing session found");
        }
      } catch (error) {
        console.error("Error restoring session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event);
      
      if (session?.user) {
        const isAdmin = ADMIN_EMAILS.includes((session.user.email || "").toLowerCase());
        const userData = {
          name: session.user.user_metadata?.name || "",
          email: session.user.email || "",
          role: isAdmin ? "admin" : "user", // Ensure admin status is set correctly
          activities: session.user.user_metadata?.activities || []
        };
        setUser(userData);
      } else {
        setUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(error.message);
    if (!data.user) {
      throw new Error("Login failed: User not found.");
    }

    // Check if email is in admin list
    const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
    
    const userData: User = {
      name: data.user.user_metadata?.name || "",
      role: isAdmin ? "admin" : "user", // Set role based on email check
      email: data.user.email || "",
      activities: data.user.user_metadata?.activities || []
    };
    setUser(userData);
    console.log(userData);

    return userData;
  };

  const register = async (name: string, email: string, password: string) => {
    const role = ADMIN_EMAILS.includes(email.toLowerCase()) ? "admin" : "user";
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        },
      },
    });

    if (error) throw new Error(error.message);
    if (data.user) {
      const userData: User = {
        name,
        email,
        role: role as "user" | "admin",
        activities: []
      };
      setUser(userData);
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
      setUser(null);
      // No need to manually redirect - the auth state change will trigger the redirect
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const updateUser = async (updatedUser: Partial<User>) => {
    // Check if there's an active session first
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !user) {
      throw new Error("No active session. Please log in first.");
    }

    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...user,
        ...updatedUser,
      },
    });

    if (error) throw new Error(error.message);
    if (data.user) {
      const updatedUserData: User = {
        name: data.user.user_metadata?.name || user.name,
        email: data.user.email || user.email,
        role: (data.user.user_metadata?.role === "admin" || data.user.user_metadata?.role === "user")
          ? data.user.user_metadata.role as "admin" | "user"
          : user.role,
        activities: data.user.user_metadata?.activities || user.activities || []
      };
      setUser(updatedUserData);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Add this constant at the top of the file, after the imports
