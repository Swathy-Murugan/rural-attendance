import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QrCode, ArrowLeft, CheckCircle, Camera, Wifi, WifiOff } from "lucide-react";
import { useAttendance } from "@/hooks/useAttendance";
import { useSync } from "@/hooks/useSync";

const Scan = () => {
  const navigate = useNavigate();
  const { students, markAttendance } = useAttendance();
  const { isOnline } = useSync();
  const [scanning, setScanning] = useState(false);
  const [scannedStudent, setScannedStudent] = useState<string | null>(null);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("teacherLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  const handleStartScan = () => {
    setScanning(true);
    setScannedStudent(null);
    
    // Simulate QR scan after 2 seconds
    setTimeout(async () => {
      if (students.length === 0) {
        setScanning(false);
        return;
      }
      
      const randomStudent = students[Math.floor(Math.random() * students.length)];
      setScannedStudent(`${randomStudent.name} - ${randomStudent.class}`);
      setScanning(false);
      
      // Mark attendance in IndexedDB
      await markAttendance(randomStudent.id, "present");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button 
            variant="secondary" 
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="h-12 w-12"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">QR Scanner</h1>
            <p className="text-sm opacity-90">Scan student ID cards</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Online Status */}
        <Card className="p-3">
          <div className="flex items-center gap-2 justify-center">
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4 text-success" />
                <span className="text-sm font-medium text-success">Online - Auto-syncing</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-warning" />
                <span className="text-sm font-medium text-warning">Offline - Saving locally</span>
              </>
            )}
          </div>
        </Card>

        {/* Scanner Card */}
        <Card className="p-6 space-y-6">
          <div className="text-center">
            <div className="mx-auto w-48 h-48 bg-muted rounded-2xl flex items-center justify-center mb-4 border-4 border-dashed border-border">
              {scanning ? (
                <div className="animate-pulse">
                  <Camera className="w-24 h-24 text-primary" />
                </div>
              ) : (
                <QrCode className="w-24 h-24 text-muted-foreground" />
              )}
            </div>
            
            {scanning ? (
              <div className="space-y-2">
                <p className="text-xl font-semibold">Scanning...</p>
                <p className="text-muted-foreground">Position QR code in frame</p>
              </div>
            ) : scannedStudent ? (
              <div className="space-y-4">
                <CheckCircle className="w-16 h-16 text-success mx-auto" />
                <div>
                  <p className="text-xl font-semibold text-success">Attendance Marked!</p>
                  <p className="text-lg font-medium mt-2">{scannedStudent}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date().toLocaleTimeString("en-IN")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xl font-semibold">Ready to Scan</p>
                <p className="text-muted-foreground">Tap button below to activate camera</p>
              </div>
            )}
          </div>

          <Button 
            className="w-full h-16 text-lg font-semibold"
            onClick={handleStartScan}
            disabled={scanning}
          >
            {scanning ? "Scanning..." : scannedStudent ? "Scan Next Student" : "Start Camera"}
          </Button>
        </Card>

        {/* Instructions */}
        <Card className="p-6 bg-accent text-accent-foreground">
          <h3 className="font-bold text-lg mb-3">Instructions</h3>
          <ul className="space-y-2 text-sm">
            <li>• Hold phone steady and align QR code in center</li>
            <li>• Ensure good lighting for best results</li>
            <li>• QR code should fill most of the frame</li>
            <li>• Attendance is saved automatically</li>
            <li>• Works offline - syncs when connected</li>
          </ul>
        </Card>

        {/* Demo Note */}
        <Card className="p-4 bg-warning text-warning-foreground">
          <p className="text-sm font-medium text-center">
            📱 Demo Mode: Simulated scanning for demonstration purposes
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Scan;
