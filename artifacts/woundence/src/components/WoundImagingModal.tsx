import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Search, AlertTriangle } from "lucide-react";
import type { WoundAnalysisApiResult } from "@/types/schema";

interface WoundImagingModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    patientId: string;
  };
  woundId?: string;
  onSave?: (assessment: any) => void;
}

export default function WoundImagingModal({ 
  isOpen, 
  onClose, 
  patient,
  woundId,
  onSave 
}: WoundImagingModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [calibrationSize, setCalibrationSize] = useState("2.0");
  const [analysisResult, setAnalysisResult] = useState<WoundAnalysisApiResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Camera capture states
  const [captureMode, setCaptureMode] = useState<'file' | 'camera'>('file');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [useFrontCamera, setUseFrontCamera] = useState(false);
  const [isCameraSupported, setIsCameraSupported] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    // Check if camera is supported
    const cameraSupported = !!(navigator.mediaDevices && 
      navigator.mediaDevices.getUserMedia);
    console.log('🎥 Camera support check:', {
      cameraSupported,
      hasNavigator: !!navigator,
      hasMediaDevices: !!navigator.mediaDevices,
      hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      userAgent: navigator.userAgent
    });
    setIsCameraSupported(cameraSupported);
    
    // Cleanup camera on unmount
    return () => {
      stopCamera();
    };
  }, []);
  
  useEffect(() => {
    if (isOpen) {
      // Reset all state when modal opens for fresh start
      setSelectedFile(null);
      setImagePreview(null);
      setAnalysisResult(null);
      setCalibrationSize("2.0");
      setCaptureMode('file');
      setIsCameraActive(false);
      setUseFrontCamera(false);
    } else {
      // Stop camera when modal closes
      stopCamera();
    }
  }, [isOpen]);

  // Debug boundary coordinates when they're available
  useEffect(() => {
    if (analysisResult?.analysis?.boundaryCoordinates && analysisResult.imageMetadata) {
      console.log('🔍 Boundary Debug:', {
        coordinateCount: analysisResult.analysis.boundaryCoordinates.length,
        imageMetadata: analysisResult.imageMetadata,
        sampleCoords: analysisResult.analysis.boundaryCoordinates.slice(0, 3),
        coordinateRange: {
          minX: Math.min(...analysisResult.analysis.boundaryCoordinates.map(c => c.x)),
          maxX: Math.max(...analysisResult.analysis.boundaryCoordinates.map(c => c.x)),
          minY: Math.min(...analysisResult.analysis.boundaryCoordinates.map(c => c.y)),
          maxY: Math.max(...analysisResult.analysis.boundaryCoordinates.map(c => c.y))
        }
      });

      // Debug SVG coordinate system alignment
      console.log('🎯 SVG Coordinate Debug:', {
        svgViewBoxDimensions: `${analysisResult.imageMetadata.width}x${analysisResult.imageMetadata.height}`,
        sampleCoordinates: analysisResult.analysis.boundaryCoordinates.slice(0, 3),
        percentagePositions: analysisResult.analysis.boundaryCoordinates.slice(0, 3).map(coord => ({
          x: `${((coord.x / analysisResult.imageMetadata.width) * 100).toFixed(1)}%`,
          y: `${((coord.y / analysisResult.imageMetadata.height) * 100).toFixed(1)}%`
        }))
      });
    }
  }, [analysisResult]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      setAnalysisResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select an image first",
        variant: "destructive",
      });
      return;
    }

    if (!patient?.id) {
      toast({
        title: "Error",
        description: "Patient information is required",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const formData = new FormData();
      formData.append('wound-image', selectedFile);
      formData.append('calibrationSize', calibrationSize);
      formData.append('patientId', patient.id);
      if (woundId) {
        formData.append('woundId', woundId);
      }

      const response = await fetch('/api/wound-assessments/analyze', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        // Try to get detailed error message from server response
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || errorData?.error || 'Analysis failed';
        throw new Error(errorMessage);
      }

      const result = await response.json();
      setAnalysisResult(result);
      
      toast({
        title: "Success",
        description: "Wound analysis completed successfully",
      });
    } catch (error) {
      console.error('Analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to analyze wound image";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveAssessment = async () => {
    if (!analysisResult || !patient?.id) {
      toast({
        title: "Error",
        description: "Missing analysis result or patient information",
        variant: "destructive",
      });
      return;
    }

    try {
      let finalWoundId = woundId;
      
      // If no woundId provided, create a new wound for this patient
      if (!finalWoundId) {
        const woundData = {
          patientId: patient.id,
          location: analysisResult.analysis.bodyLocation || 'Unknown location', // Use AI-detected body location
          stage: analysisResult.analysis.healingStage,
          woundType: analysisResult.analysis.woundType || 'other', // Use AI-detected wound type
          dateIdentified: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
          isActive: true
        };
        
        const woundResponse = await fetch('/api/wounds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(woundData),
          credentials: 'include',
        });
        
        if (!woundResponse.ok) {
          const errorText = await woundResponse.text();
          throw new Error(`Failed to create wound: ${errorText}`);
        }
        
        const newWound = await woundResponse.json();
        finalWoundId = newWound.id;
      }

      const assessmentData = {
        woundId: finalWoundId,
        assessmentDate: new Date(),
        
        // Basic measurements
        area: analysisResult.analysis.area ? String(analysisResult.analysis.area) : null,
        perimeter: analysisResult.analysis.perimeter ? String(analysisResult.analysis.perimeter) : null,
        length: analysisResult.analysis.longestDiameter ? String(analysisResult.analysis.longestDiameter) : null,
        width: analysisResult.analysis.width ? String(analysisResult.analysis.width) : null,
        depth: analysisResult.analysis.depth ? String(analysisResult.analysis.depth) : null,
        volume: analysisResult.analysis.volume ? String(analysisResult.analysis.volume) : null,
        
        // Undermining/Tunneling
        undermining: analysisResult.analysis.undermining || false,
        underminingLocation: analysisResult.analysis.underminingLocation || null,
        underminingDepth: analysisResult.analysis.underminingDepth ? String(analysisResult.analysis.underminingDepth) : null,
        tunneling: analysisResult.analysis.tunneling || false,
        tunnelingLocation: analysisResult.analysis.tunnelingLocation || null,
        tunnelingDepth: analysisResult.analysis.tunnelingDepth ? String(analysisResult.analysis.tunnelingDepth) : null,
        
        // Tissue composition (detailed percentages)
        granulationPercent: analysisResult.analysis.tissueComposition.granulation || null,
        sloughPercent: analysisResult.analysis.tissueComposition.slough || null,
        necroticPercent: analysisResult.analysis.tissueComposition.necrotic || null,
        epithelialPercent: analysisResult.analysis.tissueComposition.epithelial || null,
        fibrinPercent: analysisResult.analysis.tissueComposition.fibrin || null,
        tissueType: `${analysisResult.analysis.tissueComposition.granulation}% granulation, ${analysisResult.analysis.tissueComposition.slough}% slough, ${analysisResult.analysis.tissueComposition.necrotic}% necrotic`,
        
        // Exudate details
        exudateAmount: analysisResult.analysis.exudate?.amount || null,
        exudateType: analysisResult.analysis.exudate?.type || null,
        exudateOdor: analysisResult.analysis.exudate?.odor || null,
        
        // Surrounding skin (periwound)
        periwoundSkin: analysisResult.analysis.periwoundSkin?.condition || null,
        periwoundEdema: analysisResult.analysis.periwoundSkin?.edema || false,
        periwoundErythema: analysisResult.analysis.periwoundSkin?.erythema || false,
        periwoundWarmth: analysisResult.analysis.periwoundSkin?.warmth || false,
        periwoundInduration: analysisResult.analysis.periwoundSkin?.induration || false,
        
        // Classification/Staging
        pressureInjuryStage: analysisResult.analysis.pressureInjuryStage || null,
        wagnerGrade: analysisResult.analysis.wagnerGrade || null,
        coapClassification: analysisResult.analysis.coapClassification || null,
        woundClassification: analysisResult.analysis.woundClassification || null,
        
        // Pain assessment
        painPresent: analysisResult.analysis.pain?.present || false,
        painLevel: analysisResult.analysis.pain?.level || null,
        painCharacter: analysisResult.analysis.pain?.character || null,
        
        // Dressing recommendations
        primaryDressing: analysisResult.analysis.dressingRecommendation?.primary || null,
        secondaryDressing: analysisResult.analysis.dressingRecommendation?.secondary || null,
        dressingChangeFrequency: analysisResult.analysis.dressingRecommendation?.changeFrequency || null,
        
        // Treatment interventions
        cleansingAgent: analysisResult.analysis.treatmentPlan?.cleansingAgent || null,
        debridementType: analysisResult.analysis.treatmentPlan?.debridementType || null,
        infectionManagement: analysisResult.analysis.treatmentPlan?.infectionManagement || null,
        adjunctTherapy: analysisResult.analysis.treatmentPlan?.adjunctTherapy || null,
        
        // Next review date
        nextReviewDate: analysisResult.analysis.nextReviewDate || null,
        
        // Legacy/existing fields
        imageUrl: analysisResult.imagePath,
        aiAnalysis: analysisResult.analysis,
        notes: `AI Analysis: ${analysisResult.analysis.recommendations.join('. ')}`,
        visitId: null, // Optional field
        exudate: analysisResult.analysis.exudate?.amount || null, // Legacy field
        odor: analysisResult.analysis.exudate?.odor || null, // Legacy field
        infectionSigns: JSON.stringify(analysisResult.analysis.infectionSigns || []),
      };

      onSave?.(assessmentData);
      
      // Show success message and close modal
      toast({
        title: "Assessment Saved",
        description: "Wound assessment has been saved successfully.",
        variant: "default",
      });
      
      // Close modal after successful save
      handleClose();
    } catch (error) {
      console.error('Error saving assessment:', error);
      toast({
        title: "Error",
        description: `Failed to save assessment: ${(error as Error).message}`,
        variant: "destructive",
      });
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setAnalysisResult(null);
    setCalibrationSize("2.0");
    stopCamera();
    setCaptureMode('file');
  };
  
  const startCamera = async (facingOverride?: boolean) => {
    console.log('🎥 Starting camera...', { facingOverride, useFrontCamera, isCameraSupported });
    try {
      // Stop any existing stream first
      stopCamera();
      
      // Set camera active first so the video element gets rendered
      setIsCameraActive(true);
      
      // Wait a bit for React to render the video element
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const useFront = facingOverride !== undefined ? facingOverride : useFrontCamera;
      console.log('🎥 Camera facing:', useFront ? 'front' : 'back');
      
      let constraints: MediaStreamConstraints = {
        video: { 
          facingMode: useFront ? "user" : "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } as MediaTrackConstraints,
        audio: false
      };
      
      let stream: MediaStream;
      
      try {
        // Try with facingMode first
        console.log('🎥 Attempting getUserMedia with facingMode...');
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('🎥 getUserMedia success:', stream);
      } catch (facingError) {
        console.log('🎥 facingMode failed:', facingError);
        // iOS fallback: enumerate devices and use deviceId
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          
          let targetDevice;
          if (useFront) {
            // Look for front camera (usually has 'front' or 'user' in label)
            targetDevice = videoDevices.find(device => 
              device.label.toLowerCase().includes('front') ||
              device.label.toLowerCase().includes('user') ||
              device.label.toLowerCase().includes('selfie')
            ) || videoDevices[0];
          } else {
            // Look for back camera (usually has 'back' or 'environment' in label)
            targetDevice = videoDevices.find(device => 
              device.label.toLowerCase().includes('back') ||
              device.label.toLowerCase().includes('environment') ||
              device.label.toLowerCase().includes('rear')
            ) || videoDevices[videoDevices.length - 1];
          }
          
          if (targetDevice) {
            constraints = {
              video: { 
                deviceId: { exact: targetDevice.deviceId },
                width: { ideal: 1280 },
                height: { ideal: 720 }
              } as MediaTrackConstraints,
              audio: false
            };
            stream = await navigator.mediaDevices.getUserMedia(constraints);
          } else {
            throw new Error('No suitable camera found');
          }
        } catch (deviceError) {
          throw facingError; // Fall back to original error
        }
      }
      
      if (videoRef.current) {
        console.log('🎥 Setting video source...');
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          console.log('🎥 Video metadata loaded, starting playback...');
          videoRef.current?.play();
        };
      } else {
        console.error('🎥 Video ref is null!');
      }
      
      setCurrentStream(stream);
      console.log('🎥 Camera started successfully');
      
      // Clear any existing image when starting camera
      setSelectedFile(null);
      setImagePreview(null);
      setAnalysisResult(null);
      
    } catch (error) {
      console.error('🎥 Camera access failed:', error);
      console.error('🎥 Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        isCameraSupported,
        hasMediaDevices: !!navigator.mediaDevices,
        hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
      });
      
      // Reset camera state on error
      setIsCameraActive(false);
      setCurrentStream(null);
      
      toast({
        title: "Camera Error",
        description: `Unable to access camera: ${(error as Error).message}`,
        variant: "destructive",
      });
    }
  };
  
  const stopCamera = () => {
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      setCurrentStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };
  
  const switchCamera = async () => {
    const nextUseFront = !useFrontCamera;
    setUseFrontCamera(nextUseFront);
    if (isCameraActive) {
      // Restart camera with new facing mode using the new value
      await startCamera(nextUseFront);
    }
  };
  
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      toast({
        title: "Error",
        description: "Camera not ready for photo capture",
        variant: "destructive",
      });
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      
      // Convert to blob then to File object
      const handleBlobCreation = (blob: Blob | null) => {
        if (blob) {
          const file = new File([blob], `wound-capture-${Date.now()}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          
          setSelectedFile(file);
          
          // Create preview
          const reader = new FileReader();
          reader.onload = (e) => {
            setImagePreview(e.target?.result as string);
          };
          reader.readAsDataURL(file);
          
          // Stop camera after capture
          stopCamera();
          
          setAnalysisResult(null);
          
          toast({
            title: "Success",
            description: "Photo captured successfully",
          });
        }
      };
      
      // Try toBlob first, fallback to toDataURL for older Safari
      if (canvas.toBlob) {
        canvas.toBlob(handleBlobCreation, 'image/jpeg', 0.9);
      } else {
        // Fallback for older browsers
        const handleFallback = async () => {
          try {
            const dataURL = canvas.toDataURL('image/jpeg', 0.9);
            const response = await fetch(dataURL);
            const blob = await response.blob();
            handleBlobCreation(blob);
          } catch (fallbackError) {
            console.error('Photo capture fallback failed:', fallbackError);
            toast({
              title: "Error",
              description: "Failed to capture photo",
              variant: "destructive",
            });
          }
        };
        handleFallback();
      }
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Wound Imaging</DialogTitle>
          {patient && (
            <p className="text-sm text-muted-foreground">
              Patient: {patient.firstName} {patient.lastName} ({patient.patientId})
            </p>
          )}
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Capture Area */}
          <div className="space-y-4">
            <div className="aspect-square bg-muted rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center relative overflow-hidden">
              {captureMode === 'camera' && isCameraActive ? (
                <div className="relative w-full h-full">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover rounded-lg"
                    muted
                    autoPlay
                    playsInline
                    data-testid="camera-preview"
                  />
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={switchCamera}
                      className="bg-black/50 hover:bg-black/70 text-white border-0"
                      data-testid="button-switch-camera"
                    >
                      <i className="fas fa-sync-alt"></i>
                    </Button>
                    <Button
                      size="lg"
                      onClick={capturePhoto}
                      className="rounded-full w-16 h-16 bg-white hover:bg-gray-100 text-black border-4 border-white shadow-lg"
                      data-testid="button-capture-photo"
                    >
                      <i className="fas fa-camera text-xl"></i>
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={stopCamera}
                      className="bg-black/50 hover:bg-black/70 text-white border-0"
                      data-testid="button-stop-camera"
                    >
                      <i className="fas fa-times"></i>
                    </Button>
                  </div>
                </div>
              ) : imagePreview ? (
                <div className="relative w-full h-full">
                  <img 
                    ref={(el) => {
                      if (el) {
                        el.onload = () => {
                          // Store image dimensions for coordinate scaling
                          el.dataset.naturalWidth = String(el.naturalWidth);
                          el.dataset.naturalHeight = String(el.naturalHeight);
                        };
                      }
                    }}
                    src={imagePreview} 
                    alt="Wound preview" 
                    className="w-full h-full object-contain rounded-lg"
                  />
                  {(() => {
                    const hasCoords = analysisResult?.analysis?.boundaryCoordinates;
                    const hasMetadata = analysisResult?.imageMetadata;
                    const coordinates = analysisResult?.analysis?.boundaryCoordinates || [];
                    const coordsLength = coordinates.length;
                    
                    // AI returns single (0,0) coordinate to signal "no wound detected"
                    const isNoWoundCase = coordsLength === 1 && 
                                         coordinates[0]?.x === 0 && 
                                         coordinates[0]?.y === 0;
                    
                    // Need at least 3 points to draw a meaningful polygon boundary
                    const hasValidBoundary = coordsLength >= 3;
                    
                    const shouldRender = hasCoords && hasMetadata && hasValidBoundary && !isNoWoundCase;
                    
                    console.log('🔧 SVG Render Condition Debug:', {
                      hasCoords: !!hasCoords,
                      hasMetadata: !!hasMetadata,
                      coordsLength,
                      hasValidBoundary,
                      isNoWoundCase,
                      shouldRender,
                      firstCoord: coordinates[0]
                    });

                    return shouldRender;
                  })() && analysisResult?.imageMetadata && analysisResult?.analysis?.boundaryCoordinates ? (
                    <svg 
                      className="absolute top-0 left-0 w-full h-full pointer-events-none rounded-lg overflow-hidden"
                      viewBox={`0 0 ${analysisResult.imageMetadata.width} ${analysisResult.imageMetadata.height}`}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <polygon
                        points={analysisResult.analysis.boundaryCoordinates
                          .map(coord => `${coord.x},${coord.y}`)
                          .join(' ')}
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="8"
                        strokeDasharray="10,5"
                        opacity="0.9"
                        data-testid="wound-boundary-overlay"
                      />
                      {/* Add dots at boundary points for better visibility */}
                      {analysisResult.analysis.boundaryCoordinates.map((coord, index) => (
                        <circle
                          key={index}
                          cx={coord.x}
                          cy={coord.y}
                          r="6"
                          fill="#22c55e"
                          opacity="0.8"
                        />
                      ))}
                    </svg>
                  ) : analysisResult?.analysis ? (
                    <div className="absolute top-4 left-4 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-3 py-2 rounded-md text-sm border border-yellow-300 dark:border-yellow-700">
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-600">⚠️</span>
                        <span>AI could not clearly identify wound boundaries</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-center p-8">
                  <i className="fas fa-camera text-4xl text-muted-foreground mb-4"></i>
                  <p className="text-lg font-medium text-foreground mb-2">Position Wound in Frame</p>
                  <p className="text-sm text-muted-foreground mb-4">Place calibration marker (coin) next to the wound</p>
                </div>
              )}
            </div>
            
            {/* Hidden canvas for photo capture */}
            <canvas
              ref={canvasRef}
              style={{ display: 'none' }}
            />
            
            <div className="space-y-3">
              {/* Capture Mode Toggle */}
              <div className="flex rounded-lg border border-border bg-background">
                <button
                  type="button"
                  onClick={() => {
                    setCaptureMode('file');
                    stopCamera();
                  }}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-lg transition-colors ${
                    captureMode === 'file'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid="button-file-mode"
                >
                  <i className="fas fa-upload mr-2"></i>
                  Upload File
                </button>
                {isCameraSupported && (
                  <button
                    type="button"
                    onClick={() => {
                      console.log('🎥 Camera mode button clicked');
                      setCaptureMode('camera');
                      // Don't auto-start camera, let user click Start Camera button
                    }}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-lg transition-colors ${
                      captureMode === 'camera'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid="button-camera-mode"
                  >
                    <i className="fas fa-camera mr-2"></i>
                    Use Camera
                  </button>
                )}
              </div>
              
              {/* File Upload (shown when in file mode) */}
              {captureMode === 'file' && (
                <div>
                  <Label htmlFor="wound-image">Upload Wound Image</Label>
                  <Input
                    id="wound-image"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    data-testid="input-wound-image"
                  />
                </div>
              )}
              
              {/* Camera Controls (shown when in camera mode) */}
              {captureMode === 'camera' && (
                <div className="space-y-2">
                  <Label>Camera Capture</Label>
                  
                  
                  <div className="flex space-x-2">
                    {!isCameraActive ? (
                      <Button
                        onClick={() => {
                          startCamera();
                        }}
                        variant="outline"
                        className="flex-1"
                        data-testid="button-start-camera"
                      >
                        <i className="fas fa-video mr-2"></i>
                        Start Camera
                      </Button>
                    ) : (
                      <div className="text-sm text-muted-foreground flex items-center">
                        <i className="fas fa-circle text-red-500 mr-2 animate-pulse"></i>
                        Camera active - Position wound and tap capture button
                      </div>
                    )}
                  </div>
                  {isCameraActive && (
                    <div className="text-xs text-muted-foreground">
                      Using {useFrontCamera ? 'front' : 'back'} camera
                    </div>
                  )}
                </div>
              )}
              
              <div>
                <Label htmlFor="calibration-size">Calibration Marker Diameter (cm)</Label>
                <Input
                  id="calibration-size"
                  type="number"
                  step="0.1"
                  value={calibrationSize}
                  onChange={(e) => setCalibrationSize(e.target.value)}
                  placeholder="2.0"
                  data-testid="input-calibration-size"
                />
              </div>

              <div className="flex space-x-2">
                <Button 
                  onClick={handleAnalyze}
                  disabled={!selectedFile || isAnalyzing || isCameraActive}
                  className="flex-1"
                  data-testid="button-analyze-wound"
                >
                  {isAnalyzing ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-microscope mr-2"></i>
                      Analyze Wound
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={resetModal}
                  data-testid="button-reset"
                >
                  <i className="fas fa-redo mr-2"></i>
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {/* AI Analysis Results */}
          <div className="space-y-4">
            {analysisResult ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>AI Analysis Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Area:</span>
                      <span className="text-sm font-medium text-foreground">
                        {analysisResult.analysis.area.toFixed(1)} cm²
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Perimeter:</span>
                      <span className="text-sm font-medium text-foreground">
                        {analysisResult.analysis.perimeter.toFixed(1)} cm
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Longest Diameter:</span>
                      <span className="text-sm font-medium text-foreground">
                        {analysisResult.analysis.longestDiameter.toFixed(1)} cm
                      </span>
                    </div>
                    {analysisResult.analysis.depth && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Depth (estimated):</span>
                        <span className="text-sm font-medium text-foreground">
                          {analysisResult.analysis.depth.toFixed(1)} cm
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>
                      <i className="fas fa-search-medical mr-2"></i>
                      Wound Classification
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Type:</span>
                      <span className="text-sm font-medium text-foreground bg-accent px-2 py-1 rounded-md">
                        {analysisResult.analysis.woundType?.replaceAll(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tissue Composition</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-foreground">
                        Granulation: {analysisResult.analysis.tissueComposition.granulation}%
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm text-foreground">
                        Slough: {analysisResult.analysis.tissueComposition.slough}%
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gray-800 rounded-full"></div>
                      <span className="text-sm text-foreground">
                        Necrotic: {analysisResult.analysis.tissueComposition.necrotic}%
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Enhanced Assessment Summary with organized sections */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <i className="fas fa-chart-line mr-2"></i>
                      Assessment Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full wound-stage-${analysisResult.analysis.healingStage}`}>
                          Stage {analysisResult.analysis.healingStage}
                        </span>
                        {analysisResult.analysis.infectionSigns.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {analysisResult.analysis.infectionSigns.map((sign, index) => (
                              <span key={index} className="px-2 py-1 text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded-md">
                                {sign}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Parse and display recommendations with section parsing */}
                      {(() => {
                        const recommendations = analysisResult.analysis.recommendations || [];
                        const fullText = recommendations.join(' ');
                        
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

                        return (
                          <>
                            {hasSections ? (
                              <>
                                {/* Wound Assessment */}
                                {woundAssessment && (
                                  <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                                      <i className="fas fa-clipboard-list mr-2"></i>
                                      Wound Assessment
                                    </h4>
                                    <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                                      {woundAssessment}
                                    </p>
                                  </div>
                                )}

                                {/* Clinical Diagnosis */}
                                {clinicalDiagnosis && (
                                  <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                                    <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center">
                                      <i className="fas fa-stethoscope mr-2"></i>
                                      Clinical Diagnosis
                                    </h4>
                                    <p className="text-sm text-purple-800 dark:text-purple-200 leading-relaxed">
                                      {clinicalDiagnosis}
                                    </p>
                                  </div>
                                )}

                                {/* Recommended Interventions */}
                                {recommendedInterventions && (
                                  <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-200 dark:border-green-800">
                                    <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center">
                                      <i className="fas fa-procedures mr-2"></i>
                                      Recommended Interventions
                                    </h4>
                                    <p className="text-sm text-green-800 dark:text-green-200 leading-relaxed">
                                      {recommendedInterventions}
                                    </p>
                                  </div>
                                )}

                                {/* Patient Care Recommendations */}
                                {patientCare && (
                                  <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                                    <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-2 flex items-center">
                                      <i className="fas fa-user-nurse mr-2"></i>
                                      Patient Care Recommendations
                                    </h4>
                                    <p className="text-sm text-orange-800 dark:text-orange-200 leading-relaxed">
                                      {patientCare}
                                    </p>
                                  </div>
                                )}

                                {/* Follow-up Recommendations */}
                                {followUp && (
                                  <div className="bg-teal-50 dark:bg-teal-900/30 p-4 rounded-lg border border-teal-200 dark:border-teal-800">
                                    <h4 className="text-sm font-semibold text-teal-900 dark:text-teal-100 mb-2 flex items-center">
                                      <i className="fas fa-calendar-check mr-2"></i>
                                      Follow-up Recommendations
                                    </h4>
                                    <p className="text-sm text-teal-800 dark:text-teal-200 leading-relaxed">
                                      {followUp}
                                    </p>
                                  </div>
                                )}
                              </>
                            ) : (
                              /* Fallback for recommendations without sections */
                              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                                  <i className="fas fa-clipboard-check mr-2"></i>
                                  Clinical Recommendations
                                </h4>
                                <ul className="text-sm text-gray-800 dark:text-gray-200 space-y-2">
                                  {recommendations.map((rec, index) => (
                                    <li key={index} className="flex items-start space-x-2">
                                      <span className="text-blue-500 mt-1 text-xs">•</span>
                                      <span className="leading-relaxed">{rec}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <i className="fas fa-microscope text-3xl text-muted-foreground mb-4"></i>
                    <p className="text-foreground mb-2">Ready for Analysis</p>
                    <p className="text-sm text-muted-foreground">
                      Upload a wound image with a calibration marker to get detailed AI analysis
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-border">
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel">
            Cancel
          </Button>
          {analysisResult && (
            <Button 
              onClick={handleSaveAssessment}
              disabled={!patient?.id}
              data-testid="button-save-assessment"
            >
              <i className="fas fa-save mr-2"></i>
              Save Assessment
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
