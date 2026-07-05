import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import WoundImagingModal from "@/components/WoundImagingModal";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Trash2, ArrowLeft, Pencil, Check, X } from "lucide-react";

// AssessmentCard component for displaying wound assessments with images
function AssessmentCard({ assessment, getWoundStageColor, onViewDetails, onDelete, isExpanded }: { assessment: any; getWoundStageColor: (stage: number) => string; onViewDetails: () => void; onDelete: (assessmentId: string) => void; isExpanded: boolean }) {
  const { toast } = useToast();
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  
  const assessmentFiles: any[] = assessment.files || [];
  const woundImage = assessmentFiles.find((file: any) => file.fileType === 'image');

  // Parse section helper function
  const parseSection = (text: string, sectionName: string) => {
    const regex = new RegExp(`${sectionName}[:\\s]+([^]*?)(?=(?:WOUND ASSESSMENT|CLINICAL DIAGNOSIS|RECOMMENDED INTERVENTIONS|PATIENT CARE RECOMMENDATIONS|FOLLOW-UP RECOMMENDATIONS):|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  };

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ sectionName, newContent }: { sectionName: string; newContent: string }) => {
      const recommendations = assessment.aiAnalysis?.recommendations || [];
      const fullText = recommendations.join(' ');
      
      // Parse all sections
      const sections = {
        'WOUND ASSESSMENT': parseSection(fullText, 'WOUND ASSESSMENT'),
        'CLINICAL DIAGNOSIS': parseSection(fullText, 'CLINICAL DIAGNOSIS'),
        'RECOMMENDED INTERVENTIONS': parseSection(fullText, 'RECOMMENDED INTERVENTIONS'),
        'PATIENT CARE RECOMMENDATIONS': parseSection(fullText, 'PATIENT CARE RECOMMENDATIONS'),
        'FOLLOW-UP RECOMMENDATIONS': parseSection(fullText, 'FOLLOW-UP RECOMMENDATIONS'),
      };

      // Update the specific section
      sections[sectionName as keyof typeof sections] = newContent;

      // Rebuild the recommendations text
      const updatedText = Object.entries(sections)
        .filter(([_, content]) => content)
        .map(([name, content]) => `${name}: ${content}`)
        .join(' ');

      // Update aiAnalysis with new recommendations
      const updatedAiAnalysis = {
        ...assessment.aiAnalysis,
        recommendations: [updatedText]
      };

      await apiRequest('PATCH', '/api/wound-assessments/' + assessment.id, { aiAnalysis: updatedAiAnalysis });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wound-assessments"] });
      toast({
        title: "Success",
        description: "AI recommendation section updated successfully",
      });
      setEditingSection(null);
      setEditContent('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update recommendation section",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (sectionName: string, currentContent: string) => {
    setEditingSection(sectionName);
    setEditContent(currentContent);
  };

  const handleSave = (sectionName: string) => {
    updateMutation.mutate({ sectionName, newContent: editContent });
  };

  const handleCancel = () => {
    setEditingSection(null);
    setEditContent('');
  };

  return (
    <Card 
      id={`wound-assessment-${assessment.id}`}
      className="hover:shadow-md transition-shadow scroll-mt-20" 
      data-testid={`assessment-card-${assessment.id}`}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={`px-2 py-1 text-xs rounded-full ${getWoundStageColor(assessment.wound?.stage || 1)}`}>
              Stage {assessment.wound?.stage || 1}
            </span>
            <span className="text-xs text-muted-foreground">
              {assessment.assessmentDate && format(new Date(assessment.assessmentDate), 'MMM d, yyyy')}
            </span>
          </div>
          
          <div>
            <p className="font-medium text-foreground">
              {assessment.aiAnalysis?.woundType 
                ? assessment.aiAnalysis.woundType.replace(/_/g, ' ').charAt(0).toUpperCase() + assessment.aiAnalysis.woundType.replace(/_/g, ' ').slice(1)
                : assessment.wound?.location || 'Unknown type'
              }
            </p>
            <p className="text-sm text-muted-foreground">{assessment.wound?.woundId || assessment.wound?.id}</p>
          </div>

          {/* Wound Image */}
          {woundImage ? (
            <div className="aspect-square bg-muted rounded border overflow-hidden relative">
              <img 
                src={`/api/files/${woundImage.id}/image`}
                alt="Wound assessment" 
                className="w-full h-full object-cover"
                data-testid={`wound-image-${assessment.id}`}
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const placeholder = target.nextElementSibling as HTMLElement;
                  if (placeholder) placeholder.style.display = 'flex';
                }}
              />
              <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 items-center justify-center hidden absolute inset-0 flex-col gap-1">
                <i className="fas fa-image text-2xl text-muted-foreground"></i>
                <span className="text-xs text-muted-foreground">Image unavailable</span>
              </div>
            </div>
          ) : (
            <div className="aspect-square bg-muted rounded border overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                <i className="fas fa-image text-2xl text-muted-foreground"></i>
              </div>
            </div>
          )}

          {/* Assessment Measurements */}
          <div className="space-y-1 text-sm">
            {assessment.area != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Area:</span>
                <span className="font-medium text-foreground">{Number(assessment.area).toFixed(1)} cm²</span>
              </div>
            )}
            {assessment.length != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Length:</span>
                <span className="font-medium text-foreground">{Number(assessment.length).toFixed(1)} cm</span>
              </div>
            )}
            {assessment.perimeter != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Perimeter:</span>
                <span className="font-medium text-foreground">{Number(assessment.perimeter).toFixed(1)} cm</span>
              </div>
            )}
          </div>

          {/* AI Analysis Summary - expanded or condensed */}
          {assessment.aiAnalysis && (
            <div className="text-xs text-muted-foreground">
              <p>AI Analysis: Stage {assessment.aiAnalysis.healingStage}</p>
              {!isExpanded && assessment.aiAnalysis.recommendations && assessment.aiAnalysis.recommendations.length > 0 && (
                <p className="truncate">Rec: {assessment.aiAnalysis.recommendations[0]}</p>
              )}
            </div>
          )}

          {/* Expanded Details */}
          {isExpanded && assessment.aiAnalysis && (() => {
            const recommendations = assessment.aiAnalysis.recommendations || [];
            const fullText = recommendations.join(' ');
            
            const woundAssessment = parseSection(fullText, 'WOUND ASSESSMENT');
            const clinicalDiagnosis = parseSection(fullText, 'CLINICAL DIAGNOSIS');
            const recommendedInterventions = parseSection(fullText, 'RECOMMENDED INTERVENTIONS');
            const patientCare = parseSection(fullText, 'PATIENT CARE RECOMMENDATIONS');
            const followUp = parseSection(fullText, 'FOLLOW-UP RECOMMENDATIONS');

            const hasSections = woundAssessment || clinicalDiagnosis || recommendedInterventions || patientCare || followUp;

            return (
              <div className="space-y-3 text-sm border-t pt-3">
                {hasSections ? (
                  <>
                    {/* Wound Assessment */}
                    {woundAssessment && (
                      <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 flex items-center">
                            <i className="fas fa-clipboard-list mr-2"></i>
                            Wound Assessment
                          </h4>
                          {editingSection !== 'WOUND ASSESSMENT' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleEdit('WOUND ASSESSMENT', woundAssessment)}
                              data-testid="button-edit-wound-assessment"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        {editingSection === 'WOUND ASSESSMENT' ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="min-h-[100px] text-sm"
                              data-testid="textarea-wound-assessment"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSave('WOUND ASSESSMENT')}
                                disabled={updateMutation.isPending}
                                data-testid="button-save-wound-assessment"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancel}
                                data-testid="button-cancel-wound-assessment"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                            {woundAssessment}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Clinical Diagnosis */}
                    {clinicalDiagnosis && (
                      <div className="bg-purple-50 dark:bg-purple-900/30 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 flex items-center">
                            <i className="fas fa-stethoscope mr-2"></i>
                            Clinical Diagnosis
                          </h4>
                          {editingSection !== 'CLINICAL DIAGNOSIS' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleEdit('CLINICAL DIAGNOSIS', clinicalDiagnosis)}
                              data-testid="button-edit-clinical-diagnosis"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        {editingSection === 'CLINICAL DIAGNOSIS' ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="min-h-[60px] text-sm"
                              data-testid="textarea-clinical-diagnosis"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSave('CLINICAL DIAGNOSIS')}
                                disabled={updateMutation.isPending}
                                data-testid="button-save-clinical-diagnosis"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancel}
                                data-testid="button-cancel-clinical-diagnosis"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-purple-800 dark:text-purple-200 leading-relaxed">
                            {clinicalDiagnosis}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Recommended Interventions */}
                    {recommendedInterventions && (
                      <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 flex items-center">
                            <i className="fas fa-procedures mr-2"></i>
                            Recommended Interventions
                          </h4>
                          {editingSection !== 'RECOMMENDED INTERVENTIONS' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleEdit('RECOMMENDED INTERVENTIONS', recommendedInterventions)}
                              data-testid="button-edit-recommended-interventions"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        {editingSection === 'RECOMMENDED INTERVENTIONS' ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="min-h-[100px] text-sm"
                              data-testid="textarea-recommended-interventions"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSave('RECOMMENDED INTERVENTIONS')}
                                disabled={updateMutation.isPending}
                                data-testid="button-save-recommended-interventions"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancel}
                                data-testid="button-cancel-recommended-interventions"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-green-800 dark:text-green-200 leading-relaxed">
                            {recommendedInterventions}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Patient Care Recommendations */}
                    {patientCare && (
                      <div className="bg-orange-50 dark:bg-orange-900/30 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100 flex items-center">
                            <i className="fas fa-user-nurse mr-2"></i>
                            Patient Care Recommendations
                          </h4>
                          {editingSection !== 'PATIENT CARE RECOMMENDATIONS' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleEdit('PATIENT CARE RECOMMENDATIONS', patientCare)}
                              data-testid="button-edit-patient-care"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        {editingSection === 'PATIENT CARE RECOMMENDATIONS' ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="min-h-[80px] text-sm"
                              data-testid="textarea-patient-care"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSave('PATIENT CARE RECOMMENDATIONS')}
                                disabled={updateMutation.isPending}
                                data-testid="button-save-patient-care"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancel}
                                data-testid="button-cancel-patient-care"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-orange-800 dark:text-orange-200 leading-relaxed">
                            {patientCare}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Follow-up Recommendations */}
                    {followUp && (
                      <div className="bg-teal-50 dark:bg-teal-900/30 p-3 rounded-lg border border-teal-200 dark:border-teal-800">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-teal-900 dark:text-teal-100 flex items-center">
                            <i className="fas fa-calendar-check mr-2"></i>
                            Follow-up Recommendations
                          </h4>
                          {editingSection !== 'FOLLOW-UP RECOMMENDATIONS' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleEdit('FOLLOW-UP RECOMMENDATIONS', followUp)}
                              data-testid="button-edit-follow-up"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        {editingSection === 'FOLLOW-UP RECOMMENDATIONS' ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="min-h-[80px] text-sm"
                              data-testid="textarea-follow-up"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSave('FOLLOW-UP RECOMMENDATIONS')}
                                disabled={updateMutation.isPending}
                                data-testid="button-save-follow-up"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancel}
                                data-testid="button-cancel-follow-up"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-teal-800 dark:text-teal-200 leading-relaxed">
                            {followUp}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  // Fallback if no structured sections are found
                  <div>
                    <h4 className="font-medium text-sm mb-2">AI Recommendations</h4>
                    {assessment.aiAnalysis.recommendations && assessment.aiAnalysis.recommendations.length > 0 && (
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        {assessment.aiAnalysis.recommendations.map((rec: string, index: number) => (
                          <li key={index} className="text-muted-foreground">{rec}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1" 
              data-testid={`button-view-details-${assessment.id}`}
              onClick={onViewDetails}
            >
              <i className={`fas ${isExpanded ? 'fa-eye-slash' : 'fa-eye'} mr-2`}></i>
              {isExpanded ? 'Hide Details' : 'View Details'}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="px-3" 
                  data-testid={`button-delete-assessment-${assessment.id}`}
                  title="Delete Assessment"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Wound Assessment</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this wound assessment? This action cannot be undone and will permanently remove the assessment data and associated images.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onDelete(assessment.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Assessment
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WoundImaging() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedWound, setSelectedWound] = useState<any>(null);
  const [isImagingModalOpen, setIsImagingModalOpen] = useState(false);
  const [expandedAssessmentId, setExpandedAssessmentId] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: patients = [] } = useQuery({
    queryKey: ["/api/patients"],
  });

  // Get patient-specific wound assessments with history
  const { data: patientAssessments = [], isLoading } = useQuery({
    queryKey: ["/api/patients", selectedPatient?.id, "wound-assessments"],
    enabled: !!selectedPatient?.id,
    queryFn: () => fetch(`/api/patients/${selectedPatient.id}/wound-assessments`).then(res => res.json()),
  });

  const { data: wounds = [] } = useQuery({
    queryKey: ["/api/wounds/patient", selectedPatient?.id],
    enabled: !!selectedPatient?.id,
    queryFn: () => fetch(`/api/wounds/patient/${selectedPatient.id}`).then(res => res.json()),
  });

  const createAssessmentMutation = useMutation({
    mutationFn: async (assessmentData: any) => {
      console.log("💾 Saving wound assessment:", assessmentData);
      const response = await fetch("/api/wound-assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assessmentData),
        credentials: "include",
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error("❌ Failed to save assessment:", data);
        throw new Error(data.message || data.error || "Failed to save wound assessment");
      }
      
      console.log("✅ Assessment saved successfully:", data);
      return data;
    },
    onSuccess: () => {
      // Invalidate all wound assessment related queries
      queryClient.invalidateQueries({ queryKey: ["/api/wound-assessments"] });
      
      // Specifically invalidate the patient's wound assessments query
      if (selectedPatient?.id) {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/patients", selectedPatient.id, "wound-assessments"] 
        });
      }
      
      // Also invalidate the general patient assessments queries used elsewhere
      queryClient.invalidateQueries({ 
        queryKey: ["/api/patients"] 
      });
      
      toast({
        title: "Success",
        description: "Wound assessment saved successfully",
      });
    },
    onError: (error: Error) => {
      console.error("❌ Mutation error:", error);
      toast({
        title: "Error", 
        description: error.message || "Failed to save wound assessment",
        variant: "destructive",
      });
    },
  });

  const deleteAssessmentMutation = useMutation({
    mutationFn: (assessmentId: string) =>
      fetch(`/api/wound-assessments/${assessmentId}`, {
        method: "DELETE",
        credentials: "include",
      }),
    onSuccess: () => {
      // Invalidate all wound assessment related queries
      queryClient.invalidateQueries({ queryKey: ["/api/wound-assessments"] });
      
      // Specifically invalidate the patient's wound assessments query
      if (selectedPatient?.id) {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/patients", selectedPatient.id, "wound-assessments"] 
        });
      }
      
      // Also invalidate the general patient assessments queries used elsewhere
      queryClient.invalidateQueries({ 
        queryKey: ["/api/patients"] 
      });
      
      toast({
        title: "Success",
        description: "Wound assessment deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to delete wound assessment",
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

  const handleCaptureWound = (patient: any) => {
    setSelectedPatient(patient);
    if (wounds.length === 1) {
      setSelectedWound(wounds[0]);
    }
    setIsImagingModalOpen(true);
  };

  const getWoundStageColor = (stage: number) => {
    switch (stage) {
      case 1: return 'wound-stage-1';
      case 2: return 'wound-stage-2';
      case 3: return 'wound-stage-3';
      case 4: return 'wound-stage-4';
      default: return 'bg-muted text-muted-foreground';
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
                <h2 className="text-2xl font-semibold text-foreground">Wound Imaging</h2>
                <p className="text-sm text-muted-foreground">
                  AI-powered wound capture and analysis
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setIsImagingModalOpen(true)}
              disabled={!selectedPatient}
              data-testid="button-new-imaging"
            >
              <i className="fas fa-camera mr-2"></i>
              Capture Wound Image
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="flex flex-col md:flex-row h-full">
            {/* Patient Selection Section - Full width on mobile, sidebar on desktop */}
            <div className="w-full md:w-96 border-b md:border-r md:border-b-0 border-border p-6">
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

                {/* Mobile: Horizontal scrolling cards, Desktop: Vertical list */}
                <div className="md:space-y-3">
                  {/* Mobile: Horizontal scroll */}
                  <div className="flex md:hidden gap-3 overflow-x-auto pb-4">
                    {filteredPatients.map((patient: any) => (
                      <Card 
                        key={patient.id}
                        className={`cursor-pointer transition-colors flex-shrink-0 w-64 ${
                          selectedPatient?.id === patient.id 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:bg-accent'
                        }`}
                        onClick={() => setSelectedPatient(patient)}
                        data-testid={`patient-card-${patient.id}`}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-primary font-medium text-xs">
                                {patient.firstName?.charAt(0)}{patient.lastName?.charAt(0)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground text-sm truncate">
                                {patient.firstName} {patient.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">{patient.patientId}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Desktop: Vertical list */}
                  <div className="hidden md:block space-y-3">
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
                              {patient.dateOfBirth && (
                                <p className="text-xs text-muted-foreground">
                                  DOB: {format(new Date(patient.dateOfBirth), 'MMM d, yyyy')}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {selectedPatient && wounds.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold text-foreground mb-3">Patient Wounds</h4>
                    <div className="space-y-2">
                      {wounds.map((wound: any) => (
                        <Card 
                          key={wound.id}
                          className={`cursor-pointer transition-colors ${
                            selectedWound?.id === wound.id 
                              ? 'border-secondary bg-secondary/5' 
                              : 'hover:bg-accent'
                          }`}
                          onClick={() => {
                            // Update selected wound state for UI highlighting
                            setSelectedWound(wound);
                            
                            // Find the most recent assessment for this wound (sort by date first to ensure newest)
                            const sortedAssessments = (patientAssessments || [])
                              .sort((a: any, b: any) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime());
                            
                            const targetAssessment = sortedAssessments.find(
                              (assessment: any) => assessment.wound?.woundId === wound.woundId
                            );
                            
                            if (targetAssessment) {
                              const targetElement = document.getElementById(`wound-assessment-${targetAssessment.id}`);
                              if (targetElement) {
                                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                // Add highlight effect
                                targetElement.style.boxShadow = '0 0 0 2px hsl(var(--primary))';
                                setTimeout(() => {
                                  targetElement.style.boxShadow = '';
                                }, 2000);
                              }
                            }
                          }}
                          data-testid={`wound-card-${wound.id}`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-foreground">{wound.location}</p>
                                <p className="text-sm text-muted-foreground">{wound.woundId}</p>
                              </div>
                              <Badge className={getWoundStageColor(wound.stage)}>
                                Stage {wound.stage}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Content Area - Imaging History */}
            <div className="flex-1 p-4 md:p-6">
              {selectedPatient ? (
                <div className="space-y-6">
                  {/* Patient Header - Responsive layout */}
                  <Card>
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center space-x-3 md:space-x-4">
                          <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-primary font-semibold text-lg md:text-xl">
                              {selectedPatient.firstName?.charAt(0)}{selectedPatient.lastName?.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg md:text-xl font-semibold text-foreground">
                              {selectedPatient.firstName} {selectedPatient.lastName}
                            </h3>
                            <p className="text-sm md:text-base text-muted-foreground">
                              Patient ID: {selectedPatient.patientId}
                            </p>
                            {selectedPatient.dateOfBirth && (
                              <p className="text-xs md:text-sm text-muted-foreground">
                                DOB: {format(new Date(selectedPatient.dateOfBirth), 'MMM d, yyyy')} • 
                                Age: {new Date().getFullYear() - new Date(selectedPatient.dateOfBirth).getFullYear()}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleCaptureWound(selectedPatient)}
                          data-testid="button-capture-wound"
                          className="w-full md:w-auto"
                        >
                          <i className="fas fa-camera mr-2"></i>
                          Capture Wound Image
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Wound Healing History */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Wound Healing History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!patientAssessments || !Array.isArray(patientAssessments) || patientAssessments.length === 0 ? (
                        <div className="text-center py-8">
                          <i className="fas fa-camera-retro text-3xl text-muted-foreground mb-4"></i>
                          <p className="text-foreground mb-2">No wound assessments recorded</p>
                          <p className="text-muted-foreground mb-6">
                            Start by capturing a wound image with AI analysis
                          </p>
                          <Button onClick={() => handleCaptureWound(selectedPatient)} data-testid="button-capture-first">
                            <i className="fas fa-camera mr-2"></i>
                            Capture First Image
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Recent Assessments Grid - Optimized for mobile */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(patientAssessments || [])
                              .sort((a: any, b: any) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime())
                              .slice(0, 6)
                              .map((assessment: any) => (
                                <AssessmentCard
                                  key={assessment.id}
                                  assessment={assessment}
                                  getWoundStageColor={getWoundStageColor}
                                  isExpanded={expandedAssessmentId === assessment.id}
                                  onViewDetails={() => {
                                    if (expandedAssessmentId === assessment.id) {
                                      setExpandedAssessmentId(null); // Hide details
                                    } else {
                                      setExpandedAssessmentId(assessment.id); // Show details
                                    }
                                  }}
                                  onDelete={(assessmentId) => deleteAssessmentMutation.mutate(assessmentId)}
                                />
                              ))}
                          </div>
                          
                          {patientAssessments && Array.isArray(patientAssessments) && patientAssessments.length > 6 && (
                            <div className="text-center">
                              <Button variant="outline" data-testid="button-view-all-history">
                                <i className="fas fa-history mr-2"></i>
                                View All History ({patientAssessments.length} assessments)
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <i className="fas fa-camera-retro text-6xl text-muted-foreground mb-6"></i>
                    <h3 className="text-xl font-semibold text-foreground mb-2">AI Wound Imaging</h3>
                    <p className="text-muted-foreground mb-6">
                      Select a patient from the sidebar to start wound imaging and analysis
                    </p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>• AI-powered measurement and analysis</p>
                      <p>• Automatic tissue composition detection</p>
                      <p>• Healing progress tracking</p>
                      <p>• Treatment recommendations</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

      {/* Wound Imaging Modal */}
      <WoundImagingModal
        isOpen={isImagingModalOpen}
        onClose={() => {
          setIsImagingModalOpen(false);
          setSelectedWound(null);
        }}
        patient={selectedPatient}
        woundId={selectedWound?.id}
        onSave={(assessmentData) => createAssessmentMutation.mutate(assessmentData)}
      />
    </div>
  );
}
