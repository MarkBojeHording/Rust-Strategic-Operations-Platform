
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, Map, Zap } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Rust Tactical Command Center
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
            Advanced tactical coordination platform for Rust teams with real-time map analysis and team management
          </p>
          <Button 
            size="lg" 
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold"
          >
            <Shield className="mr-2 h-5 w-5" />
            Log In to Command Center
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <Map className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Tactical Maps</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Interactive map system with real-time marker placement and team coordination tools
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Team Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Create and manage teams with role-based permissions for Scouts, Raiders, and Admins
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Zap className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <CardTitle>Real-time Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Live coordination with instant map updates and team communication features
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Shield className="h-12 w-12 text-orange-600 mx-auto mb-4" />
              <CardTitle>Secure Access</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Protected dashboard with secure authentication and role-based access control
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <div className="text-center text-slate-600 dark:text-slate-400">
          <p className="mb-4">
            Join your team's tactical operations and coordinate strategic gameplay
          </p>
          <p className="text-sm">
            Secure login required • Team permissions managed automatically
          </p>
        </div>
      </div>
    </div>
  );
}
