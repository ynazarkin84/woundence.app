import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import PatientForm from "@/components/PatientForm";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Trash2, ArrowLeft } from "lucide-react";
import type { Patient, InsertPatient } from "@/types/schema";

export default function Patients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const { toast } = useToast();

  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: searchResults = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients/search", searchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/patients/search?q=${encodeURIComponent(searchQuery)}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to search patients');
      return res.json();
    },
    enabled: searchQuery.length > 2,
  });

  const createPatientMutation = useMutation({
    mutationFn: (patientData: InsertPatient) => 
      fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patientData),
        credentials: "include",
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients/search", searchQuery] });
      setIsNewPatientOpen(false);
      toast({
        title: "Success",
        description: "Patient created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create patient",
        variant: "destructive",
      });
    },
  });

  const deletePatientMutation = useMutation({
    mutationFn: (patientId: string) => 
      fetch(`/api/patients/${patientId}`, {
        method: "DELETE",
        credentials: "include",
      }).then(res => {
        if (!res.ok) {
          throw new Error('Failed to delete patient');
        }
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients/search", searchQuery] });
      setSelectedPatient(null);
      toast({
        title: "Success",
        description: "Patient and all associated data deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete patient",
        variant: "destructive",
      });
    },
  });

  const displayedPatients = searchQuery.length > 2 ? searchResults : patients;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border px-4 sm:px-6 py-4 bg-gradient-to-r from-background via-accent/30 to-background">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" data-testid="button-back-dashboard" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </Button>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                Patients
              </h2>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Manage patient records and demographics with Woundence
              </p>
            </div>
          </div>
            <Dialog open={isNewPatientOpen} onOpenChange={setIsNewPatientOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-patient">
                  <i className="fas fa-user-plus mr-2"></i>
                  New Patient
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Patient</DialogTitle>
                </DialogHeader>
                <PatientForm 
                  onSubmit={(data) => createPatientMutation.mutate(data)}
                  isLoading={createPatientMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6">
          {/* Search */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="relative">
                <Input
                  placeholder="Search patients by name, ID, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-patients"
                />
                <i className="fas fa-search absolute left-3 top-2.5 text-muted-foreground"></i>
              </div>
            </CardContent>
          </Card>

          {/* Patients Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-muted rounded-full"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded w-24"></div>
                          <div className="h-3 bg-muted rounded w-16"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-muted rounded"></div>
                        <div className="h-3 bg-muted rounded w-3/4"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : displayedPatients.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <i className="fas fa-users text-4xl text-muted-foreground mb-4"></i>
                <p className="text-lg font-medium text-foreground">No patients found</p>
                <p className="text-muted-foreground mb-6">
                  {searchQuery ? "Try adjusting your search criteria" : "Get started by adding your first patient"}
                </p>
                {!searchQuery && (
                  <Button 
                    onClick={() => setIsNewPatientOpen(true)}
                    data-testid="button-add-first-patient"
                  >
                    <i className="fas fa-user-plus mr-2"></i>
                    Add First Patient
                  </Button>
                )}
              </div>
            ) : (
              displayedPatients.map((patient: any) => (
                <Card 
                  key={patient.id} 
                  className="hover:shadow-md transition-shadow"
                  data-testid={`patient-card-${patient.id}`}
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-primary font-medium">
                            {patient.firstName?.charAt(0)}{patient.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {patient.firstName} {patient.lastName}
                          </h3>
                          <p className="text-sm text-muted-foreground">{patient.patientId}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <i className="fas fa-birthday-cake w-4"></i>
                          <span className="ml-2">
                            {patient.dateOfBirth && format(new Date(patient.dateOfBirth), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <i className="fas fa-phone w-4"></i>
                          <span className="ml-2">{patient.phone || "No phone"}</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <i className="fas fa-envelope w-4"></i>
                          <span className="ml-2">{patient.email || "No email"}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          patient.isActive 
                            ? 'bg-secondary/20 text-secondary' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {patient.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <div className="flex space-x-2">
                          <Link href={`/patients/${patient.id}`}>
                            <Button variant="outline" size="sm" data-testid={`button-view-profile-${patient.id}`}>
                              <i className="fas fa-user mr-1"></i>
                              Profile
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setSelectedPatient(patient)}
                            data-testid={`button-info-${patient.id}`}
                          >
                            <i className="fas fa-info-circle"></i>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => e.stopPropagation()}
                                data-testid={`button-delete-patient-${patient.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Patient</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {patient.firstName} {patient.lastName}? 
                                  This will permanently remove the patient and ALL associated data including:
                                  <br/><br/>
                                  • All wound assessments and images
                                  <br/>
                                  • All visits and treatment plans
                                  <br/>
                                  • All medical records and files
                                  <br/><br/>
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deletePatientMutation.mutate(patient.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  disabled={deletePatientMutation.isPending}
                                  data-testid={`confirm-delete-patient-${patient.id}`}
                                >
                                  {deletePatientMutation.isPending ? "Deleting..." : "Delete Patient"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Patient Details Modal */}
          {selectedPatient && (
            <Dialog open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    Patient Details - {selectedPatient.firstName} {selectedPatient.lastName}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* Basic Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Patient ID</label>
                          <p className="text-foreground">{selectedPatient.patientId}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                          <p className="text-foreground">
                            {selectedPatient.dateOfBirth && format(new Date(selectedPatient.dateOfBirth), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Gender</label>
                          <p className="text-foreground capitalize">{selectedPatient.gender}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Phone</label>
                          <p className="text-foreground">{selectedPatient.phone}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Medical Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Medical Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Allergies</label>
                          <p className="text-foreground">{selectedPatient.allergies || "None reported"}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Comorbidities</label>
                          <p className="text-foreground">{selectedPatient.comorbidities || "None reported"}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Current Medications</label>
                          <p className="text-foreground">{selectedPatient.medications || "None reported"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Insurance Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Insurance Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Provider</label>
                          <p className="text-foreground">{selectedPatient.insuranceProvider || "Not provided"}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Class</label>
                          <p className="text-foreground">{selectedPatient.insuranceClass || "Not provided"}</p>
                        </div>
                        <div className="col-span-2">
                          <label className="text-sm font-medium text-muted-foreground">Member ID</label>
                          <p className="text-foreground">{selectedPatient.insuranceMemberId || "Not provided"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </DialogContent>
            </Dialog>
          )}
      </main>
    </div>
  );
}
