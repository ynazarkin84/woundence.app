import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VisitNotesForm from "@/components/VisitNotesForm";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";

export default function VisitNotes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isNewVisitOpen, setIsNewVisitOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const { toast } = useToast();

  const { data: patients = [] } = useQuery<any[]>({
    queryKey: ["/api/patients"],
  });

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ["/api/visits/patient", selectedPatient?.id],
    enabled: !!selectedPatient?.id,
    queryFn: () => fetch(`/api/visits/patient/${selectedPatient.id}`).then(res => res.json()),
  });

  const createVisitMutation = useMutation({
    mutationFn: (visitData: any) =>
      fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(visitData),
        credentials: "include",
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      setIsNewVisitOpen(false);
      toast({
        title: "Success",
        description: "Visit note created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create visit note",
        variant: "destructive",
      });
    },
  });

  const filteredPatients = searchQuery.length > 0 
    ? patients.filter((patient: any) => 
        patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.patientId.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : patients.slice(0, 10);

  const getVisitTypeColor = (type: string) => {
    switch (type) {
      case 'new_patient': return 'bg-blue-100 text-blue-700';
      case 'follow_up': return 'bg-green-100 text-green-700';
      case 'wound_care': return 'bg-orange-100 text-orange-700';
      case 'emergency': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card shadow-sm border-b border-border px-6 py-4">
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
                  Visit Notes
                </h2>
                <p className="text-sm text-muted-foreground">
                  SOAP notes and clinical documentation with Woundence
                </p>
              </div>
            </div>
            <Dialog open={isNewVisitOpen} onOpenChange={setIsNewVisitOpen}>
              <DialogTrigger asChild>
                <Button disabled={!selectedPatient} data-testid="button-new-visit">
                  <i className="fas fa-plus mr-2"></i>
                  New Visit Note
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Visit Note</DialogTitle>
                </DialogHeader>
                <VisitNotesForm
                  patientId={selectedPatient?.id}
                  onSubmit={(data) => createVisitMutation.mutate(data)}
                  isLoading={createVisitMutation.isPending}
                />
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
                        <Button onClick={() => setIsNewVisitOpen(true)}>
                          <i className="fas fa-plus mr-2"></i>
                          New Visit Note
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Visit Notes */}
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
                  ) : visits.length === 0 ? (
                    <Card>
                      <CardContent className="p-12">
                        <div className="text-center">
                          <i className="fas fa-file-medical text-4xl text-muted-foreground mb-4"></i>
                          <p className="text-lg font-medium text-foreground mb-2">No Visit Notes</p>
                          <p className="text-muted-foreground mb-6">
                            Create a visit note to document patient encounters
                          </p>
                          <Button onClick={() => setIsNewVisitOpen(true)}>
                            <i className="fas fa-plus mr-2"></i>
                            Create First Note
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {visits.map((visit: any, index: number) => (
                        <Card 
                          key={visit.id}
                          className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => setSelectedVisit(visit)}
                          data-testid={`visit-note-${index}`}
                        >
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <Badge className={getVisitTypeColor(visit.visitType)}>
                                    {visit.visitType.replace('_', ' ')}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {format(new Date(visit.visitDate), 'MMM d, yyyy • h:mm a')}
                                  </span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {visit.provider?.firstName} {visit.provider?.lastName}
                                </span>
                              </div>

                              {visit.chiefComplaint && (
                                <div>
                                  <p className="text-sm font-medium text-foreground">Chief Complaint:</p>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {visit.chiefComplaint}
                                  </p>
                                </div>
                              )}

                              {visit.assessment && (
                                <div>
                                  <p className="text-sm font-medium text-foreground">Assessment:</p>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {visit.assessment}
                                  </p>
                                </div>
                              )}

                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  {visit.totalAmount && (
                                    <span className="text-sm text-muted-foreground">
                                      Total: ${visit.totalAmount}
                                    </span>
                                  )}
                                  {visit.vitals && (
                                    <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                                      Vitals Recorded
                                    </span>
                                  )}
                                </div>
                                <Button variant="ghost" size="sm">
                                  <i className="fas fa-eye mr-2"></i>
                                  View
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
                    <i className="fas fa-file-medical text-6xl text-muted-foreground mb-6"></i>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Visit Notes</h3>
                    <p className="text-muted-foreground mb-6">
                      Select a patient to view and create visit notes
                    </p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>• SOAP note documentation</p>
                      <p>• Vital signs recording</p>
                      <p>• Billing and coding</p>
                      <p>• Clinical assessments</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

      {/* Visit Details Modal */}
      {selectedVisit && (
        <Dialog open={!!selectedVisit} onOpenChange={() => setSelectedVisit(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Visit Note - {format(new Date(selectedVisit.visitDate), 'MMMM d, yyyy')}
              </DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="soap" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="soap">SOAP Note</TabsTrigger>
                <TabsTrigger value="vitals">Vitals</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
              </TabsList>

              <TabsContent value="soap" className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {selectedVisit.chiefComplaint && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Chief Complaint</label>
                      <p className="text-foreground mt-1 p-3 bg-muted rounded">
                        {selectedVisit.chiefComplaint}
                      </p>
                    </div>
                  )}
                  {selectedVisit.subjective && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Subjective</label>
                      <p className="text-foreground mt-1 p-3 bg-muted rounded">
                        {selectedVisit.subjective}
                      </p>
                    </div>
                  )}
                  {selectedVisit.objective && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Objective</label>
                      <p className="text-foreground mt-1 p-3 bg-muted rounded">
                        {selectedVisit.objective}
                      </p>
                    </div>
                  )}
                  {selectedVisit.assessment && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Assessment</label>
                      <p className="text-foreground mt-1 p-3 bg-muted rounded">
                        {selectedVisit.assessment}
                      </p>
                    </div>
                  )}
                  {selectedVisit.plan && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Plan</label>
                      <p className="text-foreground mt-1 p-3 bg-muted rounded">
                        {selectedVisit.plan}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="vitals">
                {selectedVisit.vitals ? (
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(JSON.parse(selectedVisit.vitals)).map(([key, value]) => (
                      <div key={key}>
                        <label className="text-sm font-medium text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, ' $1')}
                        </label>
                        <p className="text-foreground">{value as string}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No vitals recorded for this visit</p>
                )}
              </TabsContent>

              <TabsContent value="orders">
                {selectedVisit.orders ? (
                  <div className="space-y-2">
                    {JSON.parse(selectedVisit.orders).map((order: string, index: number) => (
                      <div key={index} className="p-3 bg-muted rounded">
                        <p className="text-foreground">{order}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No orders recorded for this visit</p>
                )}
              </TabsContent>

              <TabsContent value="billing">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Total Amount</label>
                      <p className="text-foreground text-lg font-semibold">
                        ${selectedVisit.totalAmount || '0.00'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Insurance Covered</label>
                      <p className="text-foreground text-lg font-semibold">
                        ${selectedVisit.insuranceCovered || '0.00'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Patient Pay</label>
                      <p className="text-foreground text-lg font-semibold">
                        ${selectedVisit.patientPay || '0.00'}
                      </p>
                    </div>
                  </div>

                  {selectedVisit.billingCodes && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Billing Codes</label>
                      <div className="mt-1 space-y-1">
                        {JSON.parse(selectedVisit.billingCodes).map((code: string, index: number) => (
                          <Badge key={index} variant="outline">{code}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
