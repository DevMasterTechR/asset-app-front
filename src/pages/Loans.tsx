import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Package, Eye, Trash2, PackageCheck } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { loansApi, type CreateLoanDto } from "@/api/loans";
import { peopleApi } from "@/api/people";
import { devicesApi } from "@/api/devices";
import { getBranches } from "@/api/catalogs";
import { sortAssetsByName, sortBranchesByName, sortByString } from "@/lib/sort";
import { extractArray } from "@/lib/extractData";
import { useToast } from "@/hooks/use-toast";
import LoanFormModal from "@/components/LoanFormModal";
import ReturnLoanModal from "@/components/ReturnLoanModal";
import Pagination, { DEFAULT_PAGE_SIZE } from "@/components/Pagination";

const conditionVariantMap = {
  excellent: "success" as const,
  good: "default" as const,
  fair: "warning" as const,
  poor: "destructive" as const,
};

const conditionLabelMap = {
  excellent: "Excelente",
  good: "Bueno",
  fair: "Regular",
  poor: "Malo",
};

export default function Loans() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [loans, setLoans] = useState<any[]>([]);
  const [assets, setAssets] = useState<
    Array<{ id: string; code: string; name: string; assetCode?: string }>
  >([]);
  const [people, setPeople] = useState<
    Array<{ id: string; firstName: string; lastName: string }>
  >([]);
  const [branches, setBranches] = useState<Array<{ id: number; name: string }>>(
    []
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [loanToReturn, setLoanToReturn] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [viewMode, setViewMode] = useState<"active" | "history">("active");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoan, setDetailsLoan] = useState<any | null>(null);

  useEffect(() => {
    loadLoans();
  }, []);

  const loadLoans = async () => {
    try {
      setLoading(true);
      const [loanData, peopleList, assetList, branchList] = await Promise.all([
        loansApi.getAll(),
        peopleApi.getAll(undefined, 999999),
        devicesApi.getAll(),
        getBranches(),
      ]);

      const loanArray = extractArray<any>(loanData);
      const peopleArray = extractArray<any>(peopleList);
      const assetsArray = extractArray<any>(assetList);
      const branchesArray = extractArray<any>(branchList);

      const loansWithoutSecurity = (loanArray || []).filter((l: any) => {
        const assetType =
          l.asset?.assetType ||
          assetsArray.find((x: any) => String(x.id) === String(l.assetId))
            ?.assetType;
        return assetType !== "security";
      });

      setLoans(loansWithoutSecurity);
      setPeople(
        sortByString(
          (peopleArray || []).map((p: any) => ({
            id: String(p.id),
            firstName: p.firstName,
            lastName: p.lastName,
          })),
          (p: any) => `${p.firstName || ""} ${p.lastName || ""}`.trim()
        )
      );
      setAssets(
        sortAssetsByName(
          (assetsArray || [])
            .filter(
              (a: any) =>
                (a.status || "").toString() === "available" &&
                a.assetType !== "security"
            )
            .map((a: any) => ({
              id: String(a.id),
              code: a.assetCode || a.assetCode,
              name: `${a.brand || ""} ${a.model || ""}`.trim(),
              assetCode: a.assetCode,
            }))
        )
      );
      setBranches(
        sortBranchesByName(
          (branchesArray || []).map((b: any) => ({ id: Number(b.id), name: b.name }))
        )
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los préstamos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar activos (sin devolución) e historial (con devolución)
  const activeLoan = loans.filter((l) => !l.returnDate);
  const historyLoans = loans.filter((l) => l.returnDate);

  // Filtrar búsqueda
  const filteredActive = activeLoan.filter((loan) => {
    const searchLower = searchTerm.toLowerCase();
    const assetCode = loan.asset?.assetCode || "";
    const assetName = `${loan.asset?.brand || ""} ${loan.asset?.model || ""}`
      .toLowerCase()
      .trim();
    const personName =
      `${loan.person?.firstName || ""} ${loan.person?.lastName || ""}`
        .toLowerCase()
        .trim();

    return (
      assetCode.toLowerCase().includes(searchLower) ||
      assetName.includes(searchLower) ||
      personName.includes(searchLower)
    );
  });

  const filteredHistory = historyLoans.filter((loan) => {
    const searchLower = searchTerm.toLowerCase();
    const assetCode = loan.asset?.assetCode || "";
    const assetName = `${loan.asset?.brand || ""} ${loan.asset?.model || ""}`
      .toLowerCase()
      .trim();
    const personName =
      `${loan.person?.firstName || ""} ${loan.person?.lastName || ""}`
        .toLowerCase()
        .trim();

    return (
      assetCode.toLowerCase().includes(searchLower) ||
      assetName.includes(searchLower) ||
      personName.includes(searchLower)
    );
  });

  // Paginación
  const paginatedActive = filteredActive.slice(
    (currentPage - 1) * DEFAULT_PAGE_SIZE,
    currentPage * DEFAULT_PAGE_SIZE
  );

  const paginatedHistory = filteredHistory.slice(
    (historyPage - 1) * DEFAULT_PAGE_SIZE,
    historyPage * DEFAULT_PAGE_SIZE
  );

  // Abrir detalles
  const openDetails = async (loan: any) => {
    let asset = loan.asset;
    if (!asset && loan.assetId) {
      try {
        asset = await devicesApi.getById(parseInt(loan.assetId));
      } catch {}
    }
    const details = {
      ...loan,
      assetCode: asset?.assetCode || asset?.code || "-",
      brand: asset?.brand || "-",
      model: asset?.model || "-",
      type: asset?.assetType || "-",
    };
    setDetailsLoan(details);
    setDetailsOpen(true);
  };

  const handleCreateLoan = async (data: CreateLoanDto) => {
    try {
      await loansApi.create(data);
      await loadLoans();
      toast({
        title: "Éxito",
        description: "Préstamo creado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo crear el préstamo",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleReturn = async (
    returnCondition: string,
    returnNotes?: string
  ) => {
    if (!loanToReturn) return;
    try {
      await loansApi.update(loanToReturn, {
        returnDate: new Date().toISOString(),
        returnCondition: returnCondition as any,
        returnNotes,
      });

      setLoans((prev) =>
        prev.map((l) =>
          String(l.id) === loanToReturn
            ? {
                ...l,
                returnDate: new Date().toISOString(),
                returnCondition,
                returnNotes,
              }
            : l
        )
      );

      toast({
        title: "Éxito",
        description: "Devolución registrada correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar la devolución",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!loanToDelete) return;
    try {
      await loansApi.delete(loanToDelete);
      setLoans((prev) =>
        prev.filter((l) => String(l.id) !== loanToDelete)
      );
      toast({
        title: "Éxito",
        description: "Préstamo eliminado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el préstamo",
        variant: "destructive",
      });
    }
    setDeleteDialogOpen(false);
    setLoanToDelete(null);
  };

  return (
    <Layout>
      <div className="space-y-6 p-6 md:pl-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Préstamos de Equipos</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona y controla los préstamos de equipos
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)} className="gap-2">
            <Plus size={20} />
            Nuevo Préstamo
          </Button>
        </div>

        {/* Search & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, equipo o persona..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                  setHistoryPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-center bg-muted rounded-lg p-4">
              <div className="text-center">
                <p className="text-xl font-bold">{activeLoan.length}</p>
                <p className="text-xs text-muted-foreground">Activos</p>
              </div>
            </div>
            <div className="flex items-center justify-center bg-muted rounded-lg p-4">
              <div className="text-center">
                <p className="text-xl font-bold">{historyLoans.length}</p>
                <p className="text-xs text-muted-foreground">Devueltos</p>
              </div>
            </div>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "active" ? "default" : "outline"}
            onClick={() => setViewMode("active")}
          >
            Activos
          </Button>
          <Button
            variant={viewMode === "history" ? "default" : "outline"}
            onClick={() => setViewMode("history")}
          >
            Historial
          </Button>
        </div>

        {/* Préstamos Activos */}
        {viewMode === "active" && (
          <div className="border rounded-lg bg-card p-4 space-y-4">
            <h2 className="text-lg font-semibold">Préstamos Activos</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Equipo</TableHead>
                  <TableHead>Persona</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Condición</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedActive.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Package size={32} />
                        <p>No hay préstamos activos</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedActive.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-mono text-sm">
                        {loan.asset?.assetCode || "-"}
                      </TableCell>
                      <TableCell>
                        {loan.asset?.brand || ""} {loan.asset?.model || ""}
                      </TableCell>
                      <TableCell>
                        {loan.person?.firstName || ""}{" "}
                        {loan.person?.lastName || ""}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{loan.loanDays} días</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(loan.loanDate), "dd/MM/yyyy", {
                          locale: es,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            conditionVariantMap[
                              loan.deliveryCondition as keyof typeof conditionVariantMap
                            ]
                          }
                        >
                          {
                            conditionLabelMap[
                              loan.deliveryCondition as keyof typeof conditionLabelMap
                            ]
                          }
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDetails(loan)}
                          >
                            <Eye size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setLoanToReturn(String(loan.id));
                              setReturnModalOpen(true);
                            }}
                          >
                            <PackageCheck size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setLoanToDelete(String(loan.id));
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {filteredActive.length > DEFAULT_PAGE_SIZE && (
              <Pagination
                page={currentPage}
                totalPages={Math.ceil(filteredActive.length / DEFAULT_PAGE_SIZE)}
                onPageChange={setCurrentPage}
                limit={DEFAULT_PAGE_SIZE}
              />
            )}
          </div>
        )}

        {/* Historial de Préstamos */}
        {viewMode === "history" && (
          <div className="border rounded-lg bg-card p-4 space-y-4">
            <h2 className="text-lg font-semibold">Historial de Préstamos</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Equipo</TableHead>
                  <TableHead>Persona</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Devolución</TableHead>
                  <TableHead>Condición</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Package size={32} />
                        <p>No hay préstamos devueltos</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedHistory.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-mono text-sm">
                        {loan.asset?.assetCode || "-"}
                      </TableCell>
                      <TableCell>
                        {loan.asset?.brand || ""} {loan.asset?.model || ""}
                      </TableCell>
                      <TableCell>
                        {loan.person?.firstName || ""}{" "}
                        {loan.person?.lastName || ""}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{loan.loanDays} días</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(loan.returnDate), "dd/MM/yyyy", {
                          locale: es,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            conditionVariantMap[
                              loan.returnCondition as keyof typeof conditionVariantMap
                            ] || "default"
                          }
                        >
                          {
                            conditionLabelMap[
                              loan.returnCondition as keyof typeof conditionLabelMap
                            ] || "No especificado"
                          }
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDetails(loan)}
                        >
                          <Eye size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {filteredHistory.length > DEFAULT_PAGE_SIZE && (
              <Pagination
                page={historyPage}
                totalPages={Math.ceil(filteredHistory.length / DEFAULT_PAGE_SIZE)}
                onPageChange={setHistoryPage}
                limit={DEFAULT_PAGE_SIZE}
              />
            )}
          </div>
        )}
      </div>

      <LoanFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateLoan}
        assets={assets}
        people={people}
        branches={branches}
        loading={loading}
      />

      <ReturnLoanModal
        open={returnModalOpen}
        onClose={() => {
          setReturnModalOpen(false);
          setLoanToReturn(null);
        }}
        onSubmit={handleReturn}
        loading={loading}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Préstamo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea eliminar este préstamo? Esta acción no
              se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Detalles */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalles del Préstamo</DialogTitle>
            <DialogDescription>
              Información completa del préstamo de equipo
            </DialogDescription>
          </DialogHeader>

          {detailsLoan && (
            <div className="space-y-4">
              {/* Información del Equipo */}
              <div className="space-y-2 border-b pb-4">
                <h3 className="font-semibold text-sm">Información del Equipo</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Código</p>
                    <p className="font-mono font-semibold">
                      {detailsLoan.assetCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tipo</p>
                    <p className="font-semibold capitalize">{detailsLoan.type}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Modelo</p>
                    <p className="font-semibold">
                      {detailsLoan.brand} {detailsLoan.model}
                    </p>
                  </div>
                </div>
              </div>

              {/* Información del Préstamo */}
              <div className="space-y-2 border-b pb-4">
                <h3 className="font-semibold text-sm">Datos del Préstamo</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Persona</p>
                    <p className="font-semibold">
                      {detailsLoan.person?.firstName}{" "}
                      {detailsLoan.person?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Días</p>
                    <p className="font-semibold">{detailsLoan.loanDays} días</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Inicio</p>
                    <p className="font-semibold">
                      {format(new Date(detailsLoan.loanDate), "dd/MM/yyyy HH:mm", {
                        locale: es,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sucursal</p>
                    <p className="font-semibold">
                      {detailsLoan.branch?.name || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Condición de Entrega */}
              <div className="space-y-2 border-b pb-4">
                <h3 className="font-semibold text-sm">Entrega</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Condición</p>
                    <Badge
                      variant={
                        conditionVariantMap[
                          detailsLoan.deliveryCondition as keyof typeof conditionVariantMap
                        ]
                      }
                      className="mt-1"
                    >
                      {
                        conditionLabelMap[
                          detailsLoan.deliveryCondition as keyof typeof conditionLabelMap
                        ]
                      }
                    </Badge>
                  </div>
                </div>
                {detailsLoan.deliveryNotes && (
                  <div>
                    <p className="text-muted-foreground text-xs">Observaciones</p>
                    <p className="text-sm">{detailsLoan.deliveryNotes}</p>
                  </div>
                )}
              </div>

              {/* Información de Devolución (si existe) */}
              {detailsLoan.returnDate && (
                <div className="space-y-2 bg-muted p-3 rounded">
                  <h3 className="font-semibold text-sm">Devolución</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Fecha</p>
                      <p className="font-semibold">
                        {format(new Date(detailsLoan.returnDate), "dd/MM/yyyy HH:mm", {
                          locale: es,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Condición</p>
                      <Badge
                        variant={
                          conditionVariantMap[
                            detailsLoan.returnCondition as keyof typeof conditionVariantMap
                          ] || "default"
                        }
                        className="mt-1"
                      >
                        {
                          conditionLabelMap[
                            detailsLoan.returnCondition as keyof typeof conditionLabelMap
                          ] || "No especificado"
                        }
                      </Badge>
                    </div>
                  </div>
                  {detailsLoan.returnNotes && (
                    <div>
                      <p className="text-muted-foreground text-xs">Observaciones</p>
                      <p className="text-sm">{detailsLoan.returnNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
