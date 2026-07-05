import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema } from "@/types/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const patientFormSchema = insertPatientSchema.extend({
  dateOfBirth: z.string().min(1, "Date of birth is required"),
});

type PatientFormData = z.infer<typeof patientFormSchema>;

interface PatientFormProps {
  onSubmit: (data: PatientFormData) => void;
  isLoading?: boolean;
  initialData?: Partial<PatientFormData>;
}

export default function PatientForm({ onSubmit, isLoading, initialData }: PatientFormProps) {
  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "",
      phone: "",
      email: "",
      address: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      allergies: "",
      comorbidities: "",
      medications: "",
      insuranceProvider: "",
      insuranceClass: "",
      insuranceMemberId: "",
      problemList: "",
      ...initialData,
    },
  });

  const handleSubmit = (data: PatientFormData) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                {...form.register("firstName")}
                data-testid="input-first-name"
              />
              {form.formState.errors.firstName && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.firstName.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                {...form.register("lastName")}
                data-testid="input-last-name"
              />
              {form.formState.errors.lastName && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <Input
                id="dateOfBirth"
                type="date"
                {...form.register("dateOfBirth")}
                data-testid="input-date-of-birth"
              />
              {form.formState.errors.dateOfBirth && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.dateOfBirth.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="gender">Gender *</Label>
              <Select
                value={form.watch("gender")}
                onValueChange={(value) => form.setValue("gender", value)}
              >
                <SelectTrigger data-testid="select-gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.gender && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.gender.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...form.register("phone")}
                data-testid="input-phone"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                data-testid="input-email"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              {...form.register("address")}
              data-testid="textarea-address"
            />
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="emergencyContactName">Contact Name</Label>
              <Input
                id="emergencyContactName"
                {...form.register("emergencyContactName")}
                data-testid="input-emergency-contact-name"
              />
            </div>
            <div>
              <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
              <Input
                id="emergencyContactPhone"
                {...form.register("emergencyContactPhone")}
                data-testid="input-emergency-contact-phone"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medical Information */}
      <Card>
        <CardHeader>
          <CardTitle>Medical Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="allergies">Allergies</Label>
            <Textarea
              id="allergies"
              placeholder="List any known allergies..."
              {...form.register("allergies")}
              data-testid="textarea-allergies"
            />
          </div>
          <div>
            <Label htmlFor="comorbidities">Comorbidities</Label>
            <Textarea
              id="comorbidities"
              placeholder="List any existing medical conditions (e.g., diabetes, hypertension)..."
              {...form.register("comorbidities")}
              data-testid="textarea-comorbidities"
            />
          </div>
          <div>
            <Label htmlFor="medications">Current Medications</Label>
            <Textarea
              id="medications"
              placeholder="List current medications and dosages..."
              {...form.register("medications")}
              data-testid="textarea-medications"
            />
          </div>
          <div>
            <Label htmlFor="problemList">Problem List (ICD-10 Codes)</Label>
            <Textarea
              id="problemList"
              placeholder="List ICD-10 codes for current problems..."
              {...form.register("problemList")}
              data-testid="textarea-problem-list"
            />
          </div>
        </CardContent>
      </Card>

      {/* Insurance Information */}
      <Card>
        <CardHeader>
          <CardTitle>Insurance Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="insuranceProvider">Insurance Provider</Label>
              <Input
                id="insuranceProvider"
                placeholder="e.g., Tuwaniya, Bupa Arabia"
                {...form.register("insuranceProvider")}
                data-testid="input-insurance-provider"
              />
            </div>
            <div>
              <Label htmlFor="insuranceClass">Insurance Class</Label>
              <Select
                value={form.watch("insuranceClass") || ""}
                onValueChange={(value) => form.setValue("insuranceClass", value)}
              >
                <SelectTrigger data-testid="select-insurance-class">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Class A (Premium)</SelectItem>
                  <SelectItem value="B">Class B (Standard)</SelectItem>
                  <SelectItem value="C">Class C (Basic)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="insuranceMemberId">Member ID</Label>
            <Input
              id="insuranceMemberId"
              {...form.register("insuranceMemberId")}
              data-testid="input-insurance-member-id"
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end space-x-3">
        <Button type="submit" disabled={isLoading} data-testid="button-save-patient">
          {isLoading ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Saving...
            </>
          ) : (
            <>
              <i className="fas fa-save mr-2"></i>
              Save Patient
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
