import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QrCode, ArrowLeft, CheckCircle, Camera, Wifi, WifiOff, LogIn, LogOut, User } from "lucide-react";
import { useSupabaseAttendance } from "@/hooks/useSupabaseAttendance";
import { useSync } from "@/hooks/useSync";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSessionToken, verifySession, clearSession } from "@/lib/auth";

const Scan = () => {
  const navigate = useNavigate();
  const { students, markAttendance, hasMarkedType, loading } = useSupabaseAttendance();
  const { isOnline } = useSync();
  const [scanning, setScanning] = useState(false);
  const [scannedStudent, setScannedStudent] = useState<string | null>(null);
  const [scanType, setScanType] = useState<"entry" | "exit">("entry");
  const [lastScanType, setLastScanType] = useState<"entry" | "exit">("entry");

  useEffect(() => {
    const checkAuth = async () => {
      const token = getSessionToken();
      if (!token) {
        navigate("/login");
        return;
      }
      const result = await verifySession(token);
      if (!result.valid || result.userType !== 'teacher') {
        clearSession();
        navigate("/login");
      }
    };
    checkAuth();
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
      
      // Find a student that hasn't been marked for this type yet
      const eligibleStudents = students.filter(s => {
        const hasType = hasMarkedType(s.id, scanType);
        if (scanType === "exit") {
          const hasEntry = hasMarkedType(s.id, "entry");
          return hasEntry && !hasType;
        }
        return !hasType;
      });

      if (eligibleStudents.length === 0) {
        setScanning(false);
        setScannedStudent(null);
        return;
      }

      const randomStudent = eligibleStudents[Math.floor(Math.random() * eligibleStudents.length)];
      setScannedStudent(`${randomStudent.name} - ${randomStudent.class}`);
      setLastScanType(scanType);
      setScanning(false);
      
      // Mark attendance in IndexedDB
      await markAttendance(randomStudent.id, "present", scanType);
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

        {/* Entry/Exit Tabs */}
        <Tabs value={scanType} onValueChange={(v) => setScanType(v as "entry" | "exit")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-14">
            <TabsTrigger value="entry" className="text-lg gap-2">
              <LogIn className="w-5 h-5" />
              Entry Scan
            </TabsTrigger>
            <TabsTrigger value="exit" className="text-lg gap-2">
              <LogOut className="w-5 h-5" />
              Exit Scan
            </TabsTrigger>
          </TabsList>
        </Tabs>

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
                <p className="text-xl font-semibold">Scanning for {scanType}...</p>
                <p className="text-muted-foreground">Position QR code in frame</p>
              </div>
            ) : scannedStudent ? (
              <div className="space-y-4">
                <CheckCircle className="w-16 h-16 text-success mx-auto" />
                <div>
                  <p className="text-xl font-semibold text-success">
                    {lastScanType === "entry" ? "Entry" : "Exit"} Marked!
                  </p>
                  <p className="text-lg font-medium mt-2">{scannedStudent}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date().toLocaleTimeString("en-IN")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xl font-semibold">Ready to Scan {scanType === "entry" ? "Entry" : "Exit"}</p>
                <p className="text-muted-foreground">Tap button below to activate camera</p>
              </div>
            )}
          </div>

          <Button 
            className="w-full h-16 text-lg font-semibold"
            onClick={handleStartScan}
            disabled={scanning || students.length === 0}
          >
            {scanning ? "Scanning..." : scannedStudent ? "Scan Next Student" : "Start Camera"}
          </Button>
        </Card>

        {/* No Students Warning */}
        {!loading && students.length === 0 && (
          <Card className="p-6 text-center">
            <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-bold mb-2">No Students Added</h3>
            <p className="text-muted-foreground mb-4">
              Add students from the Student List page first before scanning.
            </p>
            <Button onClick={() => navigate("/students")}>
              Go to Student List
            </Button>
          </Card>
        )}

        {/* Instructions */}
        <Card className="p-6 bg-accent text-accent-foreground">
          <h3 className="font-bold text-lg mb-3">Double Verification Instructions</h3>
          <ul className="space-y-2 text-sm">
            <li>• <strong>Entry Scan:</strong> Use when students arrive at school</li>
            <li>• <strong>Exit Scan:</strong> Use when students leave (requires entry first)</li>
            <li>• Attendance is only valid when both scans are recorded</li>
            <li>• Only students added by you will appear here</li>
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
