import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { School, QrCode, Smartphone, Wifi, FileText, CheckCircle } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    { icon: QrCode, title: "QR Code Scanning", desc: "Quick attendance with student ID cards" },
    { icon: Smartphone, title: "Mobile Friendly", desc: "Works on any basic Android phone" },
    { icon: Wifi, title: "Offline Mode", desc: "Mark attendance without internet" },
    { icon: FileText, title: "Auto Reports", desc: "Daily & monthly reports generated" },
    { icon: CheckCircle, title: "Easy to Use", desc: "Simple interface for rural teachers" },
    { icon: School, title: "Government Ready", desc: "Mid-Day Meal scheme compatible" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
          <div className="inline-block p-4 bg-background/20 rounded-full mb-4">
            <School className="w-16 h-16" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Rural Attendance Scanner
          </h1>
          <p className="text-xl md:text-2xl opacity-95 max-w-2xl mx-auto">
            Simple, fast, and offline-ready attendance tracking for rural Indian schools
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg"
              variant="secondary"
              className="h-14 px-8 text-lg font-semibold"
              onClick={() => navigate("/login")}
            >
              Teacher Login
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="h-14 px-8 text-lg font-semibold bg-transparent text-primary-foreground border-primary-foreground hover:bg-background/20"
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Key Features</h2>
          <p className="text-lg text-muted-foreground">
            Designed specifically for low-resource environments
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <feature.icon className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-muted py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground">Three simple steps to digital attendance</p>
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Login with PIN</h3>
                  <p className="text-muted-foreground">Teachers login using a simple 4-digit PIN - no email or password needed</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center text-2xl font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Scan or Mark</h3>
                  <p className="text-muted-foreground">Scan student QR cards or mark attendance manually - works offline too</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-2xl font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Auto Reports</h3>
                  <p className="text-muted-foreground">Download daily, weekly, or monthly reports in CSV/PDF format for government schemes</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="text-center mt-12">
            <Button 
              size="lg"
              className="h-14 px-8 text-lg font-semibold"
              onClick={() => navigate("/login")}
            >
              Get Started Now
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-foreground text-background py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm opacity-80">
            Built for rural Indian schools • Works on basic Android phones • Offline-ready
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
