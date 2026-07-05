import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useClerk } from "@clerk/react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { 
  UserPlus, 
  CalendarPlus, 
  Search, 
  Camera, 
  ClipboardList, 
  FileText, 
  CreditCard, 
  Shield 
} from "lucide-react";
import type { User, Patient, Appointment, WoundAssessment } from "@/types/schema";

type DashboardStats = {
  todayAppointments: number;
  activePatients: number;
  totalWounds: number;
  healingRate: number;
};

export default function Dashboard() {
  const { user } = useAuth();
  const { signOut } = useClerk();
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats', {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch dashboard stats');
      return res.json();
    }
  });

  const { data: todayAppointments = [] } = useQuery<(Appointment & { patient: User; provider: User })[]>({
    queryKey: ["/api/appointments", format(new Date(), 'yyyy-MM-dd')],
    queryFn: async () => {
      const res = await fetch(`/api/appointments?date=${format(new Date(), 'yyyy-MM-dd')}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch appointments');
      return res.json();
    }
  });

  const { data: recentAssessments = [] } = useQuery<(WoundAssessment & { wound: { patient: User } })[]>({
    queryKey: ["/api/wound-assessments"],
  });

  // Debounced search effect
  useEffect(() => {
    const searchPatients = async (query: string) => {
      if (query.trim().length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      try {
        const response = await fetch(`/api/patients/search?q=${encodeURIComponent(query)}`, {
          credentials: 'include'
        });
        if (response.ok) {
          const patients = await response.json();
          setSearchResults(patients);
          setShowDropdown(patients.length > 0);
        }
      } catch (error) {
        console.error('Error searching patients:', error);
        setSearchResults([]);
        setShowDropdown(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      searchPatients(searchQuery);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePatientSelect = (patient: Patient) => {
    setSearchQuery(`${patient.firstName} ${patient.lastName} (${patient.patientId})`);
    setShowDropdown(false);
    // Navigate to patient profile or do something with the selected patient
    setLocation(`/patients?selected=${patient.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border px-4 sm:px-6 py-4 bg-gradient-to-r from-background via-accent/30 to-background">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                Dashboard
              </h2>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Welcome to Woundence, {user?.firstName || "Dr."}. You have {stats?.todayAppointments || 0} appointments today.
              </p>
            </div>
          </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="relative flex-1 sm:flex-none" ref={searchRef}>
                <Input
                  type="search"
                  placeholder="Search patients by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && searchResults.length > 0 && setShowDropdown(true)}
                  className="w-full sm:w-64 pr-10"
                  data-testid="input-search"
                />
                <Search className="w-4 h-4 absolute right-3 top-2.5 text-muted-foreground" />
                
                {/* Search Results Dropdown */}
                {showDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      searchResults.map((patient) => (
                        <div
                          key={patient.id}
                          className="px-4 py-3 hover:bg-accent cursor-pointer border-b border-border last:border-b-0 transition-colors"
                          onClick={() => handlePatientSelect(patient)}
                          data-testid={`search-result-${patient.patientId}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-foreground">
                                {patient.firstName} {patient.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                ID: {patient.patientId}
                              </p>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {patient.phone && (
                                <p>{patient.phone}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-muted-foreground">
                        No patients found
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button className="relative p-2 text-muted-foreground hover:text-foreground hidden sm:block" data-testid="button-notifications">
                <i className="fas fa-bell text-lg"></i>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
              </button>
              <div className="w-px h-6 bg-border hidden sm:block"></div>
              <span className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                Today: {format(new Date(), 'MMM d, yyyy')}
              </span>
              <div className="w-px h-6 bg-border hidden sm:block"></div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => signOut({ redirectUrl: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" })}
                data-testid="button-logout"
              >
                Sign Out
              </Button>
            </div>
          </div>
      </header>

      {/* Dashboard Content */}
      <main className="flex-1 overflow-y-auto p-6">
          {/* Quick Actions */}
          <Card className="mb-8" data-testid="card-quick-actions">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <Button
                  className="h-auto p-4 justify-start space-x-3 border-2 hover:opacity-90 transition-all bg-gradient-to-r from-primary via-secondary to-primary text-white"
                  data-testid="button-new-patient"
                  onClick={() => setLocation("/patients")}
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">Patients</p>
                    <p className="text-xs text-white/80">Manage patients</p>
                  </div>
                </Button>

                <Button
                  className="h-auto p-4 justify-start space-x-3 border-2 hover:opacity-90 transition-all bg-gradient-to-r from-primary via-secondary to-primary text-white"
                  data-testid="button-book-appointment"
                  onClick={() => setLocation("/appointments")}
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <CalendarPlus className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">Appointments</p>
                    <p className="text-xs text-white/80">Schedule visits</p>
                  </div>
                </Button>

                <Button
                  className="h-auto p-4 justify-start space-x-3 border-2 hover:opacity-90 transition-all bg-gradient-to-r from-primary via-secondary to-primary text-white"
                  data-testid="button-wound-imaging"
                  onClick={() => setLocation("/wound-imaging")}
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">Wound Imaging</p>
                    <p className="text-xs text-white/80">Capture & analyze</p>
                  </div>
                </Button>

                <Button
                  className="h-auto p-4 justify-start space-x-3 border-2 hover:opacity-90 transition-all bg-gradient-to-r from-primary via-secondary to-primary text-white"
                  data-testid="button-treatment-plans"
                  onClick={() => setLocation("/treatment-plans")}
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">Treatment Plans</p>
                    <p className="text-xs text-white/80">View care plans</p>
                  </div>
                </Button>

                <Button
                  className="h-auto p-4 justify-start space-x-3 border-2 hover:opacity-90 transition-all bg-gradient-to-r from-primary via-secondary to-primary text-white"
                  data-testid="button-visit-notes"
                  onClick={() => setLocation("/visit-notes")}
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">Visit Notes</p>
                    <p className="text-xs text-white/80">Document visits</p>
                  </div>
                </Button>

                <Button
                  className="h-auto p-4 justify-start space-x-3 border-2 hover:opacity-90 transition-all bg-gradient-to-r from-primary via-secondary to-primary text-white"
                  data-testid="button-insurance"
                  onClick={() => setLocation("/insurance")}
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">Insurance</p>
                    <p className="text-xs text-white/80">Manage coverage</p>
                  </div>
                </Button>

                <Button
                  className="h-auto p-4 justify-start space-x-3 border-2 hover:opacity-90 transition-all bg-gradient-to-r from-primary via-secondary to-primary text-white"
                  data-testid="button-audit-logs"
                  onClick={() => setLocation("/audit-logs")}
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">Audit Logs</p>
                    <p className="text-xs text-white/80">Track activity</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Today's Schedule */}
          <Card className="mb-8" data-testid="card-today-schedule">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle>Today's Schedule</CardTitle>
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {todayAppointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <i className="fas fa-calendar-check text-3xl mb-4"></i>
                    <p>No appointments scheduled for today</p>
                  </div>
                ) : (
                  todayAppointments.slice(0, 3).map((appointment: any, index: number) => (
                    <div
                      key={appointment.id}
                      className="flex items-center space-x-4 p-3 bg-accent/50 rounded-lg"
                      data-testid={`appointment-${index}`}
                    >
                      <div className="flex-shrink-0">
                        <div className={`w-2 h-12 rounded-full ${
                          appointment.status === 'arrived' ? 'bg-primary' : 'bg-muted'
                        }`}></div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-foreground">
                            {appointment.patient?.firstName} {appointment.patient?.lastName}
                          </p>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            appointment.status === 'arrived' ? 'bg-secondary/20 text-secondary' :
                            appointment.status === 'scheduled' ? 'bg-primary/20 text-primary' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {appointment.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {appointment.appointmentDate && !isNaN(new Date(appointment.appointmentDate).getTime()) ? (
                            <>
                              {format(new Date(appointment.appointmentDate), 'h:mm a')} - 
                              {format(new Date(new Date(appointment.appointmentDate).getTime() + appointment.duration * 60000), 'h:mm a')}
                            </>
                          ) : (
                            'Time not available'
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{appointment.appointmentType}</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <i className="fas fa-arrow-right"></i>
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card data-testid="card-active-patients">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Patients</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.activePatients || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-users text-secondary text-lg"></i>
                  </div>
                </div>
                <p className="text-xs text-secondary mt-2">
                  <i className="fas fa-arrow-up"></i> 12% this month
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-healing-rate">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Healing Rate</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.healingRate || 0}%</p>
                  </div>
                  <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-chart-line text-secondary text-lg"></i>
                  </div>
                </div>
                <p className="text-xs text-secondary mt-2">
                  <i className="fas fa-arrow-up"></i> 3% improvement
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-wounds">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Wounds</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.totalWounds || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-plus-circle text-secondary text-lg"></i>
                  </div>
                </div>
                <p className="text-xs text-secondary mt-2">
                  <i className="fas fa-arrow-up"></i> 5% new cases
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Wound Assessments */}
          <Card className="mt-8" data-testid="card-recent-assessments">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle>Recent Wound Assessments</CardTitle>
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                  View All Wounds
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentAssessments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <i className="fas fa-camera-retro text-3xl mb-4"></i>
                  <p>No wound assessments recorded yet</p>
                </div>
              ) : (
                <>
                  {/* Mobile: Card Layout */}
                  <div className="block lg:hidden">
                    <div className="space-y-4 p-4">
                      {recentAssessments.slice(0, 5).map((assessment: any, index: number) => (
                        <div 
                          key={assessment.id} 
                          className="bg-accent/30 rounded-lg p-4 space-y-3"
                          data-testid={`assessment-card-${index}`}
                        >
                          {/* Patient Info */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-medium text-secondary">
                                  {assessment.wound?.patient?.firstName?.charAt(0)}
                                  {assessment.wound?.patient?.lastName?.charAt(0)}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground">
                                  {assessment.wound?.patient?.firstName} {assessment.wound?.patient?.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {assessment.wound?.patient?.patientId}
                                </p>
                              </div>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${
                              assessment.wound?.stage === 1 ? 'bg-secondary/20 text-secondary' :
                              assessment.wound?.stage === 2 ? 'bg-yellow-100 text-yellow-700' :
                              assessment.wound?.stage === 3 ? 'bg-orange-100 text-orange-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              Stage {assessment.wound?.stage}
                            </span>
                          </div>

                          {/* Wound Details */}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Location:</span>
                              <p className="font-medium text-foreground">{assessment.wound?.location || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Size:</span>
                              <p className="font-medium text-foreground">{assessment.area || 'N/A'} cm²</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Assessment:</span>
                              <p className="font-medium text-foreground">
                                {assessment.assessmentDate && format(new Date(assessment.assessmentDate), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Progress:</span>
                              <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 rounded-full bg-secondary"></div>
                                <span className="text-sm text-secondary font-medium">Improving</span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-end space-x-1 pt-2 border-t border-border">
                            <Button variant="ghost" size="sm" title="View Details" className="h-8 px-2">
                              <i className="fas fa-eye text-xs"></i>
                            </Button>
                            <Button variant="ghost" size="sm" title="Capture Image" className="h-8 px-2">
                              <i className="fas fa-camera text-xs"></i>
                            </Button>
                            <Button variant="ghost" size="sm" title="Edit Assessment" className="h-8 px-2">
                              <i className="fas fa-edit text-xs"></i>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Desktop: Table Layout */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Patient</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Wound Location</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Stage</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Size (cm²)</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Last Assessment</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Progress</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentAssessments.slice(0, 5).map((assessment: any, index: number) => (
                          <tr 
                            key={assessment.id} 
                            className="border-b border-border hover:bg-accent/30"
                            data-testid={`assessment-row-${index}`}
                          >
                            <td className="p-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-secondary/20 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-medium text-secondary">
                                    {assessment.wound?.patient?.firstName?.charAt(0)}
                                    {assessment.wound?.patient?.lastName?.charAt(0)}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">
                                    {assessment.wound?.patient?.firstName} {assessment.wound?.patient?.lastName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {assessment.wound?.patient?.patientId}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-sm text-foreground">{assessment.wound?.location}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                assessment.wound?.stage === 1 ? 'bg-secondary/20 text-secondary' :
                                assessment.wound?.stage === 2 ? 'bg-yellow-100 text-yellow-700' :
                                assessment.wound?.stage === 3 ? 'bg-orange-100 text-orange-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                Stage {assessment.wound?.stage}
                              </span>
                            </td>
                            <td className="p-4 text-sm text-foreground">{assessment.area || 'N/A'}</td>
                            <td className="p-4 text-sm text-muted-foreground">
                              {assessment.assessmentDate && format(new Date(assessment.assessmentDate), 'MMM d, yyyy')}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-secondary"></div>
                                <span className="text-sm text-secondary">Improving</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm" title="View Details">
                                  <i className="fas fa-eye"></i>
                                </Button>
                                <Button variant="ghost" size="sm" title="Capture Image">
                                  <i className="fas fa-camera"></i>
                                </Button>
                                <Button variant="ghost" size="sm" title="Edit Assessment">
                                  <i className="fas fa-edit"></i>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
      </main>
    </div>
  );
}
