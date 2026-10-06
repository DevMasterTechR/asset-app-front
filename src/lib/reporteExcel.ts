// Reporte general en Excel: UNA FILA POR PERSONA, con su código de persona
// (BRYANQ406), sus datos y todos sus equipos repartidos en columnas por tipo
// (laptop, celular, mouse, cargador...). Una segunda hoja trae el detalle de
// cada equipo, uno por fila, para filtrar y ordenar.
//
// exceljs se carga recién al tocar el botón (import dinámico): pesa bastante
// y no tiene sentido que lo descargue cada persona que abre el dashboard.

import { codigoPersona, separarNombre } from '@/lib/nombrePersona';

// Columnas de equipos, en el orden en que se leen en el acta: primero el
// equipo principal y después sus accesorios. Lo que no encaje en ninguna va a
// "Otros", con su tipo delante.
const COLUMNAS_EQUIPO: { titulo: string; tipos: string[] }[] = [
  { titulo: 'Laptop', tipos: ['laptop'] },
  { titulo: 'Escritorio', tipos: ['desktop', 'pc'] },
  { titulo: 'Servidor', tipos: ['server'] },
  { titulo: 'Celular / Tablet', tipos: ['celular', 'tablet'] },
  { titulo: 'Monitor', tipos: ['monitor'] },
  { titulo: 'Mouse', tipos: ['mouse'] },
  { titulo: 'Teclado', tipos: ['teclado'] },
  { titulo: 'Mousepad', tipos: ['mousepad'] },
  { titulo: 'Soporte', tipos: ['soporte'] },
  { titulo: 'Cargador laptop', tipos: ['cargador-laptop'] },
  { titulo: 'Cargador celular', tipos: ['cargador-celular'] },
  { titulo: 'Cable de carga', tipos: ['cable-carga'] },
  { titulo: 'Lector de códigos', tipos: ['lector-codigos'] },
  { titulo: 'HUB', tipos: ['hub'] },
  { titulo: 'Adaptadores', tipos: ['adaptador-memoria', 'adaptador-red'] },
  { titulo: 'Teléfono IP', tipos: ['ip-phone'] },
  { titulo: 'Impresora', tipos: ['printer'] },
];

const ESTADOS: Record<string, string> = {
  assigned: 'Asignado',
  available: 'Disponible',
  maintenance: 'Mantenimiento',
  decommissioned: 'De baja',
};

const texto = (v: unknown) => String(v ?? '').trim();
const nombreDe = (p: any) => [texto(p?.firstName), texto(p?.lastName)].filter(Boolean).join(' ');

// "LAPT-406 · Dell Latitude 5420 · S/N ABC123" (+ el número si es celular).
function describirEquipo(d: any): string {
  const attrs = d?.attributesJson || {};
  const partes = [
    texto(d.assetCode) || 'sin código',
    [texto(d.brand), texto(d.model)].filter(Boolean).join(' '),
    texto(d.serialNumber) ? `S/N ${texto(d.serialNumber)}` : '',
    texto(attrs.chipNumber || attrs.phoneNumber) ? `Tel. ${texto(attrs.chipNumber || attrs.phoneNumber)}` : '',
  ];
  return partes.filter(Boolean).join(' · ');
}

export async function descargarReporteExcel(people: any[], devices: any[]) {
  const ExcelJS = (await import('exceljs')).default;
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Gestor-Tech';
  libro.created = new Date();

  const personaPorId = new Map<string, any>();
  for (const p of people) personaPorId.set(String(p.id), p);

  const equiposPorPersona = new Map<string, any[]>();
  for (const d of devices) {
    if (d?.assignedPersonId == null) continue;
    const k = String(d.assignedPersonId);
    if (!equiposPorPersona.has(k)) equiposPorPersona.set(k, []);
    equiposPorPersona.get(k)!.push(d);
  }

  const columnaDe = (tipo: string) => {
    const t = texto(tipo).toLowerCase();
    return COLUMNAS_EQUIPO.find((c) => c.tipos.includes(t))?.titulo ?? 'Otros';
  };

  // Solo las columnas de tipos que alguien tenga: veinte columnas vacías
  // hacen el reporte más difícil de leer, no más completo.
  const usadas = new Set<string>();
  for (const lista of equiposPorPersona.values()) for (const d of lista) usadas.add(columnaDe(d.assetType));
  const titulosEquipo = [...COLUMNAS_EQUIPO.map((c) => c.titulo), 'Otros'].filter((t) => usadas.has(t));

  const encabezadoBonito = (hoja: any) => {
    const fila = hoja.getRow(1);
    fila.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    fila.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    fila.alignment = { vertical: 'middle', wrapText: true };
    fila.height = 30;
    hoja.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
    hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: hoja.columnCount } };
  };

  // --- Hoja 1: una fila por persona -----------------------------------------
  const hojaPersonas = libro.addWorksheet('Personas');
  hojaPersonas.columns = [
    { header: 'Código de persona', key: 'codigo', width: 18 },
    { header: 'N°', key: 'numero', width: 7 },
    { header: 'Nombres', key: 'nombres', width: 22 },
    { header: 'Apellidos', key: 'apellidos', width: 24 },
    { header: 'Cédula', key: 'cedula', width: 13 },
    { header: 'Sucursal', key: 'sucursal', width: 18 },
    { header: 'Departamento', key: 'departamento', width: 20 },
    { header: 'Estado', key: 'estado', width: 11 },
    { header: 'Total equipos', key: 'total', width: 9 },
    ...titulosEquipo.map((t) => ({ header: t, key: `eq:${t}`, width: 38 })),
  ];

  const personasOrdenadas = [...people].sort((a, b) => {
    const na = Number(texto(a.codigo).replace(/\D+/g, '')) || 99999;
    const nb = Number(texto(b.codigo).replace(/\D+/g, '')) || 99999;
    return na - nb || nombreDe(a).localeCompare(nombreDe(b), 'es');
  });

  for (const p of personasOrdenadas) {
    const nombre = nombreDe(p);
    const { nombres, apellidos } = separarNombre(nombre);
    const suyos = (equiposPorPersona.get(String(p.id)) || [])
      .sort((a, b) => texto(a.assetCode).localeCompare(texto(b.assetCode)));
    const fila: Record<string, unknown> = {
      codigo: codigoPersona(nombre, p.codigo),
      numero: texto(p.codigo),
      nombres,
      apellidos,
      cedula: texto(p.nationalId),
      sucursal: texto(p.branch?.name),
      departamento: texto(p.department?.name),
      estado: ({ active: 'Activa', inactive: 'Inactiva', suspended: 'Suspendida' } as Record<string, string>)[texto(p.status)] ?? texto(p.status),
      total: suyos.length,
    };
    for (const t of titulosEquipo) {
      const deEsteTipo = suyos.filter((d) => columnaDe(d.assetType) === t);
      fila[`eq:${t}`] = deEsteTipo
        .map((d) => (t === 'Otros' ? `[${texto(d.assetType)}] ` : '') + describirEquipo(d))
        .join('\n');
    }
    const r = hojaPersonas.addRow(fila);
    r.alignment = { vertical: 'top', wrapText: true };
  }
  encabezadoBonito(hojaPersonas);
  hojaPersonas.getColumn('codigo').font = { bold: true, name: 'Consolas' };

  // --- Hoja 2: un equipo por fila ---------------------------------------------
  const hojaEquipos = libro.addWorksheet('Equipos');
  hojaEquipos.columns = [
    { header: 'Código equipo', key: 'code', width: 16 },
    { header: 'Tipo', key: 'tipo', width: 18 },
    { header: 'Marca', key: 'marca', width: 16 },
    { header: 'Modelo', key: 'modelo', width: 24 },
    { header: 'N° de serie', key: 'serie', width: 22 },
    { header: 'Estado', key: 'estado', width: 14 },
    { header: 'Sucursal', key: 'sucursal', width: 18 },
    { header: 'Código de persona', key: 'codigoPersona', width: 18 },
    { header: 'Persona', key: 'persona', width: 34 },
    { header: 'Cédula', key: 'cedula', width: 13 },
  ];
  const equiposOrdenados = [...devices].sort((a, b) => texto(a.assetCode).localeCompare(texto(b.assetCode)));
  for (const d of equiposOrdenados) {
    const p = d.assignedPersonId != null ? personaPorId.get(String(d.assignedPersonId)) : null;
    const nombre = p ? nombreDe(p) : nombreDe(d.assignedPerson);
    hojaEquipos.addRow({
      code: texto(d.assetCode),
      tipo: texto(d.assetType),
      marca: texto(d.brand),
      modelo: texto(d.model),
      serie: texto(d.serialNumber),
      estado: ESTADOS[texto(d.status)] ?? texto(d.status),
      sucursal: texto(d.branch?.name),
      codigoPersona: p ? codigoPersona(nombre, p.codigo) : '',
      persona: nombre,
      cedula: texto(p?.nationalId),
    });
  }
  encabezadoBonito(hojaEquipos);

  // --- Hoja 3: resumen ----------------------------------------------------------
  const hojaResumen = libro.addWorksheet('Resumen');
  hojaResumen.columns = [
    { header: 'Dato', key: 'dato', width: 34 },
    { header: 'Cantidad', key: 'cantidad', width: 12 },
  ];
  const contar = (estado: string) => devices.filter((d) => texto(d.status) === estado).length;
  [
    ['Fecha del reporte', new Date().toLocaleString('es-EC')],
    ['Personas', people.length],
    ['Personas con al menos un equipo', personasOrdenadas.filter((p) => equiposPorPersona.has(String(p.id))).length],
    ['Equipos en total', devices.length],
    ['Asignados', contar('assigned')],
    ['Disponibles', contar('available')],
    ['En mantenimiento', contar('maintenance')],
    ['De baja', contar('decommissioned')],
  ].forEach(([dato, cantidad]) => hojaResumen.addRow({ dato, cantidad }));
  encabezadoBonito(hojaResumen);

  const buffer = await libro.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte-general-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
