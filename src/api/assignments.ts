import { mockAssignments, type Assignment } from "@/data/mockDataExtended"

export interface CreateAssignmentDto {
  assetId: string
  personId: string
  branchId: string
  assignmentDate: string
  deliveryCondition: "excellent" | "good" | "fair" | "poor"
  deliveryNotes?: string
}

export interface UpdateAssignmentDto extends Partial<CreateAssignmentDto> {
  returnDate?: string
  returnCondition?: "excellent" | "good" | "fair" | "poor"
  returnNotes?: string
}

let assignmentsData = [...mockAssignments]

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function getLocalISOString(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")

  // Retorna en formato ISO pero con la hora local, no UTC
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

export const assignmentsApi = {
  getAll: async (): Promise<Assignment[]> => {
    await delay(300)
    return [...assignmentsData]
  },

  create: async (data: CreateAssignmentDto): Promise<Assignment> => {
    await delay(500)
    const newAssignment: Assignment = {
      id: `A${Date.now()}`,
      ...data,
      returnDate: undefined,
      returnCondition: undefined,
    }
    assignmentsData.push(newAssignment)
    return newAssignment
  },

  update: async (id: string, data: UpdateAssignmentDto): Promise<Assignment> => {
    await delay(500)
    const index = assignmentsData.findIndex((a) => a.id === id)
    if (index === -1) throw new Error("Asignación no encontrada")

    assignmentsData[index] = { ...assignmentsData[index], ...data }
    return assignmentsData[index]
  },

  registerReturn: async (
    id: string,
    returnCondition: "excellent" | "good" | "fair" | "poor",
    returnNotes?: string,
  ): Promise<Assignment> => {
    await delay(500)
    const index = assignmentsData.findIndex((a) => a.id === id)
    if (index === -1) throw new Error("Asignación no encontrada")

    assignmentsData[index] = {
      ...assignmentsData[index],
      returnDate: getLocalISOString(),
      returnCondition,
      returnNotes: returnNotes || assignmentsData[index].returnNotes,
    }
    return assignmentsData[index]
  },

  delete: async (id: string): Promise<void> => {
    await delay(500)
    assignmentsData = assignmentsData.filter((a) => a.id !== id)
  },
}
