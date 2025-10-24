import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const redirect = new URLSearchParams(window.location.search).get("redirect");
        navigate(redirect || "/");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const redirect = new URLSearchParams(window.location.search).get("redirect");
        navigate(redirect || "/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).toString(),
            data: {
              full_name: fullName,
            },
          },
        });
        
        if (error) throw error;
        
        toast({
          title: "Account created!",
          description: "Welcome to Dot Design.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
      const redirectTo = new URLSearchParams(location.search).get("redirect") || baseUrl;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ variant: "destructive", title: "Google sign-in failed", description: error.message });
    }
  };

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-display mb-2">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-muted-foreground">
            {isLogin ? "Sign in to your account" : "Join Dot Design today"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={!isLogin}
                placeholder="Your full name"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <div className="h-px bg-border w-full" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px bg-border w-full" />
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogle}>
          Continue with Google
        </Button>

        <div className="text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-muted-foreground hover:text-foreground elegant-transition"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
          {isLogin && (
            <div className="mt-2">
              <a href="/reset-password" className="text-sm text-muted-foreground hover:text-foreground">
                Forgot password?
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;