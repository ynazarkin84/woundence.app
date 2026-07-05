import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import woundenceLogo from "../assets/woundence-logo-icon.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto shadow-lg">
                <img 
                  src={woundenceLogo} 
                  alt="Woundence Logo" 
                  className="w-12 h-12 object-contain"
                />
              </div>
              <h1 className="text-2xl font-bold text-foreground bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                Woundence
              </h1>
              <p className="text-muted-foreground">
                Advanced Wound Care Electronic Medical Records System
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="text-left space-y-2">
                <h3 className="font-semibold text-foreground">Features:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Patient Records Management</li>
                  <li>• AI-Powered Wound Imaging</li>
                  <li>• Appointment Scheduling</li>
                  <li>• Treatment Plans & SOAP Notes</li>
                  <li>• Insurance Processing</li>
                  <li>• Audit Logs & Compliance</li>
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                <Link href="/sign-in">
                  <Button className="w-full" data-testid="button-login">
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button variant="outline" className="w-full" data-testid="button-signup">
                    Create an Account
                  </Button>
                </Link>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Secure healthcare data management with role-based access control
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
