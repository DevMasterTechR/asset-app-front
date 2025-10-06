import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export interface UserAssignment {
  userId: string;
  userName: string;
  email: string;
  department: string;
  devices: {
    type: string;
    model: string;
  }[];
}

interface UserAssignmentsTableProps {
  assignments: UserAssignment[];
}

export const UserAssignmentsTable = ({ assignments }: UserAssignmentsTableProps) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuario</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead>Dispositivos Asignados</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map((assignment) => (
            <TableRow key={assignment.userId}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(assignment.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{assignment.userName}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{assignment.email}</TableCell>
              <TableCell>
                <Badge variant="outline">{assignment.department}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {assignment.devices.length > 0 ? (
                    assignment.devices.map((device, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {device.type}: {device.model}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">Sin dispositivos</span>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
