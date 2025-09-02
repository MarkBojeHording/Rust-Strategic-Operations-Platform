
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

        {/* User Interface Features */}
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-8 mb-16">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 text-center">
            Interactive Tactical Map Interface
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <Map className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Map Overview</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Interactive tactical map with zoom controls and grid-based coordinate system for precise base placement
              </p>
            </div>
            <div className="text-center">
              <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Base Management</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Place and manage friendly/enemy bases with real-time data visualization and resource tracking
              </p>
            </div>
            <div className="text-center">
              <Zap className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Tactical Reports</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Generate tactical reports based on gameplay needs with interactive map markers and team coordination
              </p>
            </div>
          </div>
        </div>

        {/* Features List */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-8 mb-16 shadow-lg">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Key Features</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
              <li>• Interactive tactical map as main interface</li>
              <li>• Real-time data visualization</li>
              <li>• Base placement and management tools</li>
              <li>• Zoom controls and map navigation</li>
            </ul>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
              <li>• Resource management tools</li>
              <li>• Tactical report generation</li>
              <li>• Map marker manipulation</li>
              <li>• Strategic gameplay coordination</li>
            </ul>
          </div>
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
