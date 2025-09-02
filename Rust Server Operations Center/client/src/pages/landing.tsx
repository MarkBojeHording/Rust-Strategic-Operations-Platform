import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Shield, Users, Database } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            BattleMetrics Server Monitor
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
            Advanced real-time monitoring for gaming servers with comprehensive player tracking and analytics
          </p>
          <Button 
            size="lg" 
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold"
          >
            <Shield className="mr-2 h-5 w-5" />
            Log In to Dashboard
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <Activity className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Real-Time Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Live player join/leave events through WebSocket connections
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Player Profiles</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Comprehensive player tracking with session history and statistics
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Database className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Data Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Persistent storage with detailed session logs and play time tracking
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
                Protected dashboard with secure authentication and session management
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Stats Preview */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 mb-16">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 text-center">
            Professional Server Monitoring
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">Real-Time</div>
              <p className="text-slate-600 dark:text-slate-400">
                WebSocket connections for live player activity monitoring
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">Scalable</div>
              <p className="text-slate-600 dark:text-slate-400">
                Track thousands of players with PostgreSQL storage
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">Detailed</div>
              <p className="text-slate-600 dark:text-slate-400">
                Complete session history and player statistics
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Ready to monitor your gaming servers?
          </p>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-login-secondary"
            className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900"
          >
            Access Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}