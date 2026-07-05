import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import TreatmentPlanForm from "@/components/TreatmentPlanForm";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";

export default function TreatmentPlans() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const { toast } = useToast();

  const { data: patients = [] } = useQuery({
    queryKey: ["/api/patients"],
  });

  const { data: treatmentPlans = [], isLoading } = useQuery({
    queryKey: ["/api/treatment-plans/patient", selectedPatient?.id],
    enabled: !!selectedPatient?.id,
    queryFn: async () => {
      const response = await fetch(`/api/treatment-plans/patient/${selectedPatient.id}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch treatment plans: ${response.status}`);
      }
      return response.json();
    },
  });

  const { data: wounds = [] } = useQuery({
    queryKey: ["/api/wounds/patient", selectedPatient?.id],
    enabled: !!selectedPatient?.id,
    queryFn: async () => {
      const response = await fetch(`/api/wounds/patient/${selectedPatient.id}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch wounds: ${response.status}`);
      }
      return response.json();
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: async (planData: any) => {
      console.log("Sending treatment plan data:", planData);
      const response = await fetch("/api/treatment-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planData),
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error("Server error:", response.status, errorData);
        throw new Error(`Server error: ${response.status} - ${errorData}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/treatment-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/treatment-plans/patient", selectedPatient?.id] });
      setIsNewPlanOpen(false);
      toast({
        title: "Success",
        description: "Treatment plan created successfully",
      });
    },
    onError: (error: any) => {
      console.error("Treatment plan creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create treatment plan",
        variant: "destructive",
      });
    },
  });

  const filteredPatients = searchQuery.length > 0 
    ? (patients as any[]).filter((patient: any) => 
        patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.patientId.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : (patients as any[]).slice(0, 10);

  return (
    <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card shadow-sm border-b border-border px-6 py-4 bg-gradient-to-r from-background via-accent/30 to-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" data-testid="button-back-dashboard" asChild>
                <Link href="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
              </Button>
              <div>
                <h2 className="text-2xl font-bold text-foreground bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                  Treatment Plans
                </h2>
                <p className="text-sm text-muted-foreground">
                  Manage advanced wound care protocols with Woundence
                </p>
              </div>
            </div>
            <Dialog open={isNewPlanOpen} onOpenChange={setIsNewPlanOpen}>
              <DialogTrigger asChild>
                <Button disabled={!selectedPatient} data-testid="button-new-treatment-plan">
                  <i className="fas fa-plus mr-2"></i>
                  New Treatment Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Create New Treatment Plan</DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto max-h-[calc(80vh-8rem)] pr-6">
                  <TreatmentPlanForm
                    patientId={selectedPatient?.id}
                    wounds={wounds}
                    onSubmit={(data) => createPlanMutation.mutate(data)}
                    isLoading={createPlanMutation.isPending}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="flex h-full">
            {/* Patient Selection Sidebar */}
            <div className="w-96 border-r border-border p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Select Patient</h3>
                  <Input
                    placeholder="Search patients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-patients"
                  />
                </div>

                <div className="space-y-3">
                  {filteredPatients.map((patient: any) => (
                    <Card 
                      key={patient.id}
                      className={`cursor-pointer transition-colors ${
                        selectedPatient?.id === patient.id 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => setSelectedPatient(patient)}
                      data-testid={`patient-card-${patient.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-primary font-medium text-sm">
                              {patient.firstName?.charAt(0)}{patient.lastName?.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {patient.firstName} {patient.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">{patient.patientId}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-6">
              {selectedPatient ? (
                <div className="space-y-6">
                  {/* Patient Header */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-primary font-semibold text-xl">
                              {selectedPatient.firstName?.charAt(0)}{selectedPatient.lastName?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-foreground">
                              {selectedPatient.firstName} {selectedPatient.lastName}
                            </h3>
                            <p className="text-muted-foreground">
                              Patient ID: {selectedPatient.patientId}
                            </p>
                          </div>
                        </div>
                        <Button onClick={() => setIsNewPlanOpen(true)}>
                          <i className="fas fa-plus mr-2"></i>
                          New Treatment Plan
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Treatment Plans */}
                  {isLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="animate-pulse">
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              <div className="h-4 bg-muted rounded w-1/3"></div>
                              <div className="h-3 bg-muted rounded w-2/3"></div>
                              <div className="h-3 bg-muted rounded w-1/2"></div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : treatmentPlans.length === 0 ? (
                    <Card>
                      <CardContent className="p-12">
                        <div className="text-center">
                          <i className="fas fa-clipboard-list text-4xl text-muted-foreground mb-4"></i>
                          <p className="text-lg font-medium text-foreground mb-2">No Treatment Plans</p>
                          <p className="text-muted-foreground mb-6">
                            Create a treatment plan to define wound care protocols
                          </p>
                          <Button onClick={() => setIsNewPlanOpen(true)}>
                            <i className="fas fa-plus mr-2"></i>
                            Create First Plan
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {treatmentPlans.map((plan: any, index: number) => (
                        <Card 
                          key={plan.id}
                          className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => setSelectedPlan(plan)}
                          data-testid={`treatment-plan-${index}`}
                        >
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="text-lg font-semibold text-foreground">
                                  {plan.planName || 'Unnamed Treatment Plan'}
                                </h4>
                                <div className="flex items-center space-x-2">
                                  <Badge variant={plan.isActive ? "default" : "secondary"}>
                                    {plan.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    v{plan.version}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Associated Wound:</span>
                                  <span className="ml-2 text-foreground">
                                    {plan.woundId ? 'Specific wound' : 'No specific wound'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Type of Wound:</span>
                                  <span className="ml-2 text-foreground capitalize">
                                    {plan.woundType?.replace('_', ' ') || 'Not specified'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Start Date:</span>
                                  <span className="ml-2 text-foreground">
                                    {plan.startDate ? format(new Date(plan.startDate), 'dd.MM.yyyy') : 'Not set'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">End Date:</span>
                                  <span className="ml-2 text-foreground">
                                    {plan.endDate ? format(new Date(plan.endDate), 'dd.MM.yyyy') : 'Not set'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Treatment Frequency:</span>
                                  <span className="ml-2 text-foreground capitalize">
                                    {plan.frequency?.replace('_', ' ') || 'Not specified'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Recommended Dressing:</span>
                                  <span className="ml-2 text-foreground capitalize">
                                    {plan.recommendedDressing?.replace('_', ' ') || 'Not specified'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Assigned Doctor:</span>
                                  <span className="ml-2 text-foreground">
                                    {plan.doctorId ? plan.doctorId : 'No doctor assigned'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Assigned Nurse:</span>
                                  <span className="ml-2 text-foreground">
                                    {plan.nurseId ? plan.nurseId : 'No nurse assigned'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex justify-end">
                                <Button variant="ghost" size="sm">
                                  <i className="fas fa-eye mr-2"></i>
                                  View Details
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <i className="fas fa-clipboard-list text-6xl text-muted-foreground mb-6"></i>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Treatment Plans</h3>
                    <p className="text-muted-foreground mb-6">
                      Select a patient to view and manage their treatment plans
                    </p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>• Define wound care protocols</p>
                      <p>• Set dressing change schedules</p>
                      <p>• Track treatment progress</p>
                      <p>• Version control for plan updates</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

      {/* Treatment Plan Details Modal */}
      {selectedPlan && (
        <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedPlan.planName}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Status and Version */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p className="text-foreground">
                    <Badge variant={selectedPlan.isActive ? "default" : "secondary"}>
                      {selectedPlan.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Version</label>
                  <p className="text-foreground">v{selectedPlan.version}</p>
                </div>
              </div>

              {/* Basic Plan Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Plan Name</label>
                  <p className="text-foreground">{selectedPlan.planName || 'Unnamed Treatment Plan'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Associated Wound</label>
                  <p className="text-foreground">
                    {selectedPlan.woundId ? 'Specific wound' : 'No specific wound'}
                  </p>
                </div>
              </div>

              {/* Dates and Frequency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                  <p className="text-foreground">
                    {selectedPlan.startDate ? format(new Date(selectedPlan.startDate), 'dd.MM.yyyy') : 'Not set'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">End Date</label>
                  <p className="text-foreground">
                    {selectedPlan.endDate ? format(new Date(selectedPlan.endDate), 'dd.MM.yyyy') : 'Not set'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Treatment Frequency</label>
                  <p className="text-foreground capitalize">
                    {selectedPlan.frequency?.replace('_', ' ') || 'Not specified'}
                  </p>
                </div>
              </div>

              {/* Medical Staff Assignments */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Assigned Doctor</label>
                  <p className="text-foreground">
                    {selectedPlan.doctorId || 'No doctor assigned'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Assigned Nurse</label>
                  <p className="text-foreground">
                    {selectedPlan.nurseId || 'No nurse assigned'}
                  </p>
                </div>
              </div>

              {/* Wound and Treatment Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type of Wound</label>
                  <p className="text-foreground capitalize">
                    {selectedPlan.woundType?.replace('_', ' ') || 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Recommended Dressing</label>
                  <p className="text-foreground capitalize">
                    {selectedPlan.recommendedDressing?.replace('_', ' ') || 'Not specified'}
                  </p>
                </div>
              </div>

              {/* Goals */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Goals</label>
                <p className="text-foreground mt-1 whitespace-pre-wrap">
                  {selectedPlan.goals || 'No goals specified'}
                </p>
              </div>

              {/* Protocols and Instructions */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Dressing Protocol</label>
                <p className="text-foreground mt-1 whitespace-pre-wrap">
                  {selectedPlan.dressingProtocol || 'No dressing protocol specified'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Debridement Schedule</label>
                <p className="text-foreground mt-1 whitespace-pre-wrap">
                  {selectedPlan.debridementSchedule || 'No debridement schedule specified'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Offloading Instructions</label>
                <p className="text-foreground mt-1 whitespace-pre-wrap">
                  {selectedPlan.offloadingInstructions || 'No offloading instructions specified'}
                </p>
              </div>

              {/* Created By */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created By</label>
                <p className="text-foreground">
                  {selectedPlan.createdByUser?.firstName} {selectedPlan.createdByUser?.lastName}
                  {selectedPlan.createdAt && (
                    <span className="text-muted-foreground ml-2">
                      on {format(new Date(selectedPlan.createdAt), 'MMMM d, yyyy')}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
