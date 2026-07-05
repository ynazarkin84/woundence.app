import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInsuranceRuleSchema } from "@/types/schema";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";

const insuranceRuleFormSchema = insertInsuranceRuleSchema;
type InsuranceRuleFormData = z.infer<typeof insuranceRuleFormSchema>;

export default function Insurance() {
  const [isNewRuleOpen, setIsNewRuleOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: insuranceRules = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/insurance/rules"],
  });

  const createRuleMutation = useMutation({
    mutationFn: (ruleData: InsuranceRuleFormData) =>
      fetch("/api/insurance/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ruleData),
        credentials: "include",
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insurance/rules"] });
      setIsNewRuleOpen(false);
      toast({
        title: "Success",
        description: "Insurance rule created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create insurance rule",
        variant: "destructive",
      });
    },
  });

  const form = useForm<InsuranceRuleFormData>({
    resolver: zodResolver(insuranceRuleFormSchema),
    defaultValues: {
      providerName: "",
      class: "",
      coveragePercentage: 80,
      standardDressingCovered: true,
      advancedDressingCovered: false,
      maxVisitsPerMonth: undefined,
      deductible: undefined,
      copay: undefined,
      isActive: true,
    },
  });

  const handleSubmit = (data: InsuranceRuleFormData) => {
    createRuleMutation.mutate(data);
  };

  const filteredRules = searchQuery.length > 0 
    ? insuranceRules.filter((rule: any) => 
        rule.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.class.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : insuranceRules;

  const getClassColor = (insuranceClass: string) => {
    switch (insuranceClass) {
      case 'A': return 'bg-green-100 text-green-700';
      case 'B': return 'bg-yellow-100 text-yellow-700';
      case 'C': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card shadow-sm border-b border-border px-6 py-4 bg-gradient-to-r from-background via-accent/30 to-background">
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
                  Insurance Management
                </h2>
                <p className="text-sm text-muted-foreground">
                  Manage insurance providers, coverage rules, and billing policies with Woundence
                </p>
              </div>
            </div>
            <Dialog open={isNewRuleOpen} onOpenChange={setIsNewRuleOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-insurance-rule">
                  <i className="fas fa-plus mr-2"></i>
                  New Insurance Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Insurance Rule</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="providerName">Provider Name *</Label>
                      <Input
                        id="providerName"
                        placeholder="e.g., Tuwaniya, Bupa Arabia"
                        {...form.register("providerName")}
                        data-testid="input-provider-name"
                      />
                      {form.formState.errors.providerName && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.providerName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="class">Insurance Class *</Label>
                      <Select
                        value={form.watch("class")}
                        onValueChange={(value) => form.setValue("class", value)}
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
                      {form.formState.errors.class && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.class.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="coveragePercentage">Coverage Percentage *</Label>
                      <Input
                        id="coveragePercentage"
                        type="number"
                        min="0"
                        max="100"
                        {...form.register("coveragePercentage", { valueAsNumber: true })}
                        data-testid="input-coverage-percentage"
                      />
                      {form.formState.errors.coveragePercentage && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.coveragePercentage.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="maxVisitsPerMonth">Max Visits Per Month</Label>
                      <Input
                        id="maxVisitsPerMonth"
                        type="number"
                        min="1"
                        {...form.register("maxVisitsPerMonth", { valueAsNumber: true })}
                        data-testid="input-max-visits"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="deductible">Deductible (SAR)</Label>
                      <Input
                        id="deductible"
                        type="number"
                        step="0.01"
                        {...form.register("deductible", { valueAsNumber: true })}
                        data-testid="input-deductible"
                      />
                    </div>
                    <div>
                      <Label htmlFor="copay">Copay (SAR)</Label>
                      <Input
                        id="copay"
                        type="number"
                        step="0.01"
                        {...form.register("copay", { valueAsNumber: true })}
                        data-testid="input-copay"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="standardDressingCovered">Standard Dressing Covered</Label>
                      <Switch
                        id="standardDressingCovered"
                        checked={form.watch("standardDressingCovered")}
                        onCheckedChange={(checked) => form.setValue("standardDressingCovered", checked)}
                        data-testid="switch-standard-dressing"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="advancedDressingCovered">Advanced Dressing Covered</Label>
                      <Switch
                        id="advancedDressingCovered"
                        checked={form.watch("advancedDressingCovered")}
                        onCheckedChange={(checked) => form.setValue("advancedDressingCovered", checked)}
                        data-testid="switch-advanced-dressing"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="isActive">Active</Label>
                      <Switch
                        id="isActive"
                        checked={form.watch("isActive")}
                        onCheckedChange={(checked) => form.setValue("isActive", checked)}
                        data-testid="switch-active"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsNewRuleOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createRuleMutation.isPending}
                      data-testid="button-save-rule"
                    >
                      {createRuleMutation.isPending ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Saving...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save mr-2"></i>
                          Save Rule
                        </>
                      )}
                    </Button>
                  </div>
                </form>
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
                  placeholder="Search insurance providers or classes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-insurance"
                />
                <i className="fas fa-search absolute left-3 top-2.5 text-muted-foreground"></i>
              </div>
            </CardContent>
          </Card>

          {/* Insurance Rules */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-credit-card text-4xl text-muted-foreground mb-4"></i>
              <p className="text-lg font-medium text-foreground">No Insurance Rules Found</p>
              <p className="text-muted-foreground mb-6">
                {searchQuery ? "Try adjusting your search criteria" : "Create your first insurance rule to get started"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsNewRuleOpen(true)}>
                  <i className="fas fa-plus mr-2"></i>
                  Create First Rule
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRules.map((rule: any, index: number) => (
                <Card 
                  key={rule.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedRule(rule)}
                  data-testid={`insurance-rule-${index}`}
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">{rule.providerName}</h3>
                        <Badge className={getClassColor(rule.class)}>
                          Class {rule.class}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Coverage:</span>
                          <span className="font-medium text-foreground">{rule.coveragePercentage}%</span>
                        </div>
                        {rule.maxVisitsPerMonth && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Max Visits/Month:</span>
                            <span className="font-medium text-foreground">{rule.maxVisitsPerMonth}</span>
                          </div>
                        )}
                        {rule.deductible && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Deductible:</span>
                            <span className="font-medium text-foreground">SAR {rule.deductible}</span>
                          </div>
                        )}
                        {rule.copay && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Copay:</span>
                            <span className="font-medium text-foreground">SAR {rule.copay}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Standard Dressing:</span>
                          <Badge variant={rule.standardDressingCovered ? "default" : "secondary"}>
                            {rule.standardDressingCovered ? "Covered" : "Not Covered"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Advanced Dressing:</span>
                          <Badge variant={rule.advancedDressingCovered ? "default" : "secondary"}>
                            {rule.advancedDressingCovered ? "Covered" : "Not Covered"}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge variant={rule.isActive ? "default" : "secondary"}>
                          {rule.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <i className="fas fa-eye"></i>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Rule Details Modal */}
          {selectedRule && (
            <Dialog open={!!selectedRule} onOpenChange={() => setSelectedRule(null)}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {selectedRule.providerName} - Class {selectedRule.class}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Provider Name</label>
                      <p className="text-foreground">{selectedRule.providerName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Class</label>
                      <p className="text-foreground">
                        <Badge className={getClassColor(selectedRule.class)}>
                          Class {selectedRule.class}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Coverage Percentage</label>
                      <p className="text-foreground">{selectedRule.coveragePercentage}%</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <p className="text-foreground">
                        <Badge variant={selectedRule.isActive ? "default" : "secondary"}>
                          {selectedRule.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </p>
                    </div>
                  </div>

                  {(selectedRule.maxVisitsPerMonth || selectedRule.deductible || selectedRule.copay) && (
                    <div className="grid grid-cols-3 gap-4">
                      {selectedRule.maxVisitsPerMonth && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Max Visits/Month</label>
                          <p className="text-foreground">{selectedRule.maxVisitsPerMonth}</p>
                        </div>
                      )}
                      {selectedRule.deductible && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Deductible</label>
                          <p className="text-foreground">SAR {selectedRule.deductible}</p>
                        </div>
                      )}
                      {selectedRule.copay && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Copay</label>
                          <p className="text-foreground">SAR {selectedRule.copay}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Coverage Details</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-muted rounded">
                        <span className="text-foreground">Standard Dressing</span>
                        <Badge variant={selectedRule.standardDressingCovered ? "default" : "secondary"}>
                          {selectedRule.standardDressingCovered ? "Covered" : "Not Covered"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted rounded">
                        <span className="text-foreground">Advanced Dressing</span>
                        <Badge variant={selectedRule.advancedDressingCovered ? "default" : "secondary"}>
                          {selectedRule.advancedDressingCovered ? "Covered" : "Not Covered"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </main>
    </div>
  );
}
