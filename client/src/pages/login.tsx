import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RotateCcw, Eye, EyeOff, Lock } from "lucide-react";
import { BUILD_INFO } from "@/lib/build-info";

interface LoginProps {
  onLogin: (password: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const buildVersion = BUILD_INFO.fullVersion;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Password validation
      if (password === "Dennisd-401") {
        onLogin(password);
      } else {
        setError("Invalid password. Please try again.");
      }
    } catch (err) {
      setError("Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-primary/10 p-3 rounded-full">
              <RotateCcw className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Lantea
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Sistema Professionale di Replicazione Trading
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-semibold">
              <Lock className="w-5 h-5 inline mr-2" />
              Access Control
            </CardTitle>
            <CardDescription>
              Enter your password to access the trading platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pr-10"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Access Platform"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Watermark and Build Info */}
        <div className="text-center space-y-3">
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 space-y-2">
            <div className="text-center">
              <span className="bg-orange-500 text-white px-3 py-1 rounded font-bold text-xs mr-2">
                PRE-ALPHA
              </span>
              <span className="text-orange-800 dark:text-orange-200 font-mono text-xs">
                Build {buildVersion}
              </span>
            </div>
            <div className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
              <div className="font-medium mb-1">
                This version is intended for development purposes only.
              </div>
              <div>
                Not suitable for production use. Use at your own risk.
              </div>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              Software developed by <span className="text-primary font-semibold">NatGio</span>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Unauthorized access is prohibited. All activities are monitored.
          </p>
        </div>
      </div>
    </div>
  );
}