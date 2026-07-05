import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppointmentForm from "@/components/AppointmentForm";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isTomorrow } from "date-fns";
import { ArrowLeft } from "lucide-react";

export default function Appointments() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const { toast } = useToast();

  const { data: providers = [] } = useQuery({
    queryKey: ["/api/providers"],
    queryFn: async () => {
      const res = await fetch("/api/providers", { credentials: "include" });
      if (!res.ok) {
        return []; // Return empty array on error
      }
      const data = await res.json();
      return Array.isArray(data) ? data : []; // Ensure it's an array
    },
  });

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["/api/appointments", format(selectedDate, 'yyyy-MM-dd'), selectedProvider],
    queryFn: () => {
      const url = `/api/appointments?date=${format(selectedDate, 'yyyy-MM-dd')}${selectedProvider && selectedProvider !== 'all' ? `&providerId=${selectedProvider}` : ''}`;
      return fetch(url, { credentials: "include" }).then(res => res.json());
    },
    staleTime: 0, // Consider data stale immediately  
    gcTime: 0, // Don't cache data
    refetchOnMount: true, // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch on window focus
  });

  const createAppointmentMutation = useMutation({
    mutationFn: (appointmentData: any) => 
      fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointmentData),
        credentials: "include",
      }).then(res => res.json()),
    onSuccess: () => {
      // Invalidate all appointment queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      // Also specifically refetch the current query to ensure immediate update
      queryClient.refetchQueries({ 
        queryKey: ["/api/appointments", format(selectedDate, 'yyyy-MM-dd'), selectedProvider]
      });
      setIsNewAppointmentOpen(false);
      toast({
        title: "Success",
        description: "Appointment scheduled successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to schedule appointment",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Success",
        description: "Appointment status updated",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-gray-100 text-gray-600 border border-gray-300';
      case 'arrived': return 'bg-green-100 text-green-700 border border-green-300';
      case 'in_room': return 'bg-blue-100 text-blue-700 border border-blue-300';
      case 'completed': return 'bg-emerald-100 text-emerald-700 border border-emerald-300';
      case 'no_show': return 'bg-red-100 text-red-700 border border-red-300';
      case 'cancelled': return 'bg-gray-100 text-gray-500 border border-gray-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return '?'; // Question mark for booked
      case 'arrived': return '✓'; // Tick for arrived
      case 'in_room': return '→'; // Arrow for in room
      case 'completed': return '✓'; // Tick for completed
      case 'no_show': return 'X'; // X for no show
      case 'cancelled': return '-'; // Dash for cancelled
      default: return '?';
    }
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMMM d');
  };

  // Generate time slots from 8 AM to 6 PM in 30-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 20; hour++) { // Extended to 8:00 PM to show after-hours appointments
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Filter out cancelled appointments for consistent counts
  // Ensure appointments is always an array to prevent crashes
  const appointmentsArray = Array.isArray(appointments) ? appointments : [];
  const activeAppointments = appointmentsArray.filter((apt: any) => apt.status !== 'cancelled');


  // Get appointments for a specific time slot using 30-minute bucketing
  const getAppointmentsForSlot = (timeSlot: string) => {
    const [slotH, slotM] = timeSlot.split(':').map(Number);
    const slotTotal = slotH * 60 + slotM; // Convert slot to total minutes
    
    const matches = activeAppointments.filter((apt: any) => {
      if (!apt.appointmentDate) return false;
      
      const appointmentDate = new Date(apt.appointmentDate);
      if (isNaN(appointmentDate.getTime())) return false;
      
      // Use local time for slot bucketing to match how time slots are generated
      const localMin = appointmentDate.getHours() * 60 + appointmentDate.getMinutes();
      const bucket = Math.floor(localMin / 30) * 30; // Bucket into 30-minute slots
      
      
      return bucket === slotTotal;
    });
    
    return matches;
  };

  const handleTimeSlotClick = (timeSlot: string) => {
    const [hours, minutes] = timeSlot.split(':');
    const appointmentDateTime = new Date(selectedDate);
    appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    setSelectedTimeSlot(format(appointmentDateTime, "yyyy-MM-dd'T'HH:mm"));
    setIsNewAppointmentOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card shadow-sm border-b border-border px-4 sm:px-6 py-4 bg-gradient-to-r from-background via-accent/30 to-background">
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-end lg:justify-between lg:space-y-0 lg:gap-8">
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-end lg:space-y-0 lg:space-x-8">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" data-testid="button-back-dashboard" asChild>
                  <Link href="/">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Link>
                </Button>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                    Appointments
                  </h2>
                  <p className="text-sm text-muted-foreground hidden sm:block">
                    Schedule and manage patient appointments with Woundence
                  </p>
                </div>
              </div>
              
              {/* Provider Selection */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Provider</label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger className="w-full sm:w-64 h-10" data-testid="select-provider">
                    <SelectValue placeholder="All Providers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Providers</SelectItem>
                    {providers.map((provider: any) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        <div className="flex items-center space-x-2">
                          <span>Dr. {provider.firstName} {provider.lastName}</span>
                          {provider.specialty && (
                            <span className="text-xs text-muted-foreground">({provider.specialty})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex-shrink-0">
              <Dialog open={isNewAppointmentOpen} onOpenChange={setIsNewAppointmentOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-appointment" className="shadow-sm h-10 w-full lg:w-auto">
                    <i className="fas fa-calendar-plus mr-2"></i>
                    New Appointment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Schedule New Appointment</DialogTitle>
                  </DialogHeader>
                  <AppointmentForm 
                    defaultDate={selectedTimeSlot ? new Date(selectedTimeSlot) : selectedDate}
                    onSubmit={(data) => createAppointmentMutation.mutate(data)}
                    isLoading={createAppointmentMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto w-full">
          <div className="flex flex-col lg:flex-row h-full">
            {/* Calendar Sidebar */}
            <div className="w-full lg:w-96 lg:border-r border-border p-4 sm:p-6 order-1 lg:order-1">
              <Card>
                <CardHeader>
                  <CardTitle>Calendar</CardTitle>
                </CardHeader>
                <CardContent className="p-2 sm:p-6">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md border w-full max-w-full mx-auto"
                    data-testid="calendar-appointments"
                  />
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="mt-4 lg:mt-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base">
                    {selectedProvider && selectedProvider !== 'all' ? (
                      <>
                        {providers.find((p: any) => p.id === selectedProvider)?.firstName} {providers.find((p: any) => p.id === selectedProvider)?.lastName}'s Schedule
                      </>
                    ) : (
                      'Today\'s Overview'
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Total</span>
                      <span className="font-medium">{activeAppointments.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Scheduled</span>
                      <span className="font-medium">
                        {activeAppointments.filter((apt: any) => apt.status === 'scheduled').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Arrived</span>
                      <span className="font-medium">
                        {activeAppointments.filter((apt: any) => apt.status === 'arrived').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Completed</span>
                      <span className="font-medium">
                        {activeAppointments.filter((apt: any) => apt.status === 'completed').length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Calendar Time Slots */}
            <div className="flex-1 p-4 sm:p-6 order-2 lg:order-2">
              <div className="mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-foreground">
                  {getDateLabel(selectedDate)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {format(selectedDate, 'MMMM d, yyyy')} <span className="hidden sm:inline">- Click on a time slot to schedule an appointment</span>
                </p>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 gap-2">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center border rounded-lg p-3">
                        <div className="w-16 h-4 bg-muted rounded mr-4"></div>
                        <div className="flex-1 h-4 bg-muted rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-[600px] overflow-y-auto">
                  {timeSlots.map((timeSlot) => {
                    const slotAppointments = getAppointmentsForSlot(timeSlot);
                    const isEmpty = slotAppointments.length === 0;
                    
                    return (
                      <div
                        key={timeSlot}
                        className={`border rounded-lg transition-all duration-200 ${
                          isEmpty 
                            ? 'border-border hover:border-primary hover:bg-primary/5 cursor-pointer' 
                            : 'border-primary/20 bg-primary/5'
                        }`}
                        onClick={() => isEmpty && handleTimeSlotClick(timeSlot)}
                        data-testid={`time-slot-${timeSlot}`}
                      >
                        <div className="flex items-center p-3">
                          {/* Time Label */}
                          <div className="w-16 sm:w-20 flex-shrink-0">
                            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                              {format(new Date(`2000-01-01T${timeSlot}`), 'h:mm a')}
                            </span>
                          </div>
                          
                          {/* Slot Content */}
                          <div className="flex-1 min-h-[40px] flex items-center min-w-0">
                            {isEmpty ? (
                              <div className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                                <i className="fas fa-plus mr-2"></i>
                                <span className="hidden sm:inline">Click to add appointment</span>
                                <span className="sm:hidden">Add appointment</span>
                              </div>
                            ) : (
                              <div className="space-y-1 w-full min-w-0">
                                {slotAppointments.map((appointment: any, index: number) => (
                                  <div
                                    key={appointment.id}
                                    className="bg-card rounded border p-1 sm:p-2 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                                    data-testid={`appointment-slot-${timeSlot}-${index}`}
                                  >
                                    <div className="flex items-start justify-between gap-1 min-w-0">
                                      <div className="flex-1 min-w-0 overflow-hidden">
                                        <div className="flex items-center gap-1 mb-0.5 min-w-0">
                                          <span className="font-medium text-foreground text-xs sm:text-sm truncate flex-1 min-w-0">
                                            {appointment.patient?.firstName} {appointment.patient?.lastName}
                                          </span>
                                          <span className={`px-1 py-0 text-xs rounded whitespace-nowrap shrink-0 ${getStatusColor(appointment.status)}`}>
                                            {getStatusIcon(appointment.status)}
                                          </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                          <span className="truncate">
                                            {appointment.appointmentType.replace('_', ' ')} <span className="hidden sm:inline">• {appointment.duration}m</span>
                                          </span>
                                          {appointment.bookingSource === 'external_website' && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 whitespace-nowrap shrink-0" title="Booked from external website">
                                              🌐 Web
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-0.5 flex-shrink-0">
                                        {appointment.status === 'scheduled' && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-xs px-1 py-0 h-4 w-4 min-w-4 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateStatusMutation.mutate({ 
                                                id: appointment.id, 
                                                status: 'arrived' 
                                              });
                                            }}
                                            data-testid={`button-mark-arrived-${timeSlot}-${index}`}
                                            title="Mark patient as arrived"
                                          >
                                            ✓
                                          </Button>
                                        )}
                                        {appointment.status === 'arrived' && (
                                          <>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="text-xs px-1 py-0 h-4 w-4 min-w-4 bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-300"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                updateStatusMutation.mutate({ 
                                                  id: appointment.id, 
                                                  status: 'scheduled' 
                                                });
                                              }}
                                              data-testid={`button-mark-scheduled-${timeSlot}-${index}`}
                                              title="Mark back as scheduled"
                                            >
                                              ←
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="text-xs px-1 py-0 h-4 w-4 min-w-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                updateStatusMutation.mutate({ 
                                                  id: appointment.id, 
                                                  status: 'in_room' 
                                                });
                                              }}
                                              data-testid={`button-mark-in-room-${timeSlot}-${index}`}
                                              title="Move patient to room"
                                            >
                                              →
                                            </Button>
                                          </>
                                        )}
                                        {appointment.status === 'in_room' && (
                                          <Button
                                            size="sm"
                                            className="text-xs px-1 py-0 h-4 w-4 min-w-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateStatusMutation.mutate({ 
                                                id: appointment.id, 
                                                status: 'completed' 
                                              });
                                            }}
                                            data-testid={`button-mark-completed-${timeSlot}-${index}`}
                                            title="Mark appointment as completed"
                                          >
                                            ✓
                                          </Button>
                                        )}
                                        {appointment.status !== 'cancelled' && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-xs px-1 py-0 h-4 w-4 min-w-4 bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateStatusMutation.mutate({ 
                                                id: appointment.id, 
                                                status: 'cancelled' 
                                              });
                                            }}
                                            data-testid={`button-cancel-appointment-${timeSlot}-${index}`}
                                            title="Cancel appointment"
                                          >
                                            ✕
                                          </Button>
                                        )}
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          className="text-xs px-1 py-0 h-4 w-4 min-w-4"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedAppointment(appointment);
                                          }}
                                          data-testid={`button-view-appointment-${timeSlot}-${index}`}
                                        >
                                          <i className="fas fa-eye text-xs"></i>
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
    </div>
  );
}
