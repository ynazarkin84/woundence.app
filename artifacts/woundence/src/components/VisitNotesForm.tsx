import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVisitSchema } from "@/types/schema";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const visitNotesFormSchema = insertVisitSchema.extend({
  visitDate: z.string().min(1, "Visit date is required"),
  vitalsJson: z.string().optional(),
  ordersJson: z.string().optional(),
  billingCodesJson: z.string().optional(),
});

type VisitNotesFormData = z.infer<typeof visitNotesFormSchema>;

interface VisitNotesFormProps {
  onSubmit: (data: VisitNotesFormData) => void;
  isLoading?: boolean;
  patientId: string;
  initialData?: Partial<VisitNotesFormData>;
}

export default function VisitNotesForm({ 
  onSubmit, 
  isLoading, 
  patientId,
  initialData 
}: VisitNotesFormProps) {
  const { user } = useAuth();
  
  const form = useForm<VisitNotesFormData>({
    resolver: zodResolver(visitNotesFormSchema),
    defaultValues: {
      patientId,
      appointmentId: undefined,
      providerId: user?.id || "",
      visitDate: new Date().toISOString().split('T')[0],
      visitType: "",
      chiefComplaint: "",
      subjective: "",
      objective: "",
      assessment: "",
      plan: "",
      vitalsJson: "",
      ordersJson: "",
      billingCodesJson: "",
      totalAmount: undefined,
      insuranceCovered: undefined,
      patientPay: undefined,
      ...initialData,
    },
  });

  const handleSubmit = (data: VisitNotesFormData) => {
    const visitData = {
      ...data,
      visitDate: new Date(data.visitDate).toISOString(),
      vitals: data.vitalsJson ? JSON.parse(data.vitalsJson) : undefined,
      orders: data.ordersJson ? JSON.parse(data.ordersJson) : undefined,
      billingCodes: data.billingCodesJson ? JSON.parse(data.billingCodesJson) : undefined,
    };
    
    // Remove the JSON string fields
    delete (visitData as any).vitalsJson;
    delete (visitData as any).ordersJson;
    delete (visitData as any).billingCodesJson;
    
    onSubmit(visitData);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Basic Visit Info */}
      <Card>
        <CardHeader>
          <CardTitle>Visit Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="visitDate">Visit Date *</Label>
              <Input
                id="visitDate"
                type="date"
                {...form.register("visitDate")}
                data-testid="input-visit-date"
              />
              {form.formState.errors.visitDate && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.visitDate.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="visitType">Visit Type *</Label>
              <Select
                value={form.watch("visitType")}
                onValueChange={(value) => form.setValue("visitType", value)}
              >
                <SelectTrigger data-testid="select-visit-type">
                  <SelectValue placeholder="Select visit type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_patient">New Patient</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                  <SelectItem value="wound_care">Wound Care</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.visitType && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.visitType.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="chiefComplaint">Chief Complaint</Label>
            <Textarea
              id="chiefComplaint"
              rows={2}
              placeholder="Patient's main concern or reason for visit..."
              {...form.register("chiefComplaint")}
              data-testid="textarea-chief-complaint"
            />
          </div>
        </CardContent>
      </Card>

      {/* SOAP Notes Tabs */}
      <Tabs defaultValue="soap" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="soap">SOAP Notes</TabsTrigger>
          <TabsTrigger value="vitals">Vitals</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="soap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SOAP Documentation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="subjective">Subjective</Label>
                <Textarea
                  id="subjective"
                  rows={4}
                  placeholder="Patient's description of symptoms, history, concerns..."
                  {...form.register("subjective")}
                  data-testid="textarea-subjective"
                />
              </div>

              <div>
                <Label htmlFor="objective">Objective</Label>
                <Textarea
                  id="objective"
                  rows={4}
                  placeholder="Physical examination findings, vital signs, test results..."
                  {...form.register("objective")}
                  data-testid="textarea-objective"
                />
              </div>

              <div>
                <Label htmlFor="assessment">Assessment</Label>
                <Textarea
                  id="assessment"
                  rows={3}
                  placeholder="Clinical assessment, diagnosis, clinical impression..."
                  {...form.register("assessment")}
                  data-testid="textarea-assessment"
                />
              </div>

              <div>
                <Label htmlFor="plan">Plan</Label>
                <Textarea
                  id="plan"
                  rows={4}
                  placeholder="Treatment plan, medications, follow-up instructions..."
                  {...form.register("plan")}
                  data-testid="textarea-plan"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vitals">
          <Card>
            <CardHeader>
              <CardTitle>Vital Signs</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="vitalsJson">Vitals (JSON Format)</Label>
                <Textarea
                  id="vitalsJson"
                  rows={6}
                  placeholder='{"bloodPressure": "120/80", "heartRate": "72", "temperature": "98.6", "respiratoryRate": "16", "oxygenSaturation": "98%", "height": "170cm", "weight": "70kg", "bmi": "24.2"}'
                  {...form.register("vitalsJson")}
                  data-testid="textarea-vitals"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter vitals in JSON format. Example structure shown in placeholder.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Orders & Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="ordersJson">Orders (JSON Array)</Label>
                <Textarea
                  id="ordersJson"
                  rows={6}
                  placeholder='["Dressing change daily with normal saline", "Apply silver sulfadiazine cream", "Offload pressure with heel elevation", "Follow-up in 1 week", "Patient education on wound care"]'
                  {...form.register("ordersJson")}
                  data-testid="textarea-orders"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter orders as a JSON array of strings.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="billingCodesJson">Billing Codes (JSON Array)</Label>
                <Textarea
                  id="billingCodesJson"
                  rows={3}
                  placeholder='["99213", "97597", "A6196", "A6197"]'
                  {...form.register("billingCodesJson")}
                  data-testid="textarea-billing-codes"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter CPT/billing codes as a JSON array.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="totalAmount">Total Amount (SAR)</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...form.register("totalAmount", { valueAsNumber: true })}
                    data-testid="input-total-amount"
                  />
                </div>
                <div>
                  <Label htmlFor="insuranceCovered">Insurance Covered (SAR)</Label>
                  <Input
                    id="insuranceCovered"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...form.register("insuranceCovered", { valueAsNumber: true })}
                    data-testid="input-insurance-covered"
                  />
                </div>
                <div>
                  <Label htmlFor="patientPay">Patient Pay (SAR)</Label>
                  <Input
                    id="patientPay"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...form.register("patientPay", { valueAsNumber: true })}
                    data-testid="input-patient-pay"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Submit Button */}
      <div className="flex justify-end space-x-3">
        <Button type="submit" disabled={isLoading} data-testid="button-save-visit">
          {isLoading ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Saving...
            </>
          ) : (
            <>
              <i className="fas fa-save mr-2"></i>
              Save Visit Note
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
