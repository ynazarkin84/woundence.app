import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTreatmentPlanSchema } from "@/types/schema";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const treatmentPlanFormSchema = insertTreatmentPlanSchema.extend({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  woundId: z.string().optional(),
  doctorId: z.string().optional(),
  nurseId: z.string().optional(),
  woundType: z.string().optional(),
  recommendedDressing: z.string().optional(),
}).omit({
  createdBy: true,
});

type TreatmentPlanFormData = z.infer<typeof treatmentPlanFormSchema>;

interface TreatmentPlanFormProps {
  onSubmit: (data: TreatmentPlanFormData) => void;
  isLoading?: boolean;
  patientId: string;
  wounds?: any[];
  initialData?: Partial<TreatmentPlanFormData>;
}

export default function TreatmentPlanForm({ 
  onSubmit, 
  isLoading, 
  patientId,
  wounds = [],
  initialData 
}: TreatmentPlanFormProps) {
  // Fetch providers (doctors and nurses)
  const { data: providers = [] } = useQuery({
    queryKey: ["/api/providers"],
    queryFn: () => fetch("/api/providers").then(res => res.json()),
  });

  const doctors = providers.filter((p: any) => p.role === 'provider');
  const nurses = providers.filter((p: any) => p.role === 'staff');
  const form = useForm<TreatmentPlanFormData>({
    resolver: zodResolver(treatmentPlanFormSchema),
    defaultValues: {
      patientId,
      woundId: "none",
      planName: "",
      goals: "",
      dressingProtocol: "",
      frequency: "daily",
      debridementSchedule: "",
      offloadingInstructions: "",
      doctorId: "none",
      nurseId: "none",
      woundType: "pressure_ulcer",
      recommendedDressing: "foam",
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
      version: 1,
      isActive: true,
      ...initialData,
    },
  });

  const handleSubmit = (data: TreatmentPlanFormData) => {
    console.log("Form submission triggered with data:", data);
    console.log("Form errors:", form.formState.errors);
    const planData = {
      ...data,
      startDate: data.startDate,
      endDate: data.endDate || undefined,
      woundId: data.woundId === "none" ? undefined : data.woundId,
      doctorId: data.doctorId === "none" ? undefined : data.doctorId,
      nurseId: data.nurseId === "none" ? undefined : data.nurseId,
    };
    console.log("Processed plan data:", planData);
    onSubmit(planData);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="planName">Plan Name *</Label>
            <Input
              id="planName"
              placeholder="e.g., Diabetic Ulcer Treatment Protocol"
              {...form.register("planName")}
              data-testid="input-plan-name"
            />
            {form.formState.errors.planName && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.planName.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="woundId">Associated Wound (Optional)</Label>
            <Select
              value={form.watch("woundId") || "none"}
              onValueChange={(value) => form.setValue("woundId", value)}
            >
              <SelectTrigger data-testid="select-wound">
                <SelectValue placeholder="Select wound (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific wound</SelectItem>
                {wounds.map((wound: any) => (
                  <SelectItem key={wound.id} value={wound.id}>
                    {wound.woundId} - {wound.location} (Stage {wound.stage})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                {...form.register("startDate")}
                data-testid="input-start-date"
              />
              {form.formState.errors.startDate && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.startDate.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="endDate">End Date (Optional)</Label>
              <Input
                id="endDate"
                type="date"
                {...form.register("endDate")}
                data-testid="input-end-date"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="frequency">Treatment Frequency</Label>
            <Select
              value={form.watch("frequency") || "daily"}
              onValueChange={(value) => form.setValue("frequency", value)}
            >
              <SelectTrigger data-testid="select-frequency">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="twice_daily">Twice Daily</SelectItem>
                <SelectItem value="every_other_day">Every Other Day</SelectItem>
                <SelectItem value="three_times_weekly">Three Times Weekly</SelectItem>
                <SelectItem value="twice_weekly">Twice Weekly</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="doctorId">Assigned Doctor</Label>
              <Select
                value={form.watch("doctorId") || "none"}
                onValueChange={(value) => form.setValue("doctorId", value)}
              >
                <SelectTrigger data-testid="select-doctor">
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No doctor assigned</SelectItem>
                  {doctors.map((doctor: any) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      Dr. {doctor.firstName} {doctor.lastName}
                      {doctor.specialty && ` (${doctor.specialty})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="nurseId">Assigned Nurse</Label>
              <Select
                value={form.watch("nurseId") || "none"}
                onValueChange={(value) => form.setValue("nurseId", value)}
              >
                <SelectTrigger data-testid="select-nurse">
                  <SelectValue placeholder="Select nurse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No nurse assigned</SelectItem>
                  {nurses.map((nurse: any) => (
                    <SelectItem key={nurse.id} value={nurse.id}>
                      {nurse.firstName} {nurse.lastName}
                      {nurse.license && ` (${nurse.license})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="woundType">Type of Wound</Label>
              <Select
                value={form.watch("woundType") || "pressure_ulcer"}
                onValueChange={(value) => form.setValue("woundType", value)}
              >
                <SelectTrigger data-testid="select-wound-type">
                  <SelectValue placeholder="Select wound type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pressure_ulcer">Pressure Ulcer</SelectItem>
                  <SelectItem value="diabetic_ulcer">Diabetic Ulcer</SelectItem>
                  <SelectItem value="venous_ulcer">Venous Ulcer</SelectItem>
                  <SelectItem value="arterial_ulcer">Arterial Ulcer</SelectItem>
                  <SelectItem value="surgical_wound">Surgical Wound</SelectItem>
                  <SelectItem value="traumatic_wound">Traumatic Wound</SelectItem>
                  <SelectItem value="burn">Burn</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="recommendedDressing">Recommended Dressing</Label>
              <Select
                value={form.watch("recommendedDressing") || "foam"}
                onValueChange={(value) => form.setValue("recommendedDressing", value)}
              >
                <SelectTrigger data-testid="select-dressing">
                  <SelectValue placeholder="Select dressing type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="foam">Foam Dressing</SelectItem>
                  <SelectItem value="hydrocolloid">Hydrocolloid</SelectItem>
                  <SelectItem value="alginate">Alginate</SelectItem>
                  <SelectItem value="hydrogel">Hydrogel</SelectItem>
                  <SelectItem value="transparent_film">Transparent Film</SelectItem>
                  <SelectItem value="antimicrobial">Antimicrobial Dressing</SelectItem>
                  <SelectItem value="compression">Compression Bandage</SelectItem>
                  <SelectItem value="gauze">Gauze</SelectItem>
                  <SelectItem value="negative_pressure">Negative Pressure (VAC)</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Treatment Goals */}
      <Card>
        <CardHeader>
          <CardTitle>Treatment Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="goals">Goals *</Label>
            <Textarea
              id="goals"
              rows={4}
              placeholder="Describe the treatment goals and expected outcomes..."
              {...form.register("goals")}
              data-testid="textarea-goals"
            />
            {form.formState.errors.goals && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.goals.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Treatment Protocols */}
      <Card>
        <CardHeader>
          <CardTitle>Treatment Protocols</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="dressingProtocol">Dressing Protocol</Label>
            <Textarea
              id="dressingProtocol"
              rows={3}
              placeholder="Describe the dressing change protocol, materials, and technique..."
              {...form.register("dressingProtocol")}
              data-testid="textarea-dressing-protocol"
            />
          </div>

          <div>
            <Label htmlFor="debridementSchedule">Debridement Schedule</Label>
            <Textarea
              id="debridementSchedule"
              rows={2}
              placeholder="Define debridement schedule and method (if applicable)..."
              {...form.register("debridementSchedule")}
              data-testid="textarea-debridement-schedule"
            />
          </div>

          <div>
            <Label htmlFor="offloadingInstructions">Offloading Instructions</Label>
            <Textarea
              id="offloadingInstructions"
              rows={3}
              placeholder="Pressure relief and offloading instructions..."
              {...form.register("offloadingInstructions")}
              data-testid="textarea-offloading-instructions"
            />
          </div>
        </CardContent>
      </Card>

      {/* Plan Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="isActive">Active Plan</Label>
              <p className="text-sm text-muted-foreground">
                This plan will be active and visible to staff
              </p>
            </div>
            <Switch
              id="isActive"
              checked={form.watch("isActive") || false}
              onCheckedChange={(checked) => form.setValue("isActive", checked)}
              data-testid="switch-active"
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end space-x-3">
        <Button type="submit" disabled={isLoading} data-testid="button-save-plan">
          {isLoading ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Saving...
            </>
          ) : (
            <>
              <i className="fas fa-save mr-2"></i>
              Save Treatment Plan
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
