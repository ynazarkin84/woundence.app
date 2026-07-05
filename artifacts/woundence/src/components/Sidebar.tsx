import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { useClerk } from "@clerk/react";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import woundenceLogo from "../assets/woundence-logo-icon.png";

export default function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { signOut } = useClerk();
  const { isMobile, setOpenMobile } = useSidebar();

  // Close mobile sidebar when location changes
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location, isMobile, setOpenMobile]);

  const navigation = [
    { name: "Dashboard", href: "/", icon: "fas fa-tachometer-alt" },
    { name: "Patients", href: "/patients", icon: "fas fa-users" },
    { name: "Appointments", href: "/appointments", icon: "fas fa-calendar-alt" },
    { name: "Wound Imaging", href: "/wound-imaging", icon: "fas fa-camera-retro" },
    { name: "Treatment Plans", href: "/treatment-plans", icon: "fas fa-clipboard-list" },
    { name: "Visit Notes", href: "/visit-notes", icon: "fas fa-file-medical" },
    { name: "Insurance", href: "/insurance", icon: "fas fa-credit-card" },
    { name: "Audit Logs", href: "/audit-logs", icon: "fas fa-shield-alt" },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center space-x-3 px-3 py-2">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-white flex items-center justify-center shadow-sm">
            <img 
              src={woundenceLogo} 
              alt="Woundence Logo" 
              className="w-10 h-10 object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-sidebar-foreground bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Woundence
            </h1>
            <p className="text-sm text-muted-foreground">Advanced Wound Care</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarMenu>
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive} data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}>
                  <Link href={item.href}>
                    <i className={`${item.icon} w-4 h-4`}></i>
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      
      <SidebarFooter>
        <div className="flex items-center space-x-3 px-3 py-2">
          <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
            <i className="fas fa-user-md text-secondary-foreground text-sm"></i>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-sidebar-foreground">
              {user?.firstName || "Dr."} {user?.lastName || "Provider"}
            </p>
            <p className="text-xs text-muted-foreground">
              {user?.specialty || "Wound Specialist"}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground hover:text-sidebar-foreground"
            onClick={() => signOut({ redirectUrl: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" })}
            data-testid="button-logout"
          >
            <i className="fas fa-cog"></i>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
