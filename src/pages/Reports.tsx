import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download, Calendar, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const Reports = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("teacherLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  const handleDownload = (type: string) => {
    toast.success(`${type} report downloaded`);
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
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="text-sm opacity-90">Download & View Statistics</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 bg-success text-success-foreground">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8" />
              <div>
                <p className="text-2xl font-bold">84%</p>
                <p className="text-sm opacity-90">Average Attendance</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-accent text-accent-foreground">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8" />
              <div>
                <p className="text-2xl font-bold">22</p>
                <p className="text-sm opacity-90">Working Days</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Download Reports */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Download Reports</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-semibold">Daily Report</p>
                <p className="text-sm text-muted-foreground">Today's attendance summary</p>
              </div>
              <Button onClick={() => handleDownload("Daily")} className="h-12">
                <Download className="w-5 h-5 mr-2" />
                CSV
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-semibold">Weekly Report</p>
                <p className="text-sm text-muted-foreground">Last 7 days overview</p>
              </div>
              <Button onClick={() => handleDownload("Weekly")} className="h-12">
                <Download className="w-5 h-5 mr-2" />
                CSV
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-semibold">Monthly Report</p>
                <p className="text-sm text-muted-foreground">Full month statistics</p>
              </div>
              <Button onClick={() => handleDownload("Monthly")} className="h-12">
                <Download className="w-5 h-5 mr-2" />
                CSV
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-semibold">Mid-Day Meal Report</p>
                <p className="text-sm text-muted-foreground">Government scheme data</p>
              </div>
              <Button 
                onClick={() => handleDownload("Mid-Day Meal")} 
                variant="secondary"
                className="h-12"
              >
                <Download className="w-5 h-5 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </Card>

        {/* Irregular Attendance Alert */}
        <Card className="p-6 bg-warning text-warning-foreground">
          <h3 className="font-bold text-lg mb-3">⚠️ Low Attendance Alert</h3>
          <div className="space-y-2 text-sm">
            <p>• Neha Patel - 45% attendance (9/20 days)</p>
            <p>• Rohit Mehta - 60% attendance (12/20 days)</p>
          </div>
          <Button variant="outline" className="mt-4 w-full h-12">
            View Full Details
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
