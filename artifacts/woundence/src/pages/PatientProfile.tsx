import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import WoundImagingModal from "@/components/WoundImagingModal";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

// WoundAssessmentCard component for displaying individual assessments
function WoundAssessmentCard({ assessment, cardRef }: { assessment: any; cardRef?: ((el: HTMLDivElement | null) => void) | React.RefObject<HTMLDivElement> }) {
  const { toast } = useToast();
  const [showDetails, setShowDetails] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<{[key: string]: string}>({});
  
  const assessmentFiles: any[] = assessment.files || [];
  const woundImage = assessmentFiles.find((file: any) => file.fileType === 'image');

  const deleteAssessmentMutation = useMutation({
    mutationFn: () => 
      fetch(`/api/wound-assessments/${assessment.id}`, {
        method: 'DELETE',
        credentials: 'include',
      }).then(res => {
        if (!res.ok) {
          throw new Error('Failed to delete assessment');
        }
        return res.json();
      }),
    onSuccess: () => {
      // Invalidate wound assessment queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/wound-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      
      toast({
        title: "Success", 
        description: "Wound assessment deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete assessment: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: async (updatedRecommendations: string) => {
      const updatedAiAnalysis = {
        ...assessment.aiAnalysis,
        recommendations: [updatedRecommendations]
      };
      
      await apiRequest('PATCH', `/api/wound-assessments/${assessment.id}`, { aiAnalysis: updatedAiAnalysis });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wound-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setEditingSection(null);
      setEditedContent({});
      toast({
        title: "Success",
        description: "Assessment section updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleEditSection = (sectionKey: string, currentContent: string) => {
    setEditingSection(sectionKey);
    setEditedContent({ ...editedContent, [sectionKey]: currentContent });
  };

  const handleSaveSection = (sectionKey: string, sectionName: string, allSections: {[key: string]: string | null}) => {
    const newContent = editedContent[sectionKey];
    if (!newContent) return;

    // Rebuild the full recommendations text with updated section
    const sections = [];
    if (allSections.woundAssessment) {
      sections.push(`WOUND ASSESSMENT: ${sectionKey === 'woundAssessment' ? newContent : allSections.woundAssessment}`);
    }
    if (allSections.clinicalDiagnosis) {
      sections.push(`CLINICAL DIAGNOSIS: ${sectionKey === 'clinicalDiagnosis' ? newContent : allSections.clinicalDiagnosis}`);
    }
    if (allSections.recommendedInterventions) {
      sections.push(`RECOMMENDED INTERVENTIONS: ${sectionKey === 'recommendedInterventions' ? newContent : allSections.recommendedInterventions}`);
    }
    if (allSections.patientCare) {
      sections.push(`PATIENT CARE RECOMMENDATIONS: ${sectionKey === 'patientCare' ? newContent : allSections.patientCare}`);
    }
    if (allSections.followUp) {
      sections.push(`FOLLOW-UP RECOMMENDATIONS: ${sectionKey === 'followUp' ? newContent : allSections.followUp}`);
    }

    updateSectionMutation.mutate(sections.join(' '));
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setEditedContent({});
  };

  const getStageColor = (stage: number) => {
    switch (stage) {
      case 1: return "bg-green-100 text-green-800";
      case 2: return "bg-yellow-100 text-yellow-800";
      case 3: return "bg-orange-100 text-orange-800";
      case 4: return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Get tissue composition for simplified display
  const getTissueComposition = () => {
    if (assessment.aiAnalysis?.tissueComposition) {
      const tissue = assessment.aiAnalysis.tissueComposition;
      const parts = [];
      if (tissue.granulation > 0) parts.push(`${tissue.granulation}% granulation`);
      if (tissue.slough > 0) parts.push(`${tissue.slough}% slough`);
      if (tissue.necrotic > 0) parts.push(`${tissue.necrotic}% necrotic`);
      return parts.join(', ') || 'Not analyzed';
    }
    return assessment.tissueType || 'Not available';
  };

  const getSize = () => {
    if (assessment.area != null) {
      return `${Number(assessment.area).toFixed(1)} cm²`;
    }
    if (assessment.length != null && assessment.width != null) {
      return `${Number(assessment.length).toFixed(1)} × ${Number(assessment.width).toFixed(1)} cm`;
    }
    return 'Not measured';
  };

  return (
    <>
      <Card ref={cardRef} className="mb-4 overflow-hidden scroll-mt-24" data-testid={`wound-assessment-${assessment.id}`}>
        <CardContent className="p-4">
          <div className="flex gap-3 sm:gap-4">
            {/* Wound Image */}
            {woundImage && (
              <div className="flex-shrink-0">
                <img
                  src={`/api/files/${woundImage.id}/image`}
                  alt="Wound assessment"
                  className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setShowDetails(true)}
                  data-testid={`wound-image-${assessment.id}`}
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const placeholder = target.nextElementSibling as HTMLElement;
                    if (placeholder) placeholder.style.display = 'flex';
                  }}
                />
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg border bg-muted items-center justify-center hidden flex-col gap-1">
                  <i className="fas fa-image text-2xl text-muted-foreground"></i>
                  <span className="text-xs text-muted-foreground">No image</span>
                </div>
              </div>
            )}
            
            {/* Content */}
            <div className="flex-1 flex flex-col space-y-3 min-w-0 overflow-hidden">
              {/* Header row with wound name and stage */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-2 min-w-0 flex-1 overflow-hidden">
                  <Badge className={getStageColor(assessment.wound?.stage || 1)} style={{ flexShrink: 0 }}>
                    Stage {assessment.wound?.stage || 1}
                  </Badge>
                  <span className="text-sm font-medium truncate min-w-0">
                    {(() => {
                      const woundType = assessment.aiAnalysis?.woundType 
                        ? assessment.aiAnalysis.woundType.replace(/_/g, ' ').charAt(0).toUpperCase() + assessment.aiAnalysis.woundType.replace(/_/g, ' ').slice(1)
                        : null;
                      const bodyLoc = assessment.aiAnalysis?.bodyLocation 
                        || (assessment.wound?.location && assessment.wound.location.toLowerCase() !== 'unknown location' ? assessment.wound.location : null);
                      
                      if (woundType && bodyLoc) {
                        return `${woundType} on ${bodyLoc}`;
                      } else if (bodyLoc) {
                        return `Wound on ${bodyLoc}`;
                      } else if (woundType) {
                        return woundType;
                      } else {
                        return 'Body location not specified';
                      }
                    })()}
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDetails(true)}
                  data-testid={`view-details-${assessment.id}`}
                  className="flex-shrink-0"
                >
                  <span className="hidden sm:inline">View Details</span>
                  <span className="sm:hidden">Details</span>
                </Button>
              </div>
              
              {/* Essential information row */}
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="min-w-0">
                  <span className="text-muted-foreground">Size:</span>
                  <span className="ml-2 font-medium break-words">{getSize()}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground">Tissue:</span>
                  <span className="ml-2 font-medium break-words overflow-hidden max-h-12 leading-6">{getTissueComposition()}</span>
                </div>
              </div>
              
              {/* Date */}
              <div className="text-xs text-muted-foreground">
                {assessment.assessmentDate && !isNaN(new Date(assessment.assessmentDate).getTime()) 
                  ? format(new Date(assessment.assessmentDate), 'MMM dd, yyyy - HH:mm')
                  : 'Invalid date'
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Detailed View Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                Wound Assessment Details - {(() => {
                  const woundType = assessment.aiAnalysis?.woundType 
                    ? assessment.aiAnalysis.woundType.replace(/_/g, ' ').charAt(0).toUpperCase() + assessment.aiAnalysis.woundType.replace(/_/g, ' ').slice(1)
                    : null;
                  const bodyLoc = assessment.aiAnalysis?.bodyLocation 
                    || (assessment.wound?.location && assessment.wound.location.toLowerCase() !== 'unknown location' ? assessment.wound.location : null);
                  
                  if (woundType && bodyLoc) {
                    return `${woundType} on ${bodyLoc}`;
                  } else if (bodyLoc) {
                    return `Wound on ${bodyLoc}`;
                  } else if (woundType) {
                    return woundType;
                  } else {
                    return 'Body location not specified';
                  }
                })()}
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    data-testid={`delete-assessment-${assessment.id}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Assessment
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Wound Assessment</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this wound assessment? This action cannot be undone and will permanently remove the assessment data and associated files.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => {
                        deleteAssessmentMutation.mutate();
                        setShowDetails(false);
                      }}
                      className="bg-red-600 hover:bg-red-700"
                      data-testid={`confirm-delete-${assessment.id}`}
                    >
                      {deleteAssessmentMutation.isPending ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Wound Image */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Wound Image</h4>
              {woundImage ? (
                <div className="aspect-square bg-muted rounded-lg border overflow-hidden relative">
                  <img 
                    src={`/api/files/${woundImage.id}/image`}
                    alt="Wound assessment" 
                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => {
                      window.open(`/api/files/${woundImage.id}/image`, '_blank');
                    }}
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const placeholder = target.nextElementSibling as HTMLElement;
                      if (placeholder) placeholder.style.display = 'flex';
                    }}
                  />
                  <div className="w-full h-full bg-muted items-center justify-center hidden absolute inset-0 flex-col gap-2">
                    <i className="fas fa-image text-3xl text-muted-foreground"></i>
                    <span className="text-sm text-muted-foreground">Image unavailable</span>
                  </div>
                </div>
              ) : (
                <div className="aspect-square bg-muted rounded-lg border flex items-center justify-center">
                  <div className="text-center">
                    <i className="fas fa-image text-2xl text-muted-foreground mb-2"></i>
                    <p className="text-sm text-muted-foreground">No image available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Measurements */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Measurements</h4>
              <div className="space-y-3">
                {assessment.area != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Area:</span>
                    <span className="font-medium">{Number(assessment.area).toFixed(1)} cm²</span>
                  </div>
                )}
                {assessment.length != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Length:</span>
                    <span className="font-medium">{Number(assessment.length).toFixed(1)} cm</span>
                  </div>
                )}
                {assessment.width != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Width:</span>
                    <span className="font-medium">{Number(assessment.width).toFixed(1)} cm</span>
                  </div>
                )}
                {assessment.depth != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Depth:</span>
                    <span className="font-medium">{Number(assessment.depth).toFixed(1)} cm</span>
                  </div>
                )}
                {assessment.perimeter != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Perimeter:</span>
                    <span className="font-medium">{Number(assessment.perimeter).toFixed(1)} cm</span>
                  </div>
                )}
              </div>
            </div>

            {/* AI Analysis */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">AI Analysis</h4>
              {assessment.aiAnalysis ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Healing Stage:</span>
                    <span className="ml-2 font-medium">Stage {assessment.aiAnalysis.healingStage}</span>
                  </div>
                  
                  {assessment.aiAnalysis.bodyLocation && (
                    <div>
                      <span className="text-muted-foreground">Body Location:</span>
                      <span className="ml-2 font-medium capitalize">{assessment.aiAnalysis.bodyLocation}</span>
                    </div>
                  )}
                  
                  {assessment.aiAnalysis.tissueComposition && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Tissue Composition:</span>
                      <div className="text-xs space-y-1">
                        {assessment.aiAnalysis.tissueComposition.granulation > 0 && (
                          <div className="flex justify-between">
                            <span>Granulation:</span>
                            <span>{assessment.aiAnalysis.tissueComposition.granulation}%</span>
                          </div>
                        )}
                        {assessment.aiAnalysis.tissueComposition.slough > 0 && (
                          <div className="flex justify-between">
                            <span>Slough:</span>
                            <span>{assessment.aiAnalysis.tissueComposition.slough}%</span>
                          </div>
                        )}
                        {assessment.aiAnalysis.tissueComposition.necrotic > 0 && (
                          <div className="flex justify-between">
                            <span>Necrotic:</span>
                            <span>{assessment.aiAnalysis.tissueComposition.necrotic}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {assessment.aiAnalysis.recommendations && assessment.aiAnalysis.recommendations.length > 0 && (
                    <div className="space-y-2">
                      {(() => {
                        const fullText = assessment.aiAnalysis.recommendations.join(' ');
                        
                        // Parse sections from the AI response
                        const parseSection = (text: string, sectionName: string) => {
                          const regex = new RegExp(`${sectionName}[:\\s]+([^]*?)(?=(?:WOUND ASSESSMENT|CLINICAL DIAGNOSIS|RECOMMENDED INTERVENTIONS|PATIENT CARE RECOMMENDATIONS|FOLLOW-UP RECOMMENDATIONS):|$)`, 'i');
                          const match = text.match(regex);
                          return match ? match[1].trim() : null;
                        };

                        const woundAssessment = parseSection(fullText, 'WOUND ASSESSMENT');
                        const clinicalDiagnosis = parseSection(fullText, 'CLINICAL DIAGNOSIS');
                        const recommendedInterventions = parseSection(fullText, 'RECOMMENDED INTERVENTIONS');
                        const patientCare = parseSection(fullText, 'PATIENT CARE RECOMMENDATIONS');
                        const followUp = parseSection(fullText, 'FOLLOW-UP RECOMMENDATIONS');

                        const hasSections = woundAssessment || clinicalDiagnosis || recommendedInterventions || patientCare || followUp;

                        return hasSections ? (
                          <div className="space-y-3">
                            {woundAssessment && (
                              <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                                <h5 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1 flex items-center justify-between">
                                  <span className="flex items-center">
                                    <i className="fas fa-clipboard-list mr-1 text-xs"></i>
                                    Wound Assessment
                                  </span>
                                  {editingSection === 'woundAssessment' ? (
                                    <div className="flex gap-1">
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-6 px-2 text-xs"
                                        onClick={() => handleSaveSection('woundAssessment', 'WOUND ASSESSMENT', { woundAssessment, clinicalDiagnosis, recommendedInterventions, patientCare, followUp })}
                                        disabled={updateSectionMutation.isPending}
                                        data-testid="button-save-wound-assessment"
                                      >
                                        <Check className="h-3 w-3 mr-1" />
                                        Save
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-6 px-2 text-xs"
                                        onClick={handleCancelEdit}
                                        data-testid="button-cancel-wound-assessment"
                                      >
                                        <X className="h-3 w-3 mr-1" />
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-6 px-2 text-xs"
                                      onClick={() => handleEditSection('woundAssessment', woundAssessment)}
                                      data-testid="button-edit-wound-assessment"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  )}
                                </h5>
                                {editingSection === 'woundAssessment' ? (
                                  <textarea
                                    className="w-full text-xs text-blue-800 dark:text-blue-200 leading-relaxed bg-white dark:bg-blue-950 p-2 rounded border border-blue-300 dark:border-blue-700 min-h-[100px]"
                                    value={editedContent.woundAssessment || woundAssessment}
                                    onChange={(e) => setEditedContent({ ...editedContent, woundAssessment: e.target.value })}
                                  />
                                ) : (
                                  <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                                    {woundAssessment}
                                  </p>
                                )}
                              </div>
                            )}
                            {clinicalDiagnosis && (
                              <div className="bg-purple-50 dark:bg-purple-900/30 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                                <h5 className="text-xs font-semibold text-purple-900 dark:text-purple-100 mb-1 flex items-center justify-between">
                                  <span className="flex items-center">
                                    <i className="fas fa-stethoscope mr-1 text-xs"></i>
                                    Clinical Diagnosis
                                  </span>
                                  {editingSection === 'clinicalDiagnosis' ? (
                                    <div className="flex gap-1">
                                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => handleSaveSection('clinicalDiagnosis', 'CLINICAL DIAGNOSIS', { woundAssessment, clinicalDiagnosis, recommendedInterventions, patientCare, followUp })} disabled={updateSectionMutation.isPending} data-testid="button-save-clinical-diagnosis"><Check className="h-3 w-3 mr-1" />Save</Button>
                                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={handleCancelEdit} data-testid="button-cancel-clinical-diagnosis"><X className="h-3 w-3 mr-1" />Cancel</Button>
                                    </div>
                                  ) : (
                                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => handleEditSection('clinicalDiagnosis', clinicalDiagnosis)} data-testid="button-edit-clinical-diagnosis"><Pencil className="h-3 w-3" /></Button>
                                  )}
                                </h5>
                                {editingSection === 'clinicalDiagnosis' ? (
                                  <textarea className="w-full text-xs text-purple-800 dark:text-purple-200 leading-relaxed bg-white dark:bg-purple-950 p-2 rounded border border-purple-300 dark:border-purple-700 min-h-[100px]" value={editedContent.clinicalDiagnosis || clinicalDiagnosis} onChange={(e) => setEditedContent({ ...editedContent, clinicalDiagnosis: e.target.value })} />
                                ) : (
                                  <p className="text-xs text-purple-800 dark:text-purple-200 leading-relaxed">{clinicalDiagnosis}</p>
                                )}
                              </div>
                            )}
                            {recommendedInterventions && (
                              <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                                <h5 className="text-xs font-semibold text-green-900 dark:text-green-100 mb-1 flex items-center justify-between">
                                  <span className="flex items-center">
                                    <i className="fas fa-procedures mr-1 text-xs"></i>
                                    Recommended Interventions
                                  </span>
                                  {editingSection === 'recommendedInterventions' ? (
                                    <div className="flex gap-1">
                                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => handleSaveSection('recommendedInterventions', 'RECOMMENDED INTERVENTIONS', { woundAssessment, clinicalDiagnosis, recommendedInterventions, patientCare, followUp })} disabled={updateSectionMutation.isPending} data-testid="button-save-recommended-interventions"><Check className="h-3 w-3 mr-1" />Save</Button>
                                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={handleCancelEdit} data-testid="button-cancel-recommended-interventions"><X className="h-3 w-3 mr-1" />Cancel</Button>
                                    </div>
                                  ) : (
                                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => handleEditSection('recommendedInterventions', recommendedInterventions)} data-testid="button-edit-recommended-interventions"><Pencil className="h-3 w-3" /></Button>
                                  )}
                                </h5>
                                {editingSection === 'recommendedInterventions' ? (
                                  <textarea className="w-full text-xs text-green-800 dark:text-green-200 leading-relaxed bg-white dark:bg-green-950 p-2 rounded border border-green-300 dark:border-green-700 min-h-[100px]" value={editedContent.recommendedInterventions || recommendedInterventions} onChange={(e) => setEditedContent({ ...editedContent, recommendedInterventions: e.target.value })} />
                                ) : (
                                  <p className="text-xs text-green-800 dark:text-green-200 leading-relaxed">{recommendedInterventions}</p>
                                )}
                              </div>
                            )}
                            {patientCare && (
                              <div className="bg-orange-50 dark:bg-orange-900/30 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                                <h5 className="text-xs font-semibold text-orange-900 dark:text-orange-100 mb-1 flex items-center justify-between">
                                  <span className="flex items-center">
                                    <i className="fas fa-user-nurse mr-1 text-xs"></i>
                                    Patient Care Recommendations
                                  </span>
                                  {editingSection === 'patientCare' ? (
                                    <div className="flex gap-1">
                                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => handleSaveSection('patientCare', 'PATIENT CARE RECOMMENDATIONS', { woundAssessment, clinicalDiagnosis, recommendedInterventions, patientCare, followUp })} disabled={updateSectionMutation.isPending} data-testid="button-save-patient-care"><Check className="h-3 w-3 mr-1" />Save</Button>
                                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={handleCancelEdit} data-testid="button-cancel-patient-care"><X className="h-3 w-3 mr-1" />Cancel</Button>
                                    </div>
                                  ) : (
                                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => handleEditSection('patientCare', patientCare)} data-testid="button-edit-patient-care"><Pencil className="h-3 w-3" /></Button>
                                  )}
                                </h5>
                                {editingSection === 'patientCare' ? (
                                  <textarea className="w-full text-xs text-orange-800 dark:text-orange-200 leading-relaxed bg-white dark:bg-orange-950 p-2 rounded border border-orange-300 dark:border-orange-700 min-h-[100px]" value={editedContent.patientCare || patientCare} onChange={(e) => setEditedContent({ ...editedContent, patientCare: e.target.value })} />
                                ) : (
                                  <p className="text-xs text-orange-800 dark:text-orange-200 leading-relaxed">{patientCare}</p>
                                )}
                              </div>
                            )}
                            {followUp && (
                              <div className="bg-teal-50 dark:bg-teal-900/30 p-3 rounded-lg border border-teal-200 dark:border-teal-800">
                                <h5 className="text-xs font-semibold text-teal-900 dark:text-teal-100 mb-1 flex items-center justify-between">
                                  <span className="flex items-center">
                                    <i className="fas fa-calendar-check mr-1 text-xs"></i>
                                    Follow-up Recommendations
                                  </span>
                                  {editingSection === 'followUp' ? (
                                    <div className="flex gap-1">
                                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => handleSaveSection('followUp', 'FOLLOW-UP RECOMMENDATIONS', { woundAssessment, clinicalDiagnosis, recommendedInterventions, patientCare, followUp })} disabled={updateSectionMutation.isPending} data-testid="button-save-follow-up"><Check className="h-3 w-3 mr-1" />Save</Button>
                                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={handleCancelEdit} data-testid="button-cancel-follow-up"><X className="h-3 w-3 mr-1" />Cancel</Button>
                                    </div>
                                  ) : (
                                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => handleEditSection('followUp', followUp)} data-testid="button-edit-follow-up"><Pencil className="h-3 w-3" /></Button>
                                  )}
                                </h5>
                                {editingSection === 'followUp' ? (
                                  <textarea className="w-full text-xs text-teal-800 dark:text-teal-200 leading-relaxed bg-white dark:bg-teal-950 p-2 rounded border border-teal-300 dark:border-teal-700 min-h-[100px]" value={editedContent.followUp || followUp} onChange={(e) => setEditedContent({ ...editedContent, followUp: e.target.value })} />
                                ) : (
                                  <p className="text-xs text-teal-800 dark:text-teal-200 leading-relaxed">{followUp}</p>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="text-muted-foreground text-xs">AI Recommendations:</span>
                            <ul className="text-xs space-y-1 mt-1">
                              {assessment.aiAnalysis.recommendations.slice(0, 5).map((rec: string, index: number) => (
                                <li key={index} className="text-muted-foreground flex items-start space-x-1">
                                  <span className="text-blue-400 mt-0.5">•</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No AI analysis available</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function PatientProfile() {
  const [match, params] = useRoute("/patients/:id");
  const patientId = params?.id;
  const [isWoundModalOpen, setIsWoundModalOpen] = useState(false);
  const { toast } = useToast();

  // Create refs for scrolling to wounds (must be before any conditional returns)
  const woundRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  // Get patient details
  const { data: patient, isLoading: isPatientLoading } = useQuery({
    queryKey: ["/api/patients", patientId],
    queryFn: () => fetch(`/api/patients/${patientId}`).then(res => res.json()),
    enabled: !!patientId,
  });

  // Get patient wound assessments
  const { data: woundAssessments = [], isLoading: isAssessmentsLoading } = useQuery({
    queryKey: ["/api/patients", patientId, "wound-assessments"],
    queryFn: () => fetch(`/api/patients/${patientId}/wound-assessments`).then(res => res.json()),
    enabled: !!patientId,
  });

  // Get patient wounds
  const { data: wounds = [] } = useQuery<any[]>({
    queryKey: ["/api/wounds/patient", patientId],
    queryFn: () => fetch(`/api/wounds/patient/${patientId}`).then(res => res.json()),
    enabled: !!patientId,
  });

  // Auto-scroll to wound if hash is present in URL (must be before early returns)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (!isAssessmentsLoading && woundAssessments && woundAssessments.length > 0) {
      const hash = window.location.hash;
      if (hash.startsWith('#wound-')) {
        const woundId = hash.replace('#wound-', '');
        // Small delay to ensure refs are set
        timeoutId = setTimeout(() => {
          const element = woundRefs.current[woundId];
          if (element && element instanceof HTMLElement) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.style.transition = 'box-shadow 0.3s ease';
            element.style.boxShadow = '0 0 0 2px hsl(var(--primary))';
            setTimeout(() => {
              if (element && element instanceof HTMLElement) {
                element.style.boxShadow = '';
              }
            }, 2000);
          }
          // Clear the hash after scrolling
          window.history.replaceState(null, '', window.location.pathname);
        }, 500);
      }
    }
    return () => { if (timeoutId !== undefined) clearTimeout(timeoutId); };
  }, [isAssessmentsLoading, woundAssessments]);

  const handleCaptureWound = () => {
    setIsWoundModalOpen(true);
  };

  const handleWoundSave = async (assessmentData: any) => {
    try {
      // Save the assessment to the server
      const response = await fetch('/api/wound-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assessmentData),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save assessment: ${errorText}`);
      }

      // Only invalidate queries after successful save
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "wound-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wounds/patient", patientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      
      setIsWoundModalOpen(false);
      toast({
        title: "Success",
        description: "Wound assessment completed and saved",
      });
    } catch (error) {
      console.error('Error saving wound assessment:', error);
      toast({
        title: "Error",
        description: `Failed to save assessment: ${(error as Error).message}`,
        variant: "destructive",
      });
    }
  };

  if (!match) {
    return <div>Patient not found</div>;
  }

  if (isPatientLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground mb-4"></i>
          <p>Loading patient profile...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
            <i className="fas fa-user-slash text-3xl text-muted-foreground mb-4"></i>
            <p className="text-lg font-medium">Patient not found</p>
            <p className="text-muted-foreground">The requested patient could not be located.</p>
        </div>
      </div>
    );
  }

  // Sort assessments by date (newest first)
  const sortedAssessments = Array.isArray(woundAssessments) 
    ? [...woundAssessments].sort((a, b) => 
        new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime()
      )
    : [];

  // Group assessments by wound ID and create summary
  const woundSummary = sortedAssessments.reduce((acc: any, assessment: any) => {
    const woundId = assessment.woundId || 'unknown';
    if (!acc[woundId]) {
      acc[woundId] = {
        woundId,
        location: assessment.aiAnalysis?.bodyLocation || assessment.wound?.location || 'Unknown location',
        woundType: assessment.aiAnalysis?.woundType,
        assessmentCount: 0,
        latestAssessment: assessment,
      };
    }
    acc[woundId].assessmentCount++;
    return acc;
  }, {});

  const woundSummaryArray = Object.values(woundSummary);

  const scrollToWound = (woundId: string) => {
    const element = woundRefs.current[woundId];
    
    if (element && element instanceof HTMLElement) {
      // Scroll to the element
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Add highlight effect
      element.style.transition = 'box-shadow 0.3s ease';
      element.style.boxShadow = '0 0 0 2px hsl(var(--primary))';
      
      // Remove highlight after 2 seconds
      setTimeout(() => {
        if (element && element instanceof HTMLElement) {
          element.style.boxShadow = '';
        }
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card shadow-sm border-b border-border px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <Link href="/patients">
                <Button variant="ghost" size="sm" data-testid="button-back">
                  <i className="fas fa-arrow-left mr-2"></i>
                  Back to Patients
                </Button>
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">
                  {patient.firstName} {patient.lastName}
                </h1>
                <p className="text-sm text-muted-foreground break-words sm:truncate">
                  Patient ID: {patient.patientId} • Born: {patient.dateOfBirth && !isNaN(new Date(patient.dateOfBirth).getTime()) 
                    ? format(new Date(patient.dateOfBirth), 'MMM dd, yyyy')
                    : 'Not specified'
                  }
                </p>
              </div>
            </div>
            <Button onClick={handleCaptureWound} data-testid="button-capture-wound" className="self-start sm:self-auto w-full sm:w-auto">
              <i className="fas fa-camera mr-2"></i>
              Capture Wound Image
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Patient Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Patient Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Demographics</h4>
                    <div className="space-y-1 text-sm break-words">
                      <p><span className="text-muted-foreground">Age:</span> {new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} years</p>
                      <p><span className="text-muted-foreground">Gender:</span> {patient.gender}</p>
                      <p className="break-words sm:break-normal"><span className="text-muted-foreground">Phone:</span> {patient.phone}</p>
                      <p className="break-words sm:break-normal"><span className="text-muted-foreground">Email:</span> {patient.email}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2">Medical Information</h4>
                    <div className="space-y-1 text-sm break-words">
                      <p className="break-words sm:break-normal"><span className="text-muted-foreground">Allergies:</span> {patient.allergies || 'None recorded'}</p>
                      <p><span className="text-muted-foreground">Current Wounds:</span> {wounds.length}</p>
                      <p><span className="text-muted-foreground">Total Assessments:</span> {woundAssessments.length}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2">Insurance</h4>
                    <div className="space-y-1 text-sm break-words">
                      <p className="break-words sm:break-normal"><span className="text-muted-foreground">Provider:</span> {patient.insuranceProvider || 'Not recorded'}</p>
                      <p className="break-words sm:break-normal"><span className="text-muted-foreground">Class:</span> {patient.insuranceClass || 'Not recorded'}</p>
                      <p className="break-words sm:break-normal"><span className="text-muted-foreground">Member ID:</span> {patient.insuranceMemberId || 'Not recorded'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Wounds Summary */}
            {woundSummaryArray.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Active Wounds</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {woundSummaryArray.map((wound: any) => (
                      <Card 
                        key={wound.woundId}
                        className="cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => scrollToWound(wound.woundId)}
                        data-testid={`wound-summary-${wound.woundId}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <i className="fas fa-wound text-primary"></i>
                                <h4 className="font-semibold text-sm">
                                  {wound.woundType 
                                    ? wound.woundType.replace(/_/g, ' ').charAt(0).toUpperCase() + wound.woundType.replace(/_/g, ' ').slice(1)
                                    : `Wound #${wound.woundId.toString().slice(-6)}`
                                  }
                                </h4>
                              </div>
                              <p className="text-sm text-muted-foreground capitalize">
                                <i className="fas fa-map-marker-alt mr-1 text-xs"></i>
                                {wound.location}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                <i className="fas fa-history mr-1"></i>
                                {wound.assessmentCount} assessment{wound.assessmentCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                scrollToWound(wound.woundId);
                              }}
                              data-testid={`goto-wound-${wound.woundId}`}
                            >
                              <i className="fas fa-arrow-down"></i>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Wound Assessment History */}
            <Card>
              <CardHeader>
                <CardTitle>Wound Assessment History</CardTitle>
              </CardHeader>
              <CardContent>
                {isAssessmentsLoading ? (
                  <div className="text-center py-8">
                    <i className="fas fa-spinner fa-spin text-xl text-muted-foreground mb-2"></i>
                    <p className="text-muted-foreground">Loading assessments...</p>
                  </div>
                ) : sortedAssessments.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="fas fa-clipboard-list text-3xl text-muted-foreground mb-4"></i>
                    <p className="text-lg font-medium">No wound assessments found</p>
                    <p className="text-muted-foreground">Start by capturing a wound image to create your first assessment.</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {sortedAssessments.map((assessment: any, index: number) => {
                      // Check if this is the first assessment for this wound
                      const woundId = assessment.woundId || 'unknown';
                      const isFirstForWound = !sortedAssessments.slice(0, index).some(a => a.woundId === woundId);
                      
                      return (
                        <WoundAssessmentCard 
                          key={assessment.id} 
                          assessment={assessment}
                          cardRef={isFirstForWound ? (el: HTMLDivElement | null) => {
                            if (el) woundRefs.current[woundId] = el;
                          } : undefined}
                        />
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Wound Imaging Modal */}
        <WoundImagingModal
          isOpen={isWoundModalOpen}
          onClose={() => setIsWoundModalOpen(false)}
          patient={patient}
          onSave={handleWoundSave}
        />
    </div>
  );
}