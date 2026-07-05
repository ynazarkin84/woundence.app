import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAppointmentSchema } from "@/types/schema";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

const appointmentFormSchema = insertAppointmentSchema.extend({
  appointmentDate: z.string().min(1, "Appointment date and time is required"),
});

type AppointmentFormData = z.infer<typeof appointmentFormSchema>;

interface AppointmentFormProps {
  onSubmit: (data: AppointmentFormData) => void;
  isLoading?: boolean;
  defaultDate?: Date;
  initialData?: Partial<AppointmentFormData>;
}

export default function AppointmentForm({ 
  onSubmit, 
  isLoading, 
  defaultDate,
  initialData 
}: AppointmentFormProps) {
  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patientId: "",
      providerId: "",
      appointmentDate: defaultDate ? format(defaultDate, "yyyy-MM-dd'T'HH:mm") : "",
      duration: 30,
      room: "",
      appointmentType: "",
      status: "scheduled",
      notes: "",
      ...initialData,
    },
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["/api/patients"],
  });

  const { data: providers = [] } = useQuery({
    queryKey: ["/api/providers"],
  });

  const handleSubmit = (data: AppointmentFormData) => {
    // Convert the datetime-local string to ISO string
    const appointmentData = {
      ...data,
      appointmentDate: new Date(data.appointmentDate).toISOString(),
    };
    onSubmit(appointmentData);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="patientId">Patient *</Label>
          <Select
            value={form.watch("patientId")}
            onValueChange={(value) => form.setValue("patientId", value)}
          >
            <SelectTrigger data-testid="select-patient">
              <SelectValue placeholder="Select patient" />
            </SelectTrigger>
            <SelectContent>
              {(patients as any[]).map((patient: any) => (
                <SelectItem key={patient.id} value={patient.id}>
                  {patient.firstName} {patient.lastName} ({patient.patientId})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.patientId && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.patientId.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="providerId">Provider *</Label>
          <Select
            value={form.watch("providerId")}
            onValueChange={(value) => form.setValue("providerId", value)}
          >
            <SelectTrigger data-testid="select-provider">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {(providers as any[]).map((provider: any) => (
                <SelectItem key={provider.id} value={provider.id}>
                  Dr. {provider.firstName} {provider.lastName}
                  {provider.specialty && <span className="text-muted-foreground ml-2">({provider.specialty})</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.providerId && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.providerId.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="appointmentType">Appointment Type *</Label>
          <Select
            value={form.watch("appointmentType")}
            onValueChange={(value) => form.setValue("appointmentType", value)}
          >
            <SelectTrigger data-testid="select-appointment-type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new_patient">New Patient</SelectItem>
              <SelectItem value="follow_up">Follow-up</SelectItem>
              <SelectItem value="wound_assessment">Wound Assessment</SelectItem>
              <SelectItem value="debridement">Debridement</SelectItem>
              <SelectItem value="dressing_change">Dressing Change</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.appointmentType && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.appointmentType.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="appointmentDate">Date & Time *</Label>
          <Input
            id="appointmentDate"
            type="datetime-local"
            {...form.register("appointmentDate")}
            data-testid="input-appointment-date"
          />
          {form.formState.errors.appointmentDate && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.appointmentDate.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Select
            value={form.watch("duration")?.toString()}
            onValueChange={(value) => form.setValue("duration", parseInt(value))}
          >
            <SelectTrigger data-testid="select-duration">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="45">45 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="90">1.5 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="room">Room</Label>
          <Input
            id="room"
            placeholder="e.g., Room 101"
            {...form.register("room")}
            data-testid="input-room"
          />
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            value={form.watch("status")}
            onValueChange={(value) => form.setValue("status", value)}
          >
            <SelectTrigger data-testid="select-status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="arrived">Arrived</SelectItem>
              <SelectItem value="in_room">In Room</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="no_show">No Show</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Add any appointment notes..."
          {...form.register("notes")}
          data-testid="textarea-notes"
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="submit" disabled={isLoading} data-testid="button-save-appointment">
          {isLoading ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Saving...
            </>
          ) : (
            <>
              <i className="fas fa-save mr-2"></i>
              Schedule Appointment
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
