import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";

export default function AuditLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data: auditLogs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/audit-logs"],
  });

  const filteredLogs = auditLogs.filter((log: any) => {
    const matchesSearch = !searchQuery || 
      log.user?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesEntity = entityFilter === "all" || log.entityType === entityFilter;
    
    return matchesSearch && matchesAction && matchesEntity;
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-green-100 text-green-700';
      case 'read': return 'bg-blue-100 text-blue-700';
      case 'update': return 'bg-yellow-100 text-yellow-700';
      case 'delete': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getEntityColor = (entityType: string) => {
    switch (entityType) {
      case 'patient': return 'bg-blue-100 text-blue-700';
      case 'appointment': return 'bg-green-100 text-green-700';
      case 'wound': return 'bg-orange-100 text-orange-700';
      case 'wound_assessment': return 'bg-purple-100 text-purple-700';
      case 'visit': return 'bg-teal-100 text-teal-700';
      case 'treatment_plan': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const entityTypes = [...new Set(auditLogs.map((log: any) => log.entityType).filter(type => type != null))];
  const actions = ['create', 'read', 'update', 'delete'];

  return (
    <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card shadow-sm border-b border-border px-6 py-4">
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
                  Audit Logs
                </h2>
                <p className="text-sm text-muted-foreground">
                  Track all system activities and data modifications with Woundence
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                <i className="fas fa-shield-alt mr-1"></i>
                HIPAA Compliant
              </Badge>
              <Badge variant="outline" className="text-xs">
                Total: {auditLogs.length} entries
              </Badge>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="border-b border-border p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Search by user, entity ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-logs"
              />
            </div>
            <div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger data-testid="select-action-filter">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actions.map(action => (
                    <SelectItem key={action} value={action}>
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger data-testid="select-entity-filter">
                  <SelectValue placeholder="Filter by entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {entityTypes.map(entity => (
                    <SelectItem key={entity} value={entity}>
                      {entity.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery("");
                  setActionFilter("all");
                  setEntityFilter("all");
                }}
                data-testid="button-clear-filters"
              >
                <i className="fas fa-times mr-2"></i>
                Clear Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-muted rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-muted rounded w-1/3"></div>
                        <div className="h-2 bg-muted rounded w-1/2"></div>
                      </div>
                      <div className="w-16 h-6 bg-muted rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-shield-alt text-4xl text-muted-foreground mb-4"></i>
              <p className="text-lg font-medium text-foreground">No Audit Logs Found</p>
              <p className="text-muted-foreground mb-6">
                {searchQuery || actionFilter !== "all" || entityFilter !== "all" 
                  ? "Try adjusting your search criteria" 
                  : "System activities will appear here"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log: any, index: number) => (
                <Card 
                  key={log.id}
                  className="hover:shadow-sm transition-shadow cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                  data-testid={`audit-log-${index}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-medium text-sm">
                          {log.user?.firstName?.charAt(0)}{log.user?.lastName?.charAt(0)}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge className={getActionColor(log.action || '')}>
                            {(log.action || 'unknown').toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className={getEntityColor(log.entityType || '')}>
                            {(log.entityType || 'unknown').replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-foreground truncate">
                          <span className="font-medium">
                            {log.user?.firstName} {log.user?.lastName}
                          </span>
                          {' '}performed{' '}
                          <span className="font-medium">{log.action || 'unknown'}</span>
                          {' '}on{' '}
                          <span className="font-medium">{(log.entityType || 'unknown').replace('_', ' ')}</span>
                          {' '}
                          <span className="text-muted-foreground">({log.entityId || 'N/A'})</span>
                        </p>
                        
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-muted-foreground">
                            <i className="fas fa-clock mr-1"></i>
                            {format(new Date(log.timestamp), 'MMM d, yyyy • h:mm a')}
                          </span>
                          {log.ipAddress && (
                            <span className="text-xs text-muted-foreground">
                              <i className="fas fa-map-marker-alt mr-1"></i>
                              {log.ipAddress}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <Button variant="ghost" size="sm" className="flex-shrink-0">
                        <i className="fas fa-eye"></i>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Audit Log Details</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedLog.timestamp), 'MMMM d, yyyy • h:mm:ss a')}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={() => setSelectedLog(null)}
                  data-testid="button-close-log-details"
                >
                  <i className="fas fa-times"></i>
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Action Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">User</label>
                      <p className="text-foreground">
                        {selectedLog.user?.firstName} {selectedLog.user?.lastName}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Action</label>
                      <p className="text-foreground">
                        <Badge className={getActionColor(selectedLog.action)}>
                          {selectedLog.action.toUpperCase()}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Entity Type</label>
                      <p className="text-foreground">
                        <Badge variant="outline" className={getEntityColor(selectedLog.entityType)}>
                          {selectedLog.entityType.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Entity ID</label>
                      <p className="text-foreground font-mono text-sm">{selectedLog.entityId}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                      <p className="text-foreground">{selectedLog.ipAddress || 'Not recorded'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                      <p className="text-foreground">
                        {format(new Date(selectedLog.timestamp), 'MMMM d, yyyy • h:mm:ss a')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* User Agent */}
              {selectedLog.userAgent && (
                <Card>
                  <CardHeader>
                    <CardTitle>User Agent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground font-mono break-all">
                      {selectedLog.userAgent}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Old Values */}
              {selectedLog.oldValues && (
                <Card>
                  <CardHeader>
                    <CardTitle>Previous Values</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm text-foreground bg-muted p-4 rounded overflow-x-auto">
                      {JSON.stringify(selectedLog.oldValues, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* New Values */}
              {selectedLog.newValues && (
                <Card>
                  <CardHeader>
                    <CardTitle>New Values</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm text-foreground bg-muted p-4 rounded overflow-x-auto">
                      {JSON.stringify(selectedLog.newValues, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
