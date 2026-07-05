import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWoundAssessmentSchema } from "@/types/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const woundAssessmentFormSchema = insertWoundAssessmentSchema.extend({
  assessmentDate: z.string().min(1, "Assessment date is required"),
});

type WoundAssessmentFormData = z.infer<typeof woundAssessmentFormSchema>;

interface WoundAssessmentFormProps {
  onSubmit: (data: WoundAssessmentFormData) => void;
  isLoading?: boolean;
  woundId: string;
  visitId?: string;
  initialData?: Partial<WoundAssessmentFormData>;
}

export default function WoundAssessmentForm({ 
  onSubmit, 
  isLoading, 
  woundId,
  visitId,
  initialData 
}: WoundAssessmentFormProps) {
  const form = useForm<WoundAssessmentFormData>({
    resolver: zodResolver(woundAssessmentFormSchema),
    defaultValues: {
      woundId,
      visitId: visitId || undefined,
      assessmentDate: new Date().toISOString().split('T')[0],
      length: undefined,
      width: undefined,
      depth: undefined,
      area: undefined,
      perimeter: undefined,
      tissueType: "",
      exudateAmount: "",
      exudateOdor: "",
      painLevel: undefined,
      infectionSigns: "",
      imageUrl: "",
      aiAnalysis: undefined,
      notes: "",
      ...initialData,
    },
  });

  const handleSubmit = (data: WoundAssessmentFormData) => {
    const assessmentData = {
      ...data,
      assessmentDate: new Date(data.assessmentDate).toISOString(),
      infectionSigns: data.infectionSigns ? JSON.stringify(data.infectionSigns.split(',').map(s => s.trim())) : "",
    };
    onSubmit(assessmentData);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Basic Assessment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="assessmentDate">Assessment Date *</Label>
            <Input
              id="assessmentDate"
              type="date"
              {...form.register("assessmentDate")}
              data-testid="input-assessment-date"
            />
            {form.formState.errors.assessmentDate && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.assessmentDate.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Wound Measurements */}
      <Card>
        <CardHeader>
          <CardTitle>Wound Measurements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="length">Length (cm)</Label>
              <Input
                id="length"
                type="number"
                step="0.1"
                {...form.register("length", { valueAsNumber: true })}
                data-testid="input-length"
              />
            </div>
            <div>
              <Label htmlFor="width">Width (cm)</Label>
              <Input
                id="width"
                type="number"
                step="0.1"
                {...form.register("width", { valueAsNumber: true })}
                data-testid="input-width"
              />
            </div>
            <div>
              <Label htmlFor="depth">Depth (cm)</Label>
              <Input
                id="depth"
                type="number"
                step="0.1"
                {...form.register("depth", { valueAsNumber: true })}
                data-testid="input-depth"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="area">Area (cm²)</Label>
              <Input
                id="area"
                type="number"
                step="0.1"
                {...form.register("area", { valueAsNumber: true })}
                data-testid="input-area"
              />
            </div>
            <div>
              <Label htmlFor="perimeter">Perimeter (cm)</Label>
              <Input
                id="perimeter"
                type="number"
                step="0.1"
                {...form.register("perimeter", { valueAsNumber: true })}
                data-testid="input-perimeter"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wound Characteristics */}
      <Card>
        <CardHeader>
          <CardTitle>Wound Characteristics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="tissueType">Tissue Type</Label>
            <Select
              value={form.watch("tissueType") || ""}
              onValueChange={(value) => form.setValue("tissueType", value)}
            >
              <SelectTrigger data-testid="select-tissue-type">
                <SelectValue placeholder="Select tissue type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="granulation">Granulation</SelectItem>
                <SelectItem value="slough">Slough</SelectItem>
                <SelectItem value="necrotic">Necrotic</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="exudateAmount">Exudate Level</Label>
              <Select
                value={form.watch("exudateAmount") || ""}
                onValueChange={(value) => form.setValue("exudateAmount", value)}
              >
                <SelectTrigger data-testid="select-exudate">
                  <SelectValue placeholder="Select exudate level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="heavy">Heavy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="exudateOdor">Odor</Label>
              <Select
                value={form.watch("exudateOdor") || ""}
                onValueChange={(value) => form.setValue("exudateOdor", value)}
              >
                <SelectTrigger data-testid="select-odor">
                  <SelectValue placeholder="Select odor level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="mild">Mild</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="strong">Strong</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="painLevel">Pain Level (0-10)</Label>
            <Input
              id="painLevel"
              type="number"
              min="0"
              max="10"
              {...form.register("painLevel", { valueAsNumber: true })}
              data-testid="input-pain-level"
            />
          </div>

          <div>
            <Label htmlFor="infectionSigns">Infection Signs (comma-separated)</Label>
            <Input
              id="infectionSigns"
              placeholder="e.g., erythema, warmth, purulent drainage"
              {...form.register("infectionSigns")}
              data-testid="input-infection-signs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="notes">Clinical Notes</Label>
            <Textarea
              id="notes"
              rows={4}
              placeholder="Add clinical observations, treatment recommendations, etc."
              {...form.register("notes")}
              data-testid="textarea-notes"
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end space-x-3">
        <Button type="submit" disabled={isLoading} data-testid="button-save-assessment">
          {isLoading ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Saving...
            </>
          ) : (
            <>
              <i className="fas fa-save mr-2"></i>
              Save Assessment
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
